# Fly.io Deployment Guide

## Prerequisites

1. Install flyctl CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Login to Fly.io:
```bash
fly auth login
```

## Initial Setup

1. Create the app (first time only):
```bash
fly launch --no-deploy
```

When prompted:
- Choose app name: `pencil2ink` (or your preferred name)
- Choose region: closest to you (e.g., `lax` for Los Angeles)
- Don't deploy yet (we need to set secrets first)

2. Set environment secrets:
```bash
fly secrets set TAMS_URL="https://ap-east-1.tensorart.cloud"
fly secrets set TAMS_APP_ID=""
fly secrets set PRIVATE_KEY_PEM="$(cat ../keys/private_key.pem)"
```

The `fly.toml` is configured to run 1 machine (`min_machines_running = 1`). It will stop when idle and restart on demand.

## Deploy

Deploy the application:
```bash
fly deploy
```

This will:
- Build the Docker image
- Push to Fly.io registry
- Deploy to your app
- Run health checks

## View Your App

```bash
fly open
```

Or visit: https://pencil2ink.fly.dev (or your chosen name)

## Useful Commands

View logs:
```bash
fly logs
```

Check app status:
```bash
fly status
```

SSH into machine:
```bash
fly ssh console
```

View secrets:
```bash
fly secrets list
```

Update a secret:
```bash
fly secrets set TAMS_APP_ID="new_value"
```

## Costs

- Fly.io free tier: $5/month credit
- shared-cpu-1x with 512MB RAM: ~$2-3/month
- auto_stop_machines means it will stop when idle (saves money)
- auto_start_machines means it will start on first request

## Troubleshooting

**Deployment fails:**
- Check `fly logs` for errors
- Verify secrets are set: `fly secrets list`
- Ensure Dockerfile builds locally: `docker build -t test .`

**App not responding:**
- Check if machines are running: `fly status`
- View logs: `fly logs`
- Restart: `fly apps restart pencil2ink`

**Environment variables not working:**
- Don't use `--env-file` with Docker for multiline vars
- Use Fly.io secrets instead: `fly secrets set KEY="value"`
