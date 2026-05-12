import { randomUUID } from "node:crypto";

import { createEnvelope } from "./envelope.js";
import { normalizePublicKey, encodePublicKey } from "./identity.js";
import { decideIncomingEnvelope } from "./policy.js";
import { InMemoryTaskStore } from "./task-store.js";
import { NostrClawlinkTransport, type ClawlinkSendTarget } from "./transport.js";
import type {
  IncomingClawlinkEvent,
  ClawlinkPluginConfig,
  ClawlinkEnvelope,
  PublishResult,
  ResolvedClawlinkConfig,
  TaskRequestBody,
  TaskResultBody,
} from "./types.js";

export type ClawlinkServiceOptions = {
  config: ResolvedClawlinkConfig;
  transport?: NostrClawlinkTransport;
  taskStore?: InMemoryTaskStore;
  onAudit?: (event: Record<string, unknown>) => void;
};

export const GIFT_WRAP_LOOKBACK_SECONDS = 2 * 24 * 60 * 60 + 5 * 60;

export class ClawlinkService {
  readonly config: ResolvedClawlinkConfig;
  readonly taskStore: InMemoryTaskStore;
  private readonly transport?: NostrClawlinkTransport;
  private readonly onAudit?: (event: Record<string, unknown>) => void;
  private subscription?: { close: (reason?: string) => void };

  constructor(options: ClawlinkServiceOptions) {
    this.config = options.config;
    this.taskStore = options.taskStore ?? new InMemoryTaskStore();
    this.transport =
      options.transport ??
      (options.config.identity
        ? new NostrClawlinkTransport({
            privateKey: options.config.identity.privateKey,
            relays: options.config.relays,
          })
        : undefined);
    this.onAudit = options.onAudit;
  }

  listPeers(): Array<{ publicKey: string; npub: string; policy: unknown }> {
    return this.config.trustedPeers.map((publicKey) => ({
      publicKey,
      npub: encodePublicKey(publicKey),
      policy: this.config.peerPolicies[publicKey] ?? {},
    }));
  }

  async sendMessage(params: {
    peer: string;
    text: string;
    relays?: string[];
    conversationId?: string;
  }): Promise<PublishResult> {
    const envelope = createEnvelope({
      type: "message",
      conversationId: params.conversationId,
      body: {
        text: params.text,
        nodeName: this.config.nodeName,
      },
    });
    return this.sendEnvelopeToPeer(params.peer, envelope, params.relays);
  }

  async requestTask(params: {
    peer: string;
    instruction: string;
    relays?: string[];
    conversationId?: string;
    taskType?: string;
    context?: unknown;
    requiresApproval?: boolean;
  }): Promise<{ taskId: string; publish: PublishResult }> {
    const taskId = randomUUID();
    const conversationId = params.conversationId ?? randomUUID();
    const body: TaskRequestBody = {
      taskId,
      instruction: params.instruction,
      taskType: params.taskType,
      context: params.context,
      requiresApproval: params.requiresApproval ?? true,
    };
    const envelope = createEnvelope({
      type: "task.request",
      conversationId,
      body,
    });
    const publish = await this.sendEnvelopeToPeer(params.peer, envelope, params.relays);
    this.taskStore.upsert({
      taskId,
      conversationId,
      peerPublicKey: normalizePublicKey(params.peer),
      direction: "outgoing",
      state: "sent",
      instruction: params.instruction,
      taskType: params.taskType,
    });
    return { taskId, publish };
  }

  async replyTask(params: {
    peer: string;
    taskId: string;
    status: "done" | "failed";
    result?: unknown;
    error?: string;
    relays?: string[];
    conversationId?: string;
  }): Promise<PublishResult> {
    const body: TaskResultBody = {
      taskId: params.taskId,
      status: params.status,
      result: params.result,
      error: params.error,
    };
    const envelope = createEnvelope({
      type: "task.result",
      conversationId: params.conversationId,
      body,
    });
    const publish = await this.sendEnvelopeToPeer(params.peer, envelope, params.relays);
    const existing = this.taskStore.get(params.taskId);
    if (existing) {
      this.taskStore.updateState(params.taskId, params.status, {
        result: params.result,
        error: params.error,
      });
    }
    return publish;
  }

  startInbox(params: {
    onIncoming?: (
      event: IncomingClawlinkEvent,
      decision: ReturnType<typeof decideIncomingEnvelope>,
    ) => void | Promise<void>;
    onError?: (error: Error) => void;
  } = {}): void {
    const transport = this.requireTransport();
    this.subscription = transport.subscribeInbox({
      // NIP-59 gift wraps intentionally randomize the outer event timestamp
      // up to two days in the past, so a short "now minus N seconds" inbox
      // window misses freshly published private messages on real relays.
      since: Math.floor(Date.now() / 1000) - GIFT_WRAP_LOOKBACK_SECONDS,
      onEnvelope: async (event) => {
        const decision = this.handleIncoming(event);
        await params.onIncoming?.(event, decision);
      },
      onError: (error) => params.onError?.(error),
    });
  }

  stop(): void {
    this.subscription?.close("clawlink stopped");
    this.transport?.close();
  }

  handleIncoming(event: IncomingClawlinkEvent): ReturnType<typeof decideIncomingEnvelope> {
    const trusted = this.config.trustedPeers.includes(event.senderPublicKey);
    const decision = decideIncomingEnvelope({
      envelope: event.envelope,
      trusted,
      policy: this.config.peerPolicies[event.senderPublicKey],
    });

    if (event.envelope.type === "task.request") {
      const body = event.envelope.body as TaskRequestBody;
      this.taskStore.upsert({
        taskId: body.taskId,
        conversationId: event.envelope.conversation_id,
        peerPublicKey: event.senderPublicKey,
        direction: "incoming",
        state: decision.nextTaskState ?? "received",
        instruction: body.instruction,
        taskType: body.taskType,
      });
    }

    if (event.envelope.type === "task.result") {
      const body = event.envelope.body as TaskResultBody;
      const existing = this.taskStore.get(body.taskId);
      if (existing) {
        this.taskStore.updateState(body.taskId, body.status, {
          result: body.result,
          error: body.error,
        });
      }
    }

    this.audit({
      kind: "incoming",
      sender: event.senderPublicKey,
      messageId: event.envelope.message_id,
      type: event.envelope.type,
      decision: decision.action,
      reason: decision.reason,
    });
    return decision;
  }

  private async sendEnvelopeToPeer(
    peer: string,
    envelope: ClawlinkEnvelope,
    relays?: string[],
  ): Promise<PublishResult> {
    const target: ClawlinkSendTarget = {
      publicKey: normalizePublicKey(peer),
      relays: relays?.length ? relays : this.config.relays,
    };
    const publish = await this.requireTransport().sendEnvelope(target, envelope);
    this.audit({
      kind: "outgoing",
      peer: target.publicKey,
      messageId: envelope.message_id,
      type: envelope.type,
      acceptedRelays: publish.acceptedRelays,
      rejectedRelays: publish.rejectedRelays,
    });
    return publish;
  }

  private requireTransport(): NostrClawlinkTransport {
    if (!this.transport) {
      throw new Error("Clawlink requires nostrPrivateKey to send or receive.");
    }
    return this.transport;
  }

  private audit(event: Record<string, unknown>): void {
    this.onAudit?.({
      ...event,
      at: Date.now(),
      protocol: "clawlink.mesh",
    });
  }
}

export function buildPeerTargetFromConfig(
  config: ClawlinkPluginConfig,
  peer: string,
): ClawlinkSendTarget {
  return {
    publicKey: normalizePublicKey(peer),
    relays: config.relays,
  };
}
