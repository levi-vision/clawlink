import {
  SimplePool,
  getPublicKey,
  nip17,
  verifyEvent,
  type Event,
  type Filter,
  type NostrEvent,
} from "nostr-tools";

import { parseEnvelope, stringifyEnvelope } from "./envelope.js";
import { decodePrivateKey, normalizePublicKey } from "./identity.js";
import type {
  IncomingClawlinkEvent,
  ClawlinkEnvelope,
  PublishResult,
} from "./types.js";

type PoolLike = {
  publish: (
    relays: string[],
    event: Event,
    params?: { maxWait?: number; abort?: AbortSignal },
  ) => Promise<string>[];
  subscribeMany: (
    relays: string[],
    filter: Filter,
    params: {
      id?: string;
      label?: string;
      maxWait?: number;
      onevent: (event: Event) => void;
      onclose?: (reasons: string[]) => void;
    },
  ) => { close: (reason?: string) => void };
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

export class NostrClawlinkTransport {
  readonly privateKey: Uint8Array;
  readonly publicKey: string;
  readonly relays: string[];
  private readonly pool: PoolLike;
  private readonly maxWaitMs: number;
  private readonly seenEventIds = new Set<string>();

  constructor(options: ClawlinkTransportOptions) {
    this.privateKey = decodePrivateKey(options.privateKey);
    this.publicKey = getPublicKey(this.privateKey);
    this.relays = options.relays;
    this.pool = options.pool ?? new SimplePool({ enableReconnect: true });
    this.maxWaitMs = options.maxWaitMs ?? 5_000;
  }

  async sendEnvelope(
    target: ClawlinkSendTarget,
    envelope: ClawlinkEnvelope,
  ): Promise<PublishResult> {
    const publicKey = normalizePublicKey(target.publicKey);
    const relays = target.relays?.length ? target.relays : this.relays;
    if (relays.length === 0) {
      throw new Error("No Nostr relays configured.");
    }

    const event = wrapEnvelopeForPeer({
      senderPrivateKey: this.privateKey,
      recipientPublicKey: publicKey,
      relayUrl: relays[0],
      envelope,
    });

    const publishPromises = this.pool.publish(relays, event, {
      maxWait: this.maxWaitMs,
    });
    const settled = await Promise.allSettled(publishPromises);
    const acceptedRelays: string[] = [];
    const rejectedRelays: Array<{ relay: string; error: string }> = [];

    settled.forEach((result, index) => {
      const relay = relays[index] ?? `relay:${index}`;
      if (result.status === "fulfilled") {
        acceptedRelays.push(relay);
      } else {
        rejectedRelays.push({ relay, error: String(result.reason) });
      }
    });

    return {
      eventId: event.id,
      acceptedRelays,
      rejectedRelays,
    };
  }

  unwrapEvent(event: NostrEvent, relay?: string): IncomingClawlinkEvent {
    if (!verifyEvent(event)) {
      throw new Error("Invalid Nostr event signature.");
    }
    const rumor = nip17.unwrapEvent(event, this.privateKey);
    if (rumor.kind !== 14) {
      throw new Error(`Unsupported NIP-17 rumor kind: ${rumor.kind}`);
    }
    return {
      relay,
      outerEventId: event.id,
      senderPublicKey: normalizePublicKey(rumor.pubkey),
      envelope: parseEnvelope(rumor.content),
    };
  }

  subscribeInbox(params: {
    since?: number;
    onEnvelope: (event: IncomingClawlinkEvent) => void | Promise<void>;
    onError?: (error: Error, event?: Event) => void;
    onClose?: (reasons: string[]) => void;
  }): { close: (reason?: string) => void } {
    const filter: Filter = {
      kinds: [1059],
      "#p": [this.publicKey],
      since: params.since,
    };
    return this.pool.subscribeMany(this.relays, filter, {
      id: "clawlink-inbox",
      label: "Clawlink inbox",
      onevent: (event) => {
        if (this.seenEventIds.has(event.id)) {
          return;
        }
        this.seenEventIds.add(event.id);
        try {
          void params.onEnvelope(this.unwrapEvent(event));
        } catch (err) {
          params.onError?.(toError(err), event);
        }
      },
      onclose: params.onClose,
    });
  }

  close(): void {
    this.pool.destroy?.();
  }
}

export function wrapEnvelopeForPeer(params: {
  senderPrivateKey: Uint8Array;
  recipientPublicKey: string;
  relayUrl?: string;
  envelope: ClawlinkEnvelope;
}): NostrEvent {
  return nip17.wrapEvent(
    params.senderPrivateKey,
    {
      publicKey: normalizePublicKey(params.recipientPublicKey),
      relayUrl: params.relayUrl,
    },
    stringifyEnvelope(params.envelope),
    "Clawlink",
  );
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}
