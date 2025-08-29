import * as pulumi from "@pulumi/pulumi";
export declare class KeyValueStoreComponent extends pulumi.ComponentResource {
    readonly connectionUrl: pulumi.Output<string>;
    readonly endpoint: pulumi.Output<string>;
    constructor(name: string, args?: KeyValueStoreComponentArgs, opts?: pulumi.ComponentResourceOptions);
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
