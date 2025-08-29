import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export class KeyValueStoreComponent extends pulumi.ComponentResource {
    public readonly connectionUrl: pulumi.Output<string>;
    public readonly endpoint: pulumi.Output<string>;

    constructor(name: string, args?: KeyValueStoreComponentArgs, opts?: pulumi.ComponentResourceOptions) {
        super("qr-service:storage:KeyValueStore", name, args, opts);

        // Get default VPC for simplicity (or create VPC if needed)
        const defaultVpc = aws.ec2.getVpc({ default: true });
        const defaultSubnets = defaultVpc.then(vpc => aws.ec2.getSubnets({ 
            filters: [{ name: "vpc-id", values: [vpc.id] }] 
        }));

        // Security group for the key-value store
        const kvSg = new aws.ec2.SecurityGroup(`${name}-sg`, {
            vpcId: defaultVpc.then(vpc => vpc.id),
            description: "Security group for key-value store",
            ingress: [{
                protocol: "tcp",
                fromPort: 6379,
                toPort: 6379,
                cidrBlocks: ["0.0.0.0/0"], // Simplified for demo - in prod use specific sources
            }],
            egress: [{
                protocol: "-1",
                fromPort: 0,
                toPort: 0,
                cidrBlocks: ["0.0.0.0/0"],
            }],
            tags: {
                "storage:component": "true",
                "storage:type": "key-value",
                "storage:engine": "redis"
            }
        }, { parent: this });

        // ElastiCache Serverless Redis cache
        const redisCache = new aws.elasticache.ServerlessCache(`${name}-cache`, {
            engine: "redis",
            name: `${name}-cache`.replace(/[^a-zA-Z0-9-]/g, '-'), // Ensure valid cache name
            subnetIds: defaultSubnets.then(subnets => subnets.ids),
            securityGroupIds: [kvSg.id],
            description: args?.description || "Serverless key-value store for application state",
            dailySnapshotTime: args?.snapshotTime || "03:00",
            tags: {
                "storage:component": "true",
                "storage:type": "key-value",
                "storage:engine": "redis",
                "storage:serverless": "true"
            },
        }, { parent: this });

        // Construct connection URLs
        this.endpoint = redisCache.endpoints.apply(eps => eps[0].address);
        this.connectionUrl = pulumi.interpolate`rediss://${this.endpoint}:6379`;

        this.registerOutputs({
            connectionUrl: this.connectionUrl,
            endpoint: this.endpoint
        });
    }
}

export interface KeyValueStoreComponentArgs {
    /**
     * Description for the key-value store (optional)
     */
    description?: pulumi.Input<string>;
    /**
     * Daily snapshot time in HH:MM format (optional, defaults to "03:00")
     */
    snapshotTime?: pulumi.Input<string>;
}