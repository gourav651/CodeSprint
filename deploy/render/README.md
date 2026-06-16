# Code Execution Setup Guide

## Recommended: OnlineCompiler.io (Easiest, No Self-Hosting)

**Free, no credit card required, takes ~2 minutes.**

This is the simplest solution - no Docker, no servers to manage.

### Why OnlineCompiler.io?

| Feature | Details |
|---|---|
| **Cost** | Free forever (1M requests/month) |
| **Credit Card** | NOT required |
| **Self-hosting** | NOT required |
| **Languages** | Python 3.14, C++ (G++ 15), Java (OpenJDK 25), JavaScript/TypeScript (Deno) |
| **Setup Time** | ~2 minutes |

### Step-by-Step Guide

#### Step 1: Get a Free API Key

1. Go to [onlinecompiler.io](https://onlinecompiler.io)
2. Click **Get Started Free** or **Sign Up** (use Google account)
3. Navigate to **API Keys** in the dashboard
4. Click **Create API Key**
5. Copy your API key

#### Step 2: Configure Environment Variables

**For Local Development (.env):**

```env
EXECUTION_BACKEND=onlinecompiler
ONLINECOMPILER_API_KEY=your_actual_api_key_here
```

**For Vercel Production:**

Go to your Vercel project: **Settings > Environment Variables**

| Variable | Value | Environment |
|---|---|---|
| `EXECUTION_BACKEND` | `onlinecompiler` | Production, Preview, Development |
| `ONLINECOMPILER_API_KEY` | `your_actual_api_key_here` | Production, Preview, Development |

#### Step 3: Redeploy (if on Vercel)

After updating environment variables, click **Redeploy** on your latest deployment.

#### Step 4: Verify Everything Works

Visit your health check endpoint:
```
https://your-app.vercel.app/api/execute/health
```

Expected response:
```json
{
  "status": "ok",
  "backend": "onlinecompiler",
  "url": "https://api.onlinecompiler.io",
  "runtimes": ["typescript-deno", "python-3.14", "openjdk-25", "g++-15"]
}
```

Then test code execution by running a problem on your app!

---

## How It Works

Your app sends code to OnlineCompiler.io's API:

```
POST https://api.onlinecompiler.io/api/run-code-sync/
Authorization: YOUR_API_KEY
Content-Type: application/json

{
  "compiler": "python-3.14",
  "code": "print('Hello World')",
  "input": ""
}
```

Response:
```json
{
  "output": "Hello World\n",
  "error": "",
  "status": "success",
  "exit_code": 0,
  "time": "0.0248",
  "memory": "8192"
}
```

---

## Alternative: Local Piston (Requires Docker)

If you prefer self-hosting for local development:

```bash
# Run Piston locally
docker run -d --name piston --restart unless-stopped \
  -p 2000:2000 \
  -e PISTON_DISABLE_NETWORKING=true \
  ghcr.io/engineer-man/piston:latest
```

Then update `.env`:
```env
EXECUTION_BACKEND=piston
PISTON_API_URL=http://127.0.0.1:2000
```

**Note:** Piston requires Docker and cannot run on Render.com due to filesystem restrictions.

---

## Comparison: OnlineCompiler.io vs Alternatives

| Feature | OnlineCompiler.io | Piston (Self-hosted) | Judge0 (RapidAPI) |
|---|---|---|---|
| **Cost** | Free (1M req/mo) | Free (unlimited) | Paid plans only |
| **Credit Card** | Not required | Not required | Required |
| **Self-hosting** | Not required | Required (Docker) | Not required |
| **Setup Time** | ~2 minutes | ~30 minutes | ~5 minutes |
| **Works on Vercel** | Yes | No (needs external server) | Yes |
| **Works on Render** | N/A (managed) | No (isolate fails) | Yes |
| **JavaScript** | Yes (Deno) | Yes | Yes |
| **Python** | Yes (3.14) | Yes (3.10) | Yes (3.x) |
| **Java** | Yes (OpenJDK 25) | Yes (15.0.2) | Yes |
| **C++** | Yes (G++ 15) | Yes (10.2.0) | Yes |

---

## Troubleshooting

| Issue | Solution |
|---|---|
| "ONLINECOMPILER_API_KEY is not set" | Add the API key to your environment variables |
| HTTP 401/403 errors | API key is invalid - regenerate in dashboard |
| HTTP 429 rate limit | You've hit 1M requests/month - wait or upgrade |
| "Unsupported language" | Check supported languages: python, javascript, java, cpp |
| Code not running | Verify code syntax matches the language (e.g., Python 3 syntax) |

---

## Migration from Piston

If you were previously using Piston:

1. **Update environment variables:**
   - Remove: `PISTON_API_URL`
   - Add: `ONLINECOMPILER_API_KEY`
   - Change: `EXECUTION_BACKEND=onlinecompiler`

2. **Update Vercel:**
   - Add `ONLINECOMPILER_API_KEY` to Vercel environment variables
   - Set `EXECUTION_BACKEND=onlinecompiler`
   - Remove `PISTON_API_URL`
   - Redeploy

3. **Test:** Visit `/api/execute/health` to verify

---

## Need Help?

- OnlineCompiler.io Docs: https://onlinecompiler.io/docs
- API Reference: https://onlinecompiler.io/docs#api-reference
- GitHub Issues: Check your CodeSprint repo
