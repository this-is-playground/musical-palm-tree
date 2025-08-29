# Windsurf Infrastructure Version

This version shows the QR Generator service using **direct AWS infrastructure** setup without components.

## Key Features

- Direct AWS resource management (Lambda, ElastiCache, VPC, Security Groups)
- Full VPC configuration with security group rules
- Lambda in VPC with Redis access
- 141 lines of infrastructure code

## Files

- `index.ts` - Direct Pulumi infrastructure (141 lines)  
- `app.py` - Flask service with Redis stats
- `Pulumi.yaml` - Project configuration
- `package.json` - Dependencies

## Deployment

```bash
cd windsurf-infrastructure
npm install
pulumi up
```

This approach gives full control but requires managing all AWS resources manually.