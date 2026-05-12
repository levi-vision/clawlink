import type { OpenClawConfig } from "openclaw/plugin-sdk/core";
import { type ResolvedClawlinkConfig } from "./types.js";
export declare function normalizeRelayUrls(relays: unknown): string[];
export declare function normalizeClawlinkConfig(raw: unknown): ResolvedClawlinkConfig;
export declare function extractClawlinkConfigFromOpenClawConfig(cfg: OpenClawConfig | Record<string, unknown> | undefined): ResolvedClawlinkConfig;
export declare function buildSetupConfig(params: {
    existing?: OpenClawConfig;
    nodeName?: string;
    privateKey?: string;
    relayUrls?: string[];
}): OpenClawConfig;
