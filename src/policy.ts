import type {
  ClawlinkEnvelopeType,
  ClawlinkEnvelope,
  PeerPolicy,
  TaskRequestBody,
  TaskState,
} from "./types.js";

export const DEFAULT_PEER_POLICY: PeerPolicy = {
  canMessage: true,
  canRequestTask: false,
  canSendFiles: false,
  autoAcceptTaskTypes: [],
  requireApprovalForAllTasks: true,
};

export type IncomingDecision =
  | { action: "accept"; reason: string; nextTaskState?: TaskState }
  | { action: "needs_approval"; reason: string; nextTaskState?: TaskState }
  | { action: "reject"; reason: string; nextTaskState?: TaskState };

const TASK_TRANSITIONS: Record<TaskState, TaskState[]> = {
  received: ["needs_approval", "accepted", "rejected"],
  needs_approval: ["accepted", "rejected"],
  accepted: ["running", "done", "failed"],
  running: ["done", "failed"],
  done: [],
  rejected: [],
  failed: [],
};

export function normalizePeerPolicy(policy?: Partial<PeerPolicy>): PeerPolicy {
  return {
    canMessage: policy?.canMessage ?? DEFAULT_PEER_POLICY.canMessage,
    canRequestTask: policy?.canRequestTask ?? DEFAULT_PEER_POLICY.canRequestTask,
    canSendFiles: policy?.canSendFiles ?? DEFAULT_PEER_POLICY.canSendFiles,
    autoAcceptTaskTypes: Array.isArray(policy?.autoAcceptTaskTypes)
      ? policy.autoAcceptTaskTypes.filter((value) => typeof value === "string")
      : DEFAULT_PEER_POLICY.autoAcceptTaskTypes,
    requireApprovalForAllTasks:
      policy?.requireApprovalForAllTasks ??
      DEFAULT_PEER_POLICY.requireApprovalForAllTasks,
  };
}

export function decideIncomingEnvelope(params: {
  envelope: ClawlinkEnvelope;
  trusted: boolean;
  policy?: Partial<PeerPolicy>;
}): IncomingDecision {
  const policy = normalizePeerPolicy(params.policy);

  if (!params.trusted && params.envelope.type !== "permission.ask") {
    return {
      action: "reject",
      reason: "sender is not trusted",
    };
  }

  switch (params.envelope.type) {
    case "permission.ask":
      return {
        action: "needs_approval",
        reason: "pairing or permission request requires local approval",
      };
    case "message":
    case "intent.request":
      return policy.canMessage
        ? { action: "accept", reason: "message allowed" }
        : { action: "reject", reason: "messages are disabled for this peer" };
    case "task.request":
      return decideTaskRequest(params.envelope.body as TaskRequestBody, policy);
    case "task.result":
    case "permission.reply":
    case "status.update":
      return { action: "accept", reason: "trusted peer update allowed" };
  }
}

function decideTaskRequest(
  body: TaskRequestBody,
  policy: PeerPolicy,
): IncomingDecision {
  if (!policy.canRequestTask) {
    return {
      action: "reject",
      reason: "task requests are disabled for this peer",
      nextTaskState: "rejected",
    };
  }

  const taskType = body.taskType ?? "default";
  const autoAllowed =
    !policy.requireApprovalForAllTasks &&
    policy.autoAcceptTaskTypes.includes(taskType);

  return autoAllowed
    ? {
        action: "accept",
        reason: "task type is auto-accepted",
        nextTaskState: "accepted",
      }
    : {
        action: "needs_approval",
        reason: "task request requires local approval",
        nextTaskState: "needs_approval",
      };
}

export function isValidTaskTransition(from: TaskState, to: TaskState): boolean {
  return TASK_TRANSITIONS[from].includes(to);
}

export function requiresFileCapability(type: ClawlinkEnvelopeType): boolean {
  return type === "task.request";
}
