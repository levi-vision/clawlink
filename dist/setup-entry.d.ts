declare const _default: {
    plugin: import("openclaw/plugin-sdk/channel-core").ChannelPlugin<import("./src/types.js").ClawlinkPluginConfig & {
        identity?: import("./src/types.js").ClawlinkIdentity;
    } & {
        accountId: string;
    }, unknown, unknown>;
};
export default _default;
