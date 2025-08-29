# Claude ECS Version - Container Orchestration (412 lines)

This version demonstrates **production-grade container orchestration** using AWS ECS Fargate with comprehensive monitoring and auto-scaling.

## Key Features

- **ECS Fargate** - Serverless container platform
- **Application Load Balancer** with health checks  
- **Auto-scaling** based on CPU utilization
- **ECR Repository** with lifecycle policies
- **CloudWatch** logging and monitoring
- **Custom VPC** with public/private subnets

## Architecture

```
Internet → ALB → ECS Fargate Tasks (Private Subnets)
                      ↓
              CloudWatch Logs + Metrics
                      ↓  
                Auto Scaling (CPU-based)
```

## Deployment

```bash
cd infrastructure
npm install
pulumi up
```

## Production Features

### Auto-scaling
- Scales 1-3 tasks (dev) or 2-10 tasks (prod)
- CPU threshold: 70%
- Cooldown: 300 seconds

### Monitoring
- CloudWatch dashboard with ECS and ALB metrics
- Container insights enabled
- Log retention: 7 days (dev) / 30 days (prod)

### Security
- Private subnets for containers
- Security groups restricting access
- ECR image scanning enabled

## Infrastructure Highlights

- **VPC**: Custom VPC with public/private subnets across 2 AZs
- **Load Balancer**: Application Load Balancer for HTTP traffic
- **Container Registry**: ECR with automatic image lifecycle management
- **Scaling**: Application Auto Scaling with target tracking
- **Observability**: Comprehensive monitoring and logging setup

## Trade-offs

**Pros:**
- Production-ready scaling and reliability
- Container-based deployment flexibility  
- Comprehensive monitoring out of the box
- Multi-AZ redundancy

**Cons:**
- 412 lines of infrastructure code
- Complex networking setup required
- Higher operational overhead
- Steep learning curve for AWS ECS concepts

This version shows what "production-ready" looks like before component abstraction.