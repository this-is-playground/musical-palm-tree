# Windsurf Lambda Version - Serverless Approach (141 lines)

This version demonstrates the **starting point** of cloud infrastructure - a direct serverless approach using AWS Lambda with ElastiCache Redis.

## Key Features

- **AWS Lambda** with Function URL (no API Gateway needed)
- **ElastiCache Serverless Redis** for stats storage
- **VPC Configuration** with security groups
- **Direct AWS Resource Management** - everything explicit

## Architecture

```
Internet → Lambda Function URL → Lambda (in VPC) → Redis
                                    ↓
                              CloudWatch Logs
```

## Infrastructure Highlights

- **Lambda Function**: Python 3.9 runtime with 512MB memory
- **Redis Cache**: ElastiCache Serverless with daily snapshots
- **VPC Setup**: Default VPC with security group rules
- **Networking**: Lambda can access Redis via security group rules

## Deployment

```bash
cd infrastructure
npm install
pulumi up
```

## What This Shows

This version represents the **natural starting point** for cloud deployment:
- Simple serverless architecture
- Direct resource management
- Everything explicitly defined
- Good for learning AWS concepts

## Trade-offs

**Pros:**
- Serverless scaling (pay per request)
- No container management
- Lower operational overhead than ECS
- Good starting point for learning

**Cons:**
- 141 lines of boilerplate infrastructure
- Manual VPC/security group management
- Limited to Lambda constraints (15min timeout, etc.)
- Requires AWS networking knowledge

## The Journey Begins Here

This version shows how infrastructure starts simple but grows complex as production requirements emerge. The same Flask app that requires 141 lines here will eventually require 400+ lines for enterprise features - until components bring it back to simplicity.