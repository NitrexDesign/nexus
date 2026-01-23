type Task<T> = () => Promise<T>;

interface QueuedTask<T> {
  task: Task<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

class TaskQueue {
  private queue: QueuedTask<any>[] = [];
  private processing = false;
  private readonly maxQueueSize = 500;

  async enqueue<T>(task: Task<T>): Promise<T> {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error(`Task queue is full (max: ${this.maxQueueSize})`);
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      try {
        const result = await item.task();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }

    this.processing = false;
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

const taskQueue = new TaskQueue();

/**
 * Runs a database write operation through a serialized task queue.
 * This ensures all write operations are executed sequentially to prevent race conditions.
 */
export async function runTask<T>(task: Task<T>): Promise<T> {
  return taskQueue.enqueue(task);
}

export function getQueueSize(): number {
  return taskQueue.getQueueSize();
}
