# Self-Hosted Piston on Oracle Cloud Free Tier

> **Looking for an easier option?** See [deploy/render/README.md](../render/README.md) for **OnlineCompiler.io** - a free managed API (no credit card, no self-hosting, 1M requests/month).

This guide walks you through deploying Piston (code execution engine) on Oracle Cloud's Always Free tier, then connecting it to your CodeSprint app on Vercel.

## Architecture

```
[Vercel (Frontend + API Routes)]
        |
        | HTTPS
        v
[app/api/execute]  [app/api/submissions]
        |
        | HTTP (port 2000)
        v
[Oracle Cloud Free Tier - ARM Ampere A1]
   [Docker: ghcr.io/engineer-man/piston]
   - JavaScript 18.15.0
   - Python 3.10.0
   - Java 15.0.2
   - C++ 10.2.0
```

## Prerequisites

- Oracle Cloud account (Always Free tier): https://cloud.oracle.com/
- SSH key pair (for instance access)
- Your CodeSprint project deployed on Vercel

## Step 1: Create an Always Free ARM Instance

1. Log into [Oracle Cloud Console](https://cloud.oracle.com/)
2. Navigate to **Compute > Instances > Create Instance**
3. Configure:
   - **Name:** `piston-server`
   - **Image:** Ubuntu 22.04 (Always Free eligible)
   - **Shape:** VM.Standard.A1.Flex (ARM Ampere, Always Free)
     - OCPUs: 4
     - Memory: 24 GB
   - **SSH Key:** Upload or generate your key
4. Click **Create**

## Step 2: Open Port 2000 in Security List

1. Go to **Networking > Virtual Cloud Networks**
2. Click your VCN (usually `vcn-*`)
3. Click **Security Lists** on the left
4. Click **Default Security List** (or your active one)
5. Click **Add Ingress Rules**:
   - **Source CIDR:** `0.0.0.0/0`
   - **IP Protocol:** TCP
   - **Destination Port Range:** `2000`
   - **Description:** `Piston Code Execution API`
6. Click **Add Ingress Rules**

## Step 3: SSH and Run Setup Script

```bash
# SSH into your instance
ssh -i /path/to/your-key.key ubuntu@<your-public-ip>

# Download and run the setup script
# Option A: Copy setup.sh to the server first
scp -i /path/to/your-key.key setup.sh ubuntu@<your-public-ip>:~/
ssh -i /path/to/your-key.key ubuntu@<your-public-ip>
sudo chmod +x ~/setup.sh
sudo ~/setup.sh

# Option B: Run commands manually
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo systemctl enable docker && sudo systemctl start docker
sudo docker run -d --name piston --restart unless-stopped \
  -p 2000:2000 \
  -e PISTON_DISABLE_NETWORKING=true \
  -e PISTON_MAX_CONCURRENT_JOBS=4 \
  -e PISTON_COMPILATION_TIMEOUT=5000 \
  -e PISTON_RUN_TIMEOUT=5000 \
  ghcr.io/engineer-man/piston:latest
```

## Step 4: Verify Piston is Running

```bash
# Test locally on the server
curl http://localhost:2000/api/v2/runtimes

# Test from outside (from your local machine)
curl http://<your-public-ip>:2000/api/v2/runtimes
```

You should see a JSON array of available runtimes (JavaScript, Python, Java, C++, etc.).

## Step 5: Configure Vercel Environment Variables

Go to your Vercel project: **Settings > Environment Variables**

| Variable | Value | Environment |
|---|---|---|
| `EXECUTION_BACKEND` | `piston` | Production, Preview, Development |
| `PISTON_API_URL` | `http://<your-oracle-ip>:2000` | Production, Preview, Development |

Replace `<your-oracle-ip>` with the public IP of your Oracle Cloud instance.

**Delete** these old variables if present:
- `JUDGE0_API_KEY`
- `JUDGE0_API_URL`

## Step 6: Redeploy

After updating environment variables, redeploy your Vercel project.

Verify the connection by visiting:
```
https://your-app.vercel.app/api/execute/health
```

You should see:
```json
{
  "status": "ok",
  "backend": "piston",
  "url": "http://<your-oracle-ip>:2000",
  "runtimes": ["javascript 18.15.0", "python 3.10.0", "java 15.0.2", "c++ 10.2.0"]
}
```

## Local Development

For local development, run Piston with Docker on your machine:

```bash
docker run -d --name piston --restart unless-stopped \
  -p 2000:2000 \
  -e PISTON_DISABLE_NETWORKING=true \
  ghcr.io/engineer-man/piston:latest
```

Your `.env` already has `PISTON_API_URL=http://127.0.0.1:2000` for local dev.

## Maintenance

```bash
# Check logs
sudo docker logs piston

# Restart
sudo docker restart piston

# Update to latest version
sudo docker pull ghcr.io/engineer-man/piston:latest
sudo docker stop piston && sudo docker rm piston
sudo docker run -d --name piston --restart unless-stopped \
  -p 2000:2000 \
  -e PISTON_DISABLE_NETWORKING=true \
  -e PISTON_MAX_CONCURRENT_JOBS=4 \
  ghcr.io/engineer-man/piston:latest
```

## Troubleshooting

| Issue | Solution |
|---|---|
| Connection refused on port 2000 | Check Oracle Cloud Security List ingress rule |
| Timeout errors | Piston may be downloading runtimes on first use; wait 1-2 min |
| 502 Bad Gateway | Check `docker logs piston` for errors |
| Java not available | Run `curl http://<ip>:2000/api/v2/runtimes` to verify; install with `curl -X POST http://localhost:2000/api/v2/packages -H 'Content-Type: application/json' -d '{"language":"java","version":"15.0.2"}'` |

## Cost

Oracle Cloud Always Free tier includes:
- 4 ARM Ampere A1 OCPUs
- 24 GB RAM
- 200 GB block storage
- 10 TB outbound data transfer/month

This is more than sufficient for Piston and costs **$0/month** indefinitely.
