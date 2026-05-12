import { type ChannelPlugin } from "openclaw/plugin-sdk/channel-core";
import { extractClawlinkConfigFromOpenClawConfig } from "./config.js";
type ClawlinkAccount = ReturnType<typeof extractClawlinkConfigFromOpenClawConfig> & {
    accountId: string;
};
export declare const clawlinkChannelPlugin: ChannelPlugin<ClawlinkAccount, unknown, unknown>;
export {};
