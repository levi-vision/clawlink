import { decideIncomingEnvelope } from "./policy.js";
import { InMemoryTaskStore } from "./task-store.js";
import { NostrClawlinkTransport, type ClawlinkSendTarget } from "./transport.js";
import type { IncomingClawlinkEvent, ClawlinkPluginConfig, PublishResult, ResolvedClawlinkConfig } from "./types.js";
export type ClawlinkServiceOptions = {
    config: ResolvedClawlinkConfig;
    transport?: NostrClawlinkTransport;
    taskStore?: InMemoryTaskStore;
    onAudit?: (event: Record<string, unknown>) => void;
};
export declare const GIFT_WRAP_LOOKBACK_SECONDS: number;
export declare class ClawlinkService {
    readonly config: ResolvedClawlinkConfig;
    readonly taskStore: InMemoryTaskStore;
    private readonly transport?;
    private readonly onAudit?;
    private subscription?;
    constructor(options: ClawlinkServiceOptions);
    listPeers(): Array<{
        publicKey: string;
        npub: string;
        policy: unknown;
    }>;
    sendMessage(params: {
        peer: string;
        text: string;
        relays?: string[];
        conversationId?: string;
    }): Promise<PublishResult>;
    requestTask(params: {
        peer: string;
        instruction: string;
        relays?: string[];
        conversationId?: string;
        taskType?: string;
        context?: unknown;
        requiresApproval?: boolean;
    }): Promise<{
        taskId: string;
        publish: PublishResult;
    }>;
    replyTask(params: {
        peer: string;
        taskId: string;
        status: "done" | "failed";
        result?: unknown;
        error?: string;
        relays?: string[];
        conversationId?: string;
    }): Promise<PublishResult>;
    startInbox(params?: {
        onIncoming?: (event: IncomingClawlinkEvent, decision: ReturnType<typeof decideIncomingEnvelope>) => void | Promise<void>;
        onError?: (error: Error) => void;
    }): void;
    stop(): void;
    handleIncoming(event: IncomingClawlinkEvent): ReturnType<typeof decideIncomingEnvelope>;
    private sendEnvelopeToPeer;
    private requireTransport;
    private audit;
}
export declare function buildPeerTargetFromConfig(config: ClawlinkPluginConfig, peer: string): ClawlinkSendTarget;
