import { createClient, ClickHouseClient } from "@clickhouse/client";

let client: ClickHouseClient | null = null;

export interface ClickHouseConfig {
  host?: string;
  port?: string;
  database?: string;
  username?: string;
  password?: string;
}

export async function connectClickHouse(
  config: ClickHouseConfig,
): Promise<ClickHouseClient | null> {
  if (!config.host) {
    console.warn(
      "[ClickHouse] No host configured, skipping ClickHouse initialization",
    );
    return null;
  }

  const maxRetries = 10;
  const retryDelay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `[ClickHouse] Connection attempt ${attempt}/${maxRetries}...`,
      );

      client = createClient({
        host: `http://${config.host}:${config.port || "8123"}`,
        username: config.username || "default",
        password: config.password || "",
        database: config.database || "nexus",
      });

      // Test connection
      await client.ping();

      console.log("[ClickHouse] Connected successfully");

      // Initialize tables
      await initializeTables();

      return client;
    } catch (error) {
      console.error(
        `[ClickHouse] Connection attempt ${attempt} failed:`,
        error,
      );

      if (attempt < maxRetries) {
        console.log(`[ClickHouse] Retrying in ${retryDelay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  console.warn(
    "[ClickHouse] Failed to connect after all retries, continuing without ClickHouse",
  );
  return null;
}

async function initializeTables(): Promise<void> {
  if (!client) return;

  try {
    // Create health_checks table with TTL of 30 days
    await client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS health_checks (
          timestamp DateTime64(3) DEFAULT now64(3),
          service_id String,
          status String,
          latency_ms Float64
        ) ENGINE = MergeTree()
        ORDER BY (service_id, timestamp)
        TTL timestamp + INTERVAL 30 DAY
      `,
    });

    // Create hourly aggregation materialized view with TTL of 24 hours
    await client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS health_history_hourly
        (
          service_id String,
          hour DateTime,
          up_count UInt64,
          down_count UInt64,
          avg_latency Float64
        )
        ENGINE = MergeTree()
        ORDER BY (service_id, hour)
        TTL hour + INTERVAL 24 HOUR
      `,
    });

    await client.exec({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS health_history_hourly_mv
        TO health_history_hourly
        AS SELECT
          service_id,
          toStartOfHour(timestamp) AS hour,
          countIf(status = 'online') AS up_count,
          countIf(status = 'offline') AS down_count,
          avg(latency_ms) AS avg_latency
        FROM health_checks
        GROUP BY service_id, hour
      `,
    });

    // Create daily aggregation materialized view with TTL of 30 days
    await client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS health_history_daily
        (
          service_id String,
          day Date,
          up_count UInt64,
          down_count UInt64,
          avg_latency Float64
        )
        ENGINE = MergeTree()
        ORDER BY (service_id, day)
        TTL day + INTERVAL 30 DAY
      `,
    });

    await client.exec({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS health_history_daily_mv
        TO health_history_daily
        AS SELECT
          service_id,
          toStartOfDay(timestamp) AS day,
          countIf(status = 'online') AS up_count,
          countIf(status = 'offline') AS down_count,
          avg(latency_ms) AS avg_latency
        FROM health_checks
        GROUP BY service_id, day
      `,
    });

    console.log("[ClickHouse] Tables initialized successfully");
  } catch (error) {
    console.error("[ClickHouse] Error initializing tables:", error);
    throw error;
  }
}

export function getClickHouseClient(): ClickHouseClient | null {
  return client;
}

export async function closeClickHouse(): Promise<void> {
  if (client) {
    await client.close();
    console.log("[ClickHouse] Connection closed");
  }
}

export async function logHealthCheck(
  serviceId: string,
  status: "online" | "offline",
  latencyMs: number,
): Promise<void> {
  if (!client) return;

  try {
    await client.insert({
      table: "health_checks",
      values: [
        {
          service_id: serviceId,
          status,
          latency_ms: latencyMs,
        },
      ],
      format: "JSONEachRow",
    });
  } catch (error) {
    console.error("[ClickHouse] Error logging health check:", error);
  }
}

export async function getUptimeHistory(serviceId: string): Promise<any> {
  if (!client) {
    return { hourly: [], daily: [] };
  }

  try {
    const hourlyResult = await client.query({
      query: `
        SELECT 
          hour AS timestamp,
          up_count,
          down_count,
          avg_latency AS latency
        FROM health_history_hourly
        WHERE service_id = {serviceId:String}
        ORDER BY hour DESC
        LIMIT 24
      `,
      query_params: { serviceId },
      format: "JSONEachRow",
    });

    const dailyResult = await client.query({
      query: `
        SELECT 
          day AS timestamp,
          up_count,
          down_count,
          avg_latency AS latency
        FROM health_history_daily
        WHERE service_id = {serviceId:String}
        ORDER BY day DESC
        LIMIT 30
      `,
      query_params: { serviceId },
      format: "JSONEachRow",
    });

    const hourly = await hourlyResult.json();
    const daily = await dailyResult.json();

    return { hourly, daily };
  } catch (error) {
    console.error("[ClickHouse] Error fetching uptime history:", error);
    return { hourly: [], daily: [] };
  }
}
