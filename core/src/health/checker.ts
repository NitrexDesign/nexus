import { eq } from "drizzle-orm";
import { getDB } from "../db/mysql";
import { services } from "../db/schema";
import { runTask } from "../db/task-queue";
import { logHealthCheck } from "../db/clickhouse";

interface HealthCheckJob {
  serviceId: string;
  url: string;
}

class HealthChecker {
  private jobQueue: HealthCheckJob[] = [];
  private processing = false;
  private interval: Timer | null = null;
  private readonly maxQueueSize = 100;
  private readonly workerCount = 5;
  private readonly checkInterval: number;
  private readonly requestTimeout = 10000; // 10 seconds

  constructor(checkIntervalMinutes: number = 5) {
    this.checkInterval = checkIntervalMinutes * 60 * 1000;
  }

  async start(): Promise<void> {
    console.log(
      `[Health] Starting health checker (interval: ${this.checkInterval / 1000}s)`,
    );

    // Run initial check immediately
    await this.scheduleChecks();

    // Schedule periodic checks
    this.interval = setInterval(async () => {
      await this.scheduleChecks();
    }, this.checkInterval);

    console.log(
      `[Health] Health checker started, next check in ${this.checkInterval / 1000}s`,
    );
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log("[Health] Health checker stopped");
  }

  private async scheduleChecks(): Promise<void> {
    try {
      const db = getDB();

      // Get all services that need health checking
      const servicesToCheck = await db
        .select({
          id: services.id,
          url: services.url,
        })
        .from(services)
        .where(eq(services.checkHealth, true));

      console.log(
        `[Health] Scheduling ${servicesToCheck.length} health checks`,
      );

      // Add to job queue
      for (const service of servicesToCheck) {
        if (this.jobQueue.length < this.maxQueueSize) {
          this.jobQueue.push({
            serviceId: service.id,
            url: service.url,
          });
        }
      }

      // Start processing
      this.processQueue();
    } catch (error) {
      console.error("[Health] Error scheduling checks:", error);
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    // Start worker pool
    const workers: Promise<void>[] = [];
    for (let i = 0; i < this.workerCount; i++) {
      workers.push(this.worker());
    }

    // Wait for all workers to finish
    await Promise.all(workers);

    this.processing = false;
  }

  private async worker(): Promise<void> {
    while (this.jobQueue.length > 0) {
      const job = this.jobQueue.shift();
      if (!job) break;

      await this.checkService(job);
    }
  }

  private async checkService(job: HealthCheckJob): Promise<void> {
    const startTime = Date.now();
    let status: "online" | "offline" = "offline";
    let latencyMs = 0;

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.requestTimeout,
      );

      try {
        const response = await fetch(job.url, {
          method: "GET",
          signal: controller.signal,
          headers: {
            "User-Agent": "Nexus-HealthChecker/1.0",
          },
        });

        clearTimeout(timeoutId);
        latencyMs = Date.now() - startTime;

        // Consider 2xx and 3xx as online
        if (response.status >= 200 && response.status < 400) {
          status = "online";
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        latencyMs = Date.now() - startTime;

        if (fetchError.name === "AbortError") {
          console.error(
            `[Health] Service ${job.serviceId} timeout after ${this.requestTimeout}ms`,
          );
        } else {
          console.error(
            `[Health] Service ${job.serviceId} check failed:`,
            fetchError.message,
          );
        }
      }

      // Update MySQL
      await runTask(async () => {
        const db = getDB();
        await db
          .update(services)
          .set({
            healthStatus: status,
            lastChecked: new Date(),
          })
          .where(eq(services.id, job.serviceId));
      });

      // Log to ClickHouse
      await logHealthCheck(job.serviceId, status, latencyMs);

      console.log(`[Health] ${job.serviceId}: ${status} (${latencyMs}ms)`);
    } catch (error) {
      console.error(`[Health] Error checking service ${job.serviceId}:`, error);
    }
  }

  getQueueSize(): number {
    return this.jobQueue.length;
  }
}

let healthChecker: HealthChecker | null = null;

export function startHealthChecker(intervalMinutes?: number): void {
  if (healthChecker) {
    console.warn("[Health] Health checker already running");
    return;
  }

  healthChecker = new HealthChecker(intervalMinutes);
  healthChecker.start();
}

export function stopHealthChecker(): void {
  if (healthChecker) {
    healthChecker.stop();
    healthChecker = null;
  }
}

export function getHealthCheckerQueueSize(): number {
  return healthChecker?.getQueueSize() || 0;
}
