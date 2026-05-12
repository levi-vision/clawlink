import { createChatChannelPlugin, } from "openclaw/plugin-sdk/channel-core";
import { buildSetupConfig, extractClawlinkConfigFromOpenClawConfig } from "./config.js";
import { normalizePublicKey } from "./identity.js";
import { ClawlinkService } from "./service.js";
import { CHANNEL_ID } from "./types.js";
const channelConfigSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
        nodeName: { type: "string" },
        nostrPrivateKey: { type: "string" },
        relays: { type: "array", items: { type: "string" } },
        trustedPeers: { type: "array", items: { type: "string" } },
        peerPolicies: { type: "object", additionalProperties: true },
    },
};
export const clawlinkChannelPlugin = createChatChannelPlugin({
    base: {
        id: CHANNEL_ID,
        meta: {
            id: CHANNEL_ID,
            label: "Clawlink",
            selectionLabel: "Clawlink",
            docsPath: "/plugins/clawlink",
            blurb: "Secure OpenClaw-to-OpenClaw communication over Nostr.",
            markdownCapable: true,
            showInSetup: true,
            showConfigured: true,
        },
        capabilities: {
            chatTypes: ["direct", "thread"],
            reply: true,
            threads: true,
            media: false,
            polls: false,
            reactions: false,
        },
        configSchema: channelConfigSchema,
        config: {
            listAccountIds: () => ["default"],
            resolveAccount: (cfg, accountId) => ({
                ...extractClawlinkConfigFromOpenClawConfig(cfg),
                accountId: accountId ?? "default",
            }),
            inspectAccount: (cfg, accountId) => {
                const account = extractClawlinkConfigFromOpenClawConfig(cfg);
                return {
                    accountId: accountId ?? "default",
                    configured: Boolean(account.identity),
                    nodeName: account.nodeName,
                    npub: account.identity?.npub,
                    publicKey: account.identity?.publicKey,
                    relays: account.relays,
                    trustedPeerCount: account.trustedPeers.length,
                };
            },
            isConfigured: (account) => Boolean(account.identity),
            describeAccount: (account) => ({
                accountId: account.accountId,
                name: account.nodeName,
                configured: Boolean(account.identity),
                enabled: Boolean(account.identity),
                linked: Boolean(account.identity),
                publicKey: account.identity?.publicKey ?? null,
                allowFrom: account.trustedPeers,
                dmPolicy: "allowlist",
            }),
            resolveAllowFrom: ({ cfg }) => {
                return extractClawlinkConfigFromOpenClawConfig(cfg).trustedPeers;
            },
        },
        setup: {
            applyAccountConfig: ({ cfg, input }) => {
                const relayUrls = typeof input.relayUrls === "string"
                    ? input.relayUrls
                        .split(/[,\s]+/)
                        .map((relay) => relay.trim())
                        .filter(Boolean)
                    : undefined;
                return buildSetupConfig({
                    existing: cfg,
                    nodeName: input.name,
                    privateKey: input.privateKey,
                    relayUrls,
                });
            },
        },
    },
    security: {
        dm: {
            channelKey: CHANNEL_ID,
            defaultPolicy: "allowlist",
            resolvePolicy: () => "allowlist",
            resolveAllowFrom: (account) => account.trustedPeers,
            normalizeEntry: (raw) => normalizePublicKey(raw),
        },
    },
    pairing: {
        text: {
            idLabel: "Nostr npub",
            message: "Send this Clawlink pairing code to verify your node:",
            normalizeAllowEntry: (raw) => normalizePublicKey(raw),
            notify: async ({ cfg, id, message }) => {
                const service = new ClawlinkService({
                    config: extractClawlinkConfigFromOpenClawConfig(cfg),
                });
                await service.sendMessage({
                    peer: id,
                    text: message,
                });
            },
        },
    },
    threading: {
        topLevelReplyToMode: "reply",
    },
    outbound: {
        deliveryMode: "direct",
        resolveTarget: ({ to }) => {
            try {
                return { ok: true, to: normalizePublicKey(to ?? "") };
            }
            catch (err) {
                return {
                    ok: false,
                    error: err instanceof Error ? err : new Error(String(err)),
                };
            }
        },
        sendText: async (ctx) => {
            const service = new ClawlinkService({
                config: extractClawlinkConfigFromOpenClawConfig(ctx.cfg),
            });
            const result = await service.sendMessage({
                peer: ctx.to,
                text: ctx.text,
                conversationId: typeof ctx.threadId === "string" ? ctx.threadId : undefined,
            });
            return {
                channel: CHANNEL_ID,
                messageId: result.eventId,
            };
        },
    },
});
//# sourceMappingURL=channel.js.map