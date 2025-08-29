# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flask web application for generating QR codes with customizable styling and variants. This version represents **enterprise-grade ECS deployment** with comprehensive monitoring, security, and production hardening.

## Development Commands

### Local Development

```bash
# Source utility functions from util/functions
source util/functions
start_local
```

### Docker Development

```bash
source util/functions
docker_up  # Build and run
stop_docker
```

### Infrastructure Deployment

```bash
cd infrastructure
npm install
pulumi config set appName "qr-generator"
pulumi config set environment "dev"
pulumi up
```

## Architecture & Preferences

- **Language**: Prefer Python for all development tasks where possible
- **Structure**: Single Flask app (`service/app.py`) with embedded frontend
- **Infrastructure**: Enterprise ECS with comprehensive monitoring, security, and observability
- **Deployment**: Production-hardened containers with multi-AZ redundancy
- **Utilities**: Bash functions in `util/functions` for common development tasks
- **Port**: Application runs on port 8080

## Key Files

- `service/app.py` - Main Flask application
- `service/requirements.txt` - Python dependencies
- `service/Dockerfile` - Container definition with health checks
- `infrastructure/index.ts` - Enterprise ECS infrastructure (400 lines)
- `util/functions` - Bash utility functions for development

## Enterprise Features

- **High Availability**: Multi-AZ deployment with redundancy
- **Security**: Private subnets, least-privilege IAM, ECR scanning
- **Monitoring**: Custom CloudWatch dashboards with detailed metrics
- **Auto-scaling**: CPU-based scaling with configurable thresholds
- **Cost Optimization**: Environment-based resource sizing
- **Observability**: Container insights, structured logging, health checks