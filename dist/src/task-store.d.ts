import type { LocalTaskState, ClawlinkTaskRecord } from "./types.js";
export declare class InMemoryTaskStore {
    private readonly records;
    upsert(record: Omit<ClawlinkTaskRecord, "updatedAt">): ClawlinkTaskRecord;
    updateState(taskId: string, state: LocalTaskState, patch?: Partial<Omit<ClawlinkTaskRecord, "taskId" | "state" | "updatedAt">>): ClawlinkTaskRecord;
    get(taskId: string): ClawlinkTaskRecord | undefined;
    list(): ClawlinkTaskRecord[];
    clear(): void;
}
