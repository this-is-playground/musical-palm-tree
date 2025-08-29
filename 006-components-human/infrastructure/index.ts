import { KeyValueStoreComponent } from "../components/key-value-store/keyValueStoreComponent";
import { ComputeServiceComponent } from "../components/compute-service/computeServiceComponent";

// Create key-value store with all defaults
const kvStore = new KeyValueStoreComponent("qr-kv-store");

// Create compute service with minimal config
const compute = new ComputeServiceComponent("qr-compute", {
    codePath: "../service/lambda_package",
    environmentVariables: {
        REDIS_URL: kvStore.connectionUrl
    }
});

// Export outputs
export const serviceUrl = compute.functionUrl;
