import { type Event, type Filter, type NostrEvent } from "nostr-tools";
import type { IncomingClawlinkEvent, ClawlinkEnvelope, PublishResult } from "./types.js";
type PoolLike = {
    publish: (relays: string[], event: Event, params?: {
        maxWait?: number;
        abort?: AbortSignal;
    }) => Promise<string>[];
    subscribeMany: (relays: string[], filter: Filter, params: {
        id?: string;
        label?: string;
        maxWait?: number;
        onevent: (event: Event) => void;
        onclose?: (reasons: string[]) => void;
    }) => {
        close: (reason?: string) => void;
    };
    destroy?: () => void;
};
export type ClawlinkTransportOptions = {
    privateKey: string | Uint8Array;
    relays: string[];
    pool?: PoolLike;
    maxWaitMs?: number;
};
export type ClawlinkSendTarget = {
    publicKey: string;
    relays?: string[];
};
export declare class NostrClawlinkTransport {
    readonly privateKey: Uint8Array;
    readonly publicKey: string;
    readonly relays: string[];
    private readonly pool;
    private readonly maxWaitMs;
    private readonly seenEventIds;
    constructor(options: ClawlinkTransportOptions);
    sendEnvelope(target: ClawlinkSendTarget, envelope: ClawlinkEnvelope): Promise<PublishResult>;
    unwrapEvent(event: NostrEvent, relay?: string): IncomingClawlinkEvent;
    subscribeInbox(params: {
        since?: number;
        onEnvelope: (event: IncomingClawlinkEvent) => void | Promise<void>;
        onError?: (error: Error, event?: Event) => void;
        onClose?: (reasons: string[]) => void;
    }): {
        close: (reason?: string) => void;
    };
    close(): void;
}
export declare function wrapEnvelopeForPeer(params: {
    senderPrivateKey: Uint8Array;
    recipientPublicKey: string;
    relayUrl?: string;
    envelope: ClawlinkEnvelope;
}): NostrEvent;
export {};
