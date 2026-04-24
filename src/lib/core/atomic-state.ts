/**
 * Atomic state management for preventing race conditions
 * Ensures thread-safe operations in concurrent environments
 */

export interface AtomicOperation<T> {
  id: string;
  type: 'add' | 'update' | 'delete' | 'toggle';
  data: T;
  timestamp: number;
  retryCount?: number;
}

export class AtomicStateManager<T> {
  private operations: Map<string, AtomicOperation<T>> = new Map();
  private processing: Set<string> = new Set();
  private maxRetries = 3;
  private debounceMs = 100;

  constructor(
    private processor: (operations: AtomicOperation<T>[]) => Promise<void>,
    options?: { maxRetries?: number; debounceMs?: number }
  ) {
    this.maxRetries = options?.maxRetries ?? this.maxRetries;
    this.debounceMs = options?.debounceMs ?? this.debounceMs;
  }

  // Queue an atomic operation
  queue(operation: Omit<AtomicOperation<T>, 'id' | 'timestamp'>): string {
    const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const atomicOp: AtomicOperation<T> = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.operations.set(id, atomicOp);
    this.scheduleProcessing();

    return id;
  }

  // Cancel a pending operation
  cancel(operationId: string): boolean {
    if (this.processing.has(operationId)) {
      return false; // Already processing
    }
    return this.operations.delete(operationId);
  }

  // Process queued operations with debouncing
  private scheduleProcessing = debounce(() => {
    this.processOperations();
  }, this.debounceMs);

  private async processOperations(): Promise<void> {
    if (this.processing.size > 0) {
      return; // Already processing
    }

    const operations = Array.from(this.operations.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );

    if (operations.length === 0) {
      return;
    }

    // Mark as processing
    operations.forEach((op) => this.processing.add(op.id));

    try {
      await this.processor(operations);

      // Clear successful operations
      operations.forEach((op) => {
        this.operations.delete(op.id);
        this.processing.delete(op.id);
      });
    } catch (error) {
      console.error('Atomic operation failed:', error);

      // Retry failed operations
      operations.forEach((op) => {
        this.processing.delete(op.id);

        if ((op.retryCount ?? 0) < this.maxRetries) {
          op.retryCount = (op.retryCount ?? 0) + 1;
          op.timestamp = Date.now(); // Update timestamp for retry
        } else {
          // Max retries reached, remove operation
          this.operations.delete(op.id);
          console.error(`Operation ${op.id} failed after ${this.maxRetries} retries`);
        }
      });

      // Schedule retry if there are operations left
      if (this.operations.size > 0) {
        setTimeout(() => this.scheduleProcessing(), 1000);
      }
    }
  }

  // Get current state
  getPendingOperations(): AtomicOperation<T>[] {
    return Array.from(this.operations.values());
  }

  getProcessingOperations(): string[] {
    return Array.from(this.processing);
  }

  // Clear all operations
  clear(): void {
    this.operations.clear();
    this.processing.clear();
  }
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Race condition prevention for completions
export class CompletionRaceGuard {
  private pendingCompletions: Map<string, Set<string>> = new Map();
  private completionTimeout = 5000; // 5 seconds

  // Check if completion is already pending
  isPending(habitId: string, date: string): boolean {
    const key = `${habitId}_${date}`;
    return this.pendingCompletions.has(key);
  }

  // Mark completion as pending
  markPending(habitId: string, date: string): () => void {
    const key = `${habitId}_${date}`;

    if (!this.pendingCompletions.has(key)) {
      this.pendingCompletions.set(key, new Set());
    }

    const id = Math.random().toString(36).substr(2, 9);
    this.pendingCompletions.get(key)!.add(id);

    // Auto-cleanup after timeout
    const cleanup = setTimeout(() => {
      this.pendingCompletions.get(key)?.delete(id);
      if (this.pendingCompletions.get(key)?.size === 0) {
        this.pendingCompletions.delete(key);
      }
    }, this.completionTimeout);

    return () => {
      clearTimeout(cleanup);
      this.pendingCompletions.get(key)?.delete(id);
      if (this.pendingCompletions.get(key)?.size === 0) {
        this.pendingCompletions.delete(key);
      }
    };
  }

  // Clear all pending completions
  clear(): void {
    this.pendingCompletions.clear();
  }
}

// Singleton instances
export const habitAtomicState = new AtomicStateManager<any>(async (operations) => {
  // This will be implemented by the store
  console.log('Processing atomic operations:', operations);
});

export const completionRaceGuard = new CompletionRaceGuard();
