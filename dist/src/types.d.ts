export declare const PLUGIN_ID = "clawlink";
export declare const CHANNEL_ID = "clawlink";
export declare const PROTOCOL_ID = "clawlink.mesh";
export declare const PROTOCOL_VERSION = 1;
export declare const DEFAULT_RELAYS: readonly ["wss://relay.damus.io", "wss://nos.lol", "wss://relay.primal.net"];
export declare const ENVELOPE_TYPES: readonly ["message", "intent.request", "task.request", "task.result", "permission.ask", "permission.reply", "status.update"];
export type ClawlinkEnvelopeType = (typeof ENVELOPE_TYPES)[number];
export declare const TASK_STATES: readonly ["received", "needs_approval", "accepted", "running", "done", "rejected", "failed"];
export type TaskState = (typeof TASK_STATES)[number];
export type LocalTaskState = TaskState | "sent";
export type JsonObject = Record<string, unknown>;
export type ClawlinkEnvelope<TBody extends JsonObject = JsonObject> = {
    protocol: typeof PROTOCOL_ID;
    version: typeof PROTOCOL_VERSION;
    message_id: string;
    conversation_id: string;
    type: ClawlinkEnvelopeType;
    created_at: number;
    body: TBody;
};
export type MessageBody = {
    text: string;
    nodeName?: string;
};
export type IntentRequestBody = {
    intent: string;
    context?: unknown;
    requiresApproval?: boolean;
};
export type TaskRequestBody = {
    taskId: string;
    instruction: string;
    taskType?: string;
    context?: unknown;
    requiresApproval?: boolean;
};
export type TaskResultBody = {
    taskId: string;
    status: "done" | "failed";
    result?: unknown;
    error?: string;
};
export type PermissionAskBody = {
    reason: string;
    pairingToken?: string;
    nodeName?: string;
    relayHints?: string[];
    requestedCapabilities?: string[];
};
export type PermissionReplyBody = {
    accepted: boolean;
    reason?: string;
    grantedCapabilities?: string[];
};
export type StatusUpdateBody = {
    taskId: string;
    state: TaskState;
    note?: string;
};
export type PeerPolicy = {
    canMessage: boolean;
    canRequestTask: boolean;
    canSendFiles: boolean;
    autoAcceptTaskTypes: string[];
    requireApprovalForAllTasks: boolean;
};
export type TrustedPeer = {
    publicKey: string;
    npub: string;
    name?: string;
    relays?: string[];
    addedAt?: number;
};
export type ClawlinkPluginConfig = {
    nodeName: string;
    nostrPrivateKey?: string;
    relays: string[];
    trustedPeers: string[];
    peerPolicies: Record<string, Partial<PeerPolicy>>;
};
export type ClawlinkIdentity = {
    privateKey: Uint8Array;
    privateKeyHex: string;
    nsec: string;
    publicKey: string;
    npub: string;
};
export type ResolvedClawlinkConfig = ClawlinkPluginConfig & {
    identity?: ClawlinkIdentity;
};
export type ClawlinkTaskRecord = {
    taskId: string;
    conversationId: string;
    peerPublicKey: string;
    direction: "incoming" | "outgoing";
    state: LocalTaskState;
    instruction?: string;
    taskType?: string;
    result?: unknown;
    error?: string;
    updatedAt: number;
};
export type PublishResult = {
    eventId: string;
    acceptedRelays: string[];
    rejectedRelays: Array<{
        relay: string;
        error: string;
    }>;
};
export type IncomingClawlinkEvent = {
    relay?: string;
    outerEventId: string;
    senderPublicKey: string;
    envelope: ClawlinkEnvelope;
};
