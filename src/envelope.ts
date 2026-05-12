import { randomUUID } from "node:crypto";

import {
  ENVELOPE_TYPES,
  PROTOCOL_ID,
  PROTOCOL_VERSION,
  TASK_STATES,
  type JsonObject,
  type ClawlinkEnvelopeType,
  type ClawlinkEnvelope,
} from "./types.js";

const ENVELOPE_TYPE_SET = new Set<string>(ENVELOPE_TYPES);
const TASK_STATE_SET = new Set<string>(TASK_STATES);

export function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}

export function createEnvelope<TBody extends JsonObject>(params: {
  type: ClawlinkEnvelopeType;
  body: TBody;
  conversationId?: string;
  messageId?: string;
  createdAt?: number;
}): ClawlinkEnvelope<TBody> {
  return {
    protocol: PROTOCOL_ID,
    version: PROTOCOL_VERSION,
    message_id: params.messageId ?? randomUUID(),
    conversation_id: params.conversationId ?? randomUUID(),
    type: params.type,
    created_at: params.createdAt ?? unixNow(),
    body: params.body,
  };
}

export function stringifyEnvelope(envelope: ClawlinkEnvelope): string {
  assertEnvelope(envelope);
  return JSON.stringify(envelope);
}

export function parseEnvelope(input: string): ClawlinkEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (err) {
    throw new Error(`Invalid Clawlink envelope JSON: ${String(err)}`);
  }
  assertEnvelope(parsed);
  return parsed;
}

export function assertEnvelope(value: unknown): asserts value is ClawlinkEnvelope {
  if (!isRecord(value)) {
    throw new Error("Envelope must be an object.");
  }
  if (value.protocol !== PROTOCOL_ID) {
    throw new Error(`Unsupported envelope protocol: ${String(value.protocol)}`);
  }
  if (value.version !== PROTOCOL_VERSION) {
    throw new Error(`Unsupported envelope version: ${String(value.version)}`);
  }
  assertNonEmptyString(value.message_id, "message_id");
  assertNonEmptyString(value.conversation_id, "conversation_id");
  if (typeof value.type !== "string" || !ENVELOPE_TYPE_SET.has(value.type)) {
    throw new Error(`Unsupported envelope type: ${String(value.type)}`);
  }
  const createdAt = value.created_at;
  if (typeof createdAt !== "number" || !Number.isInteger(createdAt) || createdAt <= 0) {
    throw new Error("created_at must be a positive unix timestamp.");
  }
  if (!isRecord(value.body)) {
    throw new Error("body must be an object.");
  }
  validateBody(value.type as ClawlinkEnvelopeType, value.body);
}

function validateBody(type: ClawlinkEnvelopeType, body: JsonObject): void {
  switch (type) {
    case "message":
      assertNonEmptyString(body.text, "body.text");
      break;
    case "intent.request":
      assertNonEmptyString(body.intent, "body.intent");
      break;
    case "task.request":
      assertNonEmptyString(body.taskId, "body.taskId");
      assertNonEmptyString(body.instruction, "body.instruction");
      break;
    case "task.result":
      assertNonEmptyString(body.taskId, "body.taskId");
      if (body.status !== "done" && body.status !== "failed") {
        throw new Error("body.status must be done or failed.");
      }
      break;
    case "permission.ask":
      assertNonEmptyString(body.reason, "body.reason");
      break;
    case "permission.reply":
      if (typeof body.accepted !== "boolean") {
        throw new Error("body.accepted must be a boolean.");
      }
      break;
    case "status.update":
      assertNonEmptyString(body.taskId, "body.taskId");
      if (typeof body.state !== "string" || !TASK_STATE_SET.has(body.state)) {
        throw new Error("body.state is not a valid task state.");
      }
      break;
  }
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

export function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
