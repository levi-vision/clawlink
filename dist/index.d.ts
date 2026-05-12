import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";
type PortableChannelEntry = {
    id: string;
    name: string;
    description: string;
    configSchema: unknown;
    register: (api: OpenClawPluginApi) => void;
    channelPlugin: unknown;
};
declare const entry: PortableChannelEntry;
export default entry;
