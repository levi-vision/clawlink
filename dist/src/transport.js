import { SimplePool, getPublicKey, nip17, verifyEvent, } from "nostr-tools";
import { parseEnvelope, stringifyEnvelope } from "./envelope.js";
import { decodePrivateKey, normalizePublicKey } from "./identity.js";
export class NostrClawlinkTransport {
    privateKey;
    publicKey;
    relays;
    pool;
    maxWaitMs;
    seenEventIds = new Set();
    constructor(options) {
        this.privateKey = decodePrivateKey(options.privateKey);
        this.publicKey = getPublicKey(this.privateKey);
        this.relays = options.relays;
        this.pool = options.pool ?? new SimplePool({ enableReconnect: true });
        this.maxWaitMs = options.maxWaitMs ?? 5_000;
    }
    async sendEnvelope(target, envelope) {
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
        const acceptedRelays = [];
        const rejectedRelays = [];
        settled.forEach((result, index) => {
            const relay = relays[index] ?? `relay:${index}`;
            if (result.status === "fulfilled") {
                acceptedRelays.push(relay);
            }
            else {
                rejectedRelays.push({ relay, error: String(result.reason) });
            }
        });
        return {
            eventId: event.id,
            acceptedRelays,
            rejectedRelays,
        };
    }
    unwrapEvent(event, relay) {
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
    subscribeInbox(params) {
        const filter = {
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
                }
                catch (err) {
                    params.onError?.(toError(err), event);
                }
            },
            onclose: params.onClose,
        });
    }
    close() {
        this.pool.destroy?.();
    }
}
export function wrapEnvelopeForPeer(params) {
    return nip17.wrapEvent(params.senderPrivateKey, {
        publicKey: normalizePublicKey(params.recipientPublicKey),
        relayUrl: params.relayUrl,
    }, stringifyEnvelope(params.envelope), "Clawlink");
}
function toError(value) {
    return value instanceof Error ? value : new Error(String(value));
}
//# sourceMappingURL=transport.js.map