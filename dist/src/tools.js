import { extractClawlinkConfigFromOpenClawConfig } from "./config.js";
import { ClawlinkService } from "./service.js";
import { InMemoryTaskStore } from "./task-store.js";
const EMPTY_SCHEMA = {
    type: "object",
    additionalProperties: false,
    properties: {},
};
const PEER_SCHEMA = {
    type: "string",
    description: "Nostr npub or 32-byte public key hex of the target OpenClaw node.",
};
export function registerClawlinkTools(api, taskStore = new InMemoryTaskStore()) {
    const service = () => new ClawlinkService({
        config: extractClawlinkConfigFromOpenClawConfig(api.config),
        taskStore,
        onAudit: (event) => api.logger.debug?.(JSON.stringify(event)),
    });
    api.registerTool({
        name: "clawlink_list_peers",
        label: "List Clawlink peers",
        description: "List trusted Clawlink peers and local node identity.",
        parameters: EMPTY_SCHEMA,
        async execute() {
            const config = extractClawlinkConfigFromOpenClawConfig(api.config);
            return textResult(JSON.stringify({
                local: config.identity
                    ? {
                        publicKey: config.identity.publicKey,
                        npub: config.identity.npub,
                        nodeName: config.nodeName,
                        relays: config.relays,
                    }
                    : {
                        configured: false,
                        message: "nostrPrivateKey is not configured.",
                    },
                peers: service().listPeers(),
            }, null, 2));
        },
    }, { optional: true });
    api.registerTool({
        name: "clawlink_send_message",
        label: "Send Clawlink message",
        description: "Send an encrypted Clawlink message to a peer.",
        parameters: {
            type: "object",
            additionalProperties: false,
            required: ["peer", "text"],
            properties: {
                peer: PEER_SCHEMA,
                text: { type: "string" },
                conversation_id: { type: "string" },
                relays: { type: "array", items: { type: "string" } },
            },
        },
        async execute(_id, params) {
            const record = params;
            const publish = await service().sendMessage({
                peer: readString(record, "peer"),
                text: readString(record, "text"),
                conversationId: optionalString(record, "conversation_id"),
                relays: optionalStringArray(record, "relays"),
            });
            return textResult(JSON.stringify(publish, null, 2));
        },
    }, { optional: true });
    api.registerTool({
        name: "clawlink_request_task",
        label: "Request Clawlink task",
        description: "Request a trusted peer OpenClaw to run a task within its local policy.",
        parameters: {
            type: "object",
            additionalProperties: false,
            required: ["peer", "instruction"],
            properties: {
                peer: PEER_SCHEMA,
                instruction: { type: "string" },
                task_type: { type: "string" },
                context: {},
                conversation_id: { type: "string" },
                relays: { type: "array", items: { type: "string" } },
            },
        },
        async execute(_id, params) {
            const record = params;
            const result = await service().requestTask({
                peer: readString(record, "peer"),
                instruction: readString(record, "instruction"),
                taskType: optionalString(record, "task_type"),
                context: record.context,
                conversationId: optionalString(record, "conversation_id"),
                relays: optionalStringArray(record, "relays"),
            });
            return textResult(JSON.stringify(result, null, 2));
        },
    }, { optional: true });
    api.registerTool({
        name: "clawlink_reply_task",
        label: "Reply to Clawlink task",
        description: "Reply to a Clawlink task request with a result.",
        parameters: {
            type: "object",
            additionalProperties: false,
            required: ["peer", "task_id", "status"],
            properties: {
                peer: PEER_SCHEMA,
                task_id: { type: "string" },
                status: { type: "string", enum: ["done", "failed"] },
                result: {},
                error: { type: "string" },
                conversation_id: { type: "string" },
                relays: { type: "array", items: { type: "string" } },
            },
        },
        async execute(_id, params) {
            const record = params;
            const status = readString(record, "status");
            if (status !== "done" && status !== "failed") {
                throw new Error("status must be done or failed.");
            }
            const publish = await service().replyTask({
                peer: readString(record, "peer"),
                taskId: readString(record, "task_id"),
                status,
                result: record.result,
                error: optionalString(record, "error"),
                conversationId: optionalString(record, "conversation_id"),
                relays: optionalStringArray(record, "relays"),
            });
            return textResult(JSON.stringify(publish, null, 2));
        },
    }, { optional: true });
    api.registerTool({
        name: "clawlink_get_task_status",
        label: "Get Clawlink task status",
        description: "Read local Clawlink task status records.",
        parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
                task_id: { type: "string" },
            },
        },
        async execute(_id, params) {
            const record = params;
            const taskId = optionalString(record, "task_id");
            const payload = taskId ? taskStore.get(taskId) ?? null : taskStore.list();
            return textResult(JSON.stringify(payload, null, 2));
        },
    }, { optional: true });
}
function textResult(text) {
    return { content: [{ type: "text", text }], details: { text } };
}
function readString(record, key) {
    const value = record[key];
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${key} is required.`);
    }
    return value.trim();
}
function optionalString(record, key) {
    const value = record[key];
    return typeof value === "string" && value.trim().length > 0
        ? value.trim()
        : undefined;
}
function optionalStringArray(record, key) {
    const value = record[key];
    if (!Array.isArray(value)) {
        return undefined;
    }
    return value.filter((item) => {
        return typeof item === "string" && item.trim().length > 0;
    });
}
//# sourceMappingURL=tools.js.map