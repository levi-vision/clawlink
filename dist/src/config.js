import { CHANNEL_ID, DEFAULT_RELAYS, PLUGIN_ID, } from "./types.js";
import { createIdentity, normalizePublicKey } from "./identity.js";
import { normalizePeerPolicy } from "./policy.js";
export function normalizeRelayUrls(relays) {
    const raw = Array.isArray(relays) ? relays : DEFAULT_RELAYS;
    return [
        ...new Set(raw
            .filter((relay) => typeof relay === "string")
            .map((relay) => relay.trim())
            .filter((relay) => relay.startsWith("wss://") || relay.startsWith("ws://"))),
    ];
}
export function normalizeClawlinkConfig(raw) {
    const record = isRecord(raw) ? raw : {};
    const privateKey = typeof record.nostrPrivateKey === "string"
        ? record.nostrPrivateKey.trim()
        : undefined;
    const trustedPeers = normalizeTrustedPeers(record.trustedPeers);
    const peerPolicies = normalizePeerPolicies(record.peerPolicies);
    return {
        nodeName: typeof record.nodeName === "string" && record.nodeName.trim().length > 0
            ? record.nodeName.trim()
            : "Clawlink Node",
        nostrPrivateKey: privateKey,
        identity: privateKey ? createIdentity(privateKey) : undefined,
        relays: normalizeRelayUrls(record.relays),
        trustedPeers,
        peerPolicies,
    };
}
export function extractClawlinkConfigFromOpenClawConfig(cfg) {
    const source = cfg;
    const pluginConfig = getPathRecord(source, [
        "plugins",
        "entries",
        PLUGIN_ID,
        "config",
    ]);
    const channelConfig = getPathRecord(source, ["channels", CHANNEL_ID]);
    return normalizeClawlinkConfig({
        ...pluginConfig,
        ...channelConfig,
    });
}
export function buildSetupConfig(params) {
    const cfg = structuredClone((params.existing ?? {}));
    const channels = ensureRecord(cfg, "channels");
    const privateKey = params.privateKey ?? createIdentity().nsec;
    channels[CHANNEL_ID] = {
        ...(isRecord(channels[CHANNEL_ID]) ? channels[CHANNEL_ID] : {}),
        nodeName: params.nodeName ?? "Clawlink Node",
        nostrPrivateKey: privateKey,
        relays: params.relayUrls?.length ? params.relayUrls : [...DEFAULT_RELAYS],
        trustedPeers: isRecord(channels[CHANNEL_ID])
            ? channels[CHANNEL_ID].trustedPeers
            : [],
        peerPolicies: isRecord(channels[CHANNEL_ID])
            ? channels[CHANNEL_ID].peerPolicies
            : {},
    };
    return cfg;
}
function normalizeTrustedPeers(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    const peers = [];
    for (const peer of value) {
        if (typeof peer !== "string") {
            continue;
        }
        try {
            peers.push(normalizePublicKey(peer));
        }
        catch {
            // Ignore invalid configured peers instead of failing the whole channel.
        }
    }
    return [...new Set(peers)];
}
function normalizePeerPolicies(value) {
    if (!isRecord(value)) {
        return {};
    }
    const normalized = {};
    for (const [rawKey, rawPolicy] of Object.entries(value)) {
        try {
            const key = normalizePublicKey(rawKey);
            normalized[key] = normalizePeerPolicy(isRecord(rawPolicy) ? rawPolicy : undefined);
        }
        catch {
            // Ignore invalid policy keys.
        }
    }
    return normalized;
}
function getPathRecord(source, path) {
    let current = source;
    for (const key of path) {
        if (!isRecord(current)) {
            return {};
        }
        current = current[key];
    }
    return isRecord(current) ? current : {};
}
function ensureRecord(target, key) {
    if (!isRecord(target[key])) {
        target[key] = {};
    }
    return target[key];
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=config.js.map