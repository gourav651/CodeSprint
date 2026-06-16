#!/bin/bash
# =============================================================================
# Piston Self-Hosted Setup Script for Oracle Cloud Free Tier
# =============================================================================
# Run this script on your Oracle Cloud ARM Ampere A1 instance (Ubuntu 22.04).
#
# Usage:
#   chmod +x setup.sh
#   sudo ./setup.sh
#
# After completion, verify with:
#   curl http://<your-public-ip>:2000/api/v2/runtimes
# =============================================================================

set -e

echo "========================================"
echo " Piston Self-Hosted Setup"
echo "========================================"

# ---------------------------------------------------------------------------
# Step 1: Install Docker if not present
# ---------------------------------------------------------------------------
if ! command -v docker &> /dev/null; then
    echo "[1/5] Installing Docker..."
    apt-get update
    apt-get install -y ca-certificates curl gnupg lsb-release

    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    systemctl enable docker
    systemctl start docker
    echo "[1/5] Docker installed successfully."
else
    echo "[1/5] Docker is already installed. Skipping..."
fi

# ---------------------------------------------------------------------------
# Step 2: Create working directory
# ---------------------------------------------------------------------------
WORK_DIR="/opt/piston"
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

if [ ! -f docker-compose.yml ]; then
    echo "[2/5] Creating docker-compose.yml..."
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  piston:
    image: ghcr.io/engineer-man/piston:latest
    container_name: piston
    restart: unless-stopped
    ports:
      - "2000:2000"
    environment:
      - PISTON_DISABLE_NETWORKING=true
      - PISTON_MAX_CONCURRENT_JOBS=4
      - PISTON_COMPILATION_TIMEOUT=5000
      - PISTON_RUN_TIMEOUT=5000
      - PISTON_OUTPUT_MAX_SIZE=1024000
    tmpfs:
      - /tmp:piston:size=256m
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '2'
EOF
    echo "[2/5] docker-compose.yml created."
else
    echo "[2/5] docker-compose.yml already exists. Skipping..."
fi

# ---------------------------------------------------------------------------
# Step 3: Pull and start Piston
# ---------------------------------------------------------------------------
echo "[3/5] Pulling Piston Docker image..."
docker compose pull

echo "[3/5] Starting Piston container..."
docker compose up -d

echo "[3/5] Waiting for Piston to initialize (15s)..."
sleep 15

# ---------------------------------------------------------------------------
# Step 4: Configure firewall (iptables) for port 2000
# ---------------------------------------------------------------------------
echo "[4/5] Configuring firewall..."

# Allow inbound TCP on port 2000
if ! iptables -C INPUT -p tcp --dport 2000 -j ACCEPT 2>/dev/null; then
    iptables -I INPUT -p tcp --dport 2000 -j ACCEPT
    echo "[4/5] Added iptables rule for port 2000."
else
    echo "[4/5] iptables rule for port 2000 already exists."
fi

# Persist iptables rules
if command -v iptables-save &> /dev/null; then
    iptables-save > /etc/iptables/rules.v4 2>/dev/null || true
fi

echo "[4/5] Firewall configured."

# ---------------------------------------------------------------------------
# Step 5: Verify Piston is running
# ---------------------------------------------------------------------------
echo "[5/5] Verifying Piston..."

PUBLIC_IP=$(curl -s http://169.254.169.254/opc/v2/instance/metadata/public_ipv4 2>/dev/null || \
            curl -s ifconfig.me 2>/dev/null || \
            echo "<your-public-ip>")

if curl -s -o /dev/null -w "%{http_code}" http://localhost:2000/api/v2/runtimes | grep -q "200"; then
    echo ""
    echo "========================================"
    echo " Piston is running successfully!"
    echo "========================================"
    echo ""
    echo " Local URL:   http://localhost:2000/api/v2/runtimes"
    echo " Public URL:  http://${PUBLIC_IP}:2000/api/v2/runtimes"
    echo ""
    echo " IMPORTANT: Also open port 2000 in your Oracle Cloud"
    echo " Subnet Security List (Ingress Rule):"
    echo "   - Source: 0.0.0.0/0"
    echo "   - Protocol: TCP"
    echo "   - Destination Port: 2000"
    echo ""
    echo " Then set this in your Vercel environment variables:"
    echo "   PISTON_API_URL=http://${PUBLIC_IP}:2000"
    echo ""
else
    echo ""
    echo "WARNING: Piston may not be running yet. Check with:"
    echo "  docker logs piston"
    echo "  curl http://localhost:2000/api/v2/runtimes"
    echo ""
fi

echo "Done!"
