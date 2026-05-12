import type { ClawlinkEnvelopeType, ClawlinkEnvelope, PeerPolicy, TaskState } from "./types.js";
export declare const DEFAULT_PEER_POLICY: PeerPolicy;
export type IncomingDecision = {
    action: "accept";
    reason: string;
    nextTaskState?: TaskState;
} | {
    action: "needs_approval";
    reason: string;
    nextTaskState?: TaskState;
} | {
    action: "reject";
    reason: string;
    nextTaskState?: TaskState;
};
export declare function normalizePeerPolicy(policy?: Partial<PeerPolicy>): PeerPolicy;
export declare function decideIncomingEnvelope(params: {
    envelope: ClawlinkEnvelope;
    trusted: boolean;
    policy?: Partial<PeerPolicy>;
}): IncomingDecision;
export declare function isValidTaskTransition(from: TaskState, to: TaskState): boolean;
export declare function requiresFileCapability(type: ClawlinkEnvelopeType): boolean;
