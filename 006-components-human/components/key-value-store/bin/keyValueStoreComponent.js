"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyValueStoreComponent = void 0;
const pulumi = __importStar(require("@pulumi/pulumi"));
const aws = __importStar(require("@pulumi/aws"));
class KeyValueStoreComponent extends pulumi.ComponentResource {
    constructor(name, args, opts) {
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
            description: (args === null || args === void 0 ? void 0 : args.description) || "Serverless key-value store for application state",
            dailySnapshotTime: (args === null || args === void 0 ? void 0 : args.snapshotTime) || "03:00",
            tags: {
                "storage:component": "true",
                "storage:type": "key-value",
                "storage:engine": "redis",
                "storage:serverless": "true"
            },
        }, { parent: this });
        // Construct connection URLs
        this.endpoint = redisCache.endpoints.apply(eps => eps[0].address);
        this.connectionUrl = pulumi.interpolate `rediss://${this.endpoint}:6379`;
        this.registerOutputs({
            connectionUrl: this.connectionUrl,
            endpoint: this.endpoint
        });
    }
}
exports.KeyValueStoreComponent = KeyValueStoreComponent;
