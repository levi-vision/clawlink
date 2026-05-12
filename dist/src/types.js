export const PLUGIN_ID = "clawlink";
export const CHANNEL_ID = "clawlink";
export const PROTOCOL_ID = "clawlink.mesh";
export const PROTOCOL_VERSION = 1;
export const DEFAULT_RELAYS = [
    "wss://relay.damus.io",
    "wss://nos.lol",
    "wss://relay.primal.net",
];
export const ENVELOPE_TYPES = [
    "message",
    "intent.request",
    "task.request",
    "task.result",
    "permission.ask",
    "permission.reply",
    "status.update",
];
export const TASK_STATES = [
    "received",
    "needs_approval",
    "accepted",
    "running",
    "done",
    "rejected",
    "failed",
];
//# sourceMappingURL=types.js.map