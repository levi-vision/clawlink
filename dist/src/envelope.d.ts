import { type JsonObject, type ClawlinkEnvelopeType, type ClawlinkEnvelope } from "./types.js";
export declare function unixNow(): number;
export declare function createEnvelope<TBody extends JsonObject>(params: {
    type: ClawlinkEnvelopeType;
    body: TBody;
    conversationId?: string;
    messageId?: string;
    createdAt?: number;
}): ClawlinkEnvelope<TBody>;
export declare function stringifyEnvelope(envelope: ClawlinkEnvelope): string;
export declare function parseEnvelope(input: string): ClawlinkEnvelope;
export declare function assertEnvelope(value: unknown): asserts value is ClawlinkEnvelope;
export declare function isRecord(value: unknown): value is JsonObject;
