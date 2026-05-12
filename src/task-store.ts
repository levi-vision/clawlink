import type { LocalTaskState, ClawlinkTaskRecord } from "./types.js";

export class InMemoryTaskStore {
  private readonly records = new Map<string, ClawlinkTaskRecord>();

  upsert(record: Omit<ClawlinkTaskRecord, "updatedAt">): ClawlinkTaskRecord {
    const next: ClawlinkTaskRecord = {
      ...this.records.get(record.taskId),
      ...record,
      updatedAt: Date.now(),
    };
    this.records.set(record.taskId, next);
    return next;
  }

  updateState(
    taskId: string,
    state: LocalTaskState,
    patch: Partial<Omit<ClawlinkTaskRecord, "taskId" | "state" | "updatedAt">> = {},
  ): ClawlinkTaskRecord {
    const existing = this.records.get(taskId);
    if (!existing) {
      throw new Error(`Unknown task: ${taskId}`);
    }
    const next: ClawlinkTaskRecord = {
      ...existing,
      ...patch,
      state,
      updatedAt: Date.now(),
    };
    this.records.set(taskId, next);
    return next;
  }

  get(taskId: string): ClawlinkTaskRecord | undefined {
    return this.records.get(taskId);
  }

  list(): ClawlinkTaskRecord[] {
    return [...this.records.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  clear(): void {
    this.records.clear();
  }
}
