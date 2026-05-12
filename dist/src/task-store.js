export class InMemoryTaskStore {
    records = new Map();
    upsert(record) {
        const next = {
            ...this.records.get(record.taskId),
            ...record,
            updatedAt: Date.now(),
        };
        this.records.set(record.taskId, next);
        return next;
    }
    updateState(taskId, state, patch = {}) {
        const existing = this.records.get(taskId);
        if (!existing) {
            throw new Error(`Unknown task: ${taskId}`);
        }
        const next = {
            ...existing,
            ...patch,
            state,
            updatedAt: Date.now(),
        };
        this.records.set(taskId, next);
        return next;
    }
    get(taskId) {
        return this.records.get(taskId);
    }
    list() {
        return [...this.records.values()].sort((a, b) => b.updatedAt - a.updatedAt);
    }
    clear() {
        this.records.clear();
    }
}
//# sourceMappingURL=task-store.js.map