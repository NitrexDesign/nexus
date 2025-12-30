package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/nexus-homelab/nexus/internal/models"
)

var CH driver.Conn

func InitClickHouse() error {
	host := os.Getenv("CLICKHOUSE_HOST")
	if host == "" {
		log.Println("Skipping ClickHouse initialization: CLICKHOUSE_HOST not set")
		return nil
	}
	port := os.Getenv("CLICKHOUSE_PORT")
	if port == "" {
		port = "9000"
	}
	database := os.Getenv("CLICKHOUSE_DB")
	if database == "" {
		database = "nexus"
	}

	addr := fmt.Sprintf("%s:%s", host, port)
	var conn driver.Conn
	var err error

	// Retry connection as ClickHouse might take a moment to start
	for i := 0; i < 10; i++ {
		conn, err = clickhouse.Open(&clickhouse.Options{
			Addr: []string{addr},
			Auth: clickhouse.Auth{
				Database: "default",
				Username: "default",
				Password: "",
			},
			Settings: clickhouse.Settings{
				"max_execution_time": 60,
			},
			DialTimeout: 5 * time.Second,
		})

		if err == nil {
			err = conn.Ping(context.Background())
		}

		if err == nil {
			break
		}

		log.Printf("Failed to connect to ClickHouse (attempt %d/10): %v", i+1, err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		return fmt.Errorf("failed to connect to clickhouse after retries: %w", err)
	}

	// Create database if not exists
	err = conn.Exec(context.Background(), fmt.Sprintf("CREATE DATABASE IF NOT EXISTS %s", database))
	if err != nil {
		return fmt.Errorf("failed to create clickhouse database: %w", err)
	}

	// Reconnect to the specific database
	conn.Close()
	CH, err = clickhouse.Open(&clickhouse.Options{
		Addr: []string{addr},
		Auth: clickhouse.Auth{
			Database: database,
			Username: "default",
			Password: "",
		},
		DialTimeout: 5 * time.Second,
	})

	if err != nil {
		return fmt.Errorf("failed to connect to clickhouse database %s: %w", database, err)
	}

	if err := createClickHouseTables(); err != nil {
		return fmt.Errorf("failed to create clickhouse tables: %w", err)
	}

	log.Println("ClickHouse initialized successfully")
	return nil
}

func createClickHouseTables() error {
	// Raw health checks
	err := CH.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS health_checks (
			service_id String,
			url String,
			status String,
			latency_ms Int64,
			timestamp DateTime64(3)
		) ENGINE = MergeTree()
		ORDER BY (service_id, timestamp)
		TTL timestamp + INTERVAL 30 DAY
	`)
	if err != nil {
		return err
	}

	// Per hour aggregation for 24 hours
	err = CH.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS health_history_hourly (
			service_id String,
			hour DateTime,
			up_count UInt64,
			down_count UInt64,
			avg_latency Float64
		) ENGINE = SummingMergeTree()
		ORDER BY (service_id, hour)
		TTL hour + INTERVAL 24 HOUR
	`)
	if err != nil {
		return err
	}

	err = CH.Exec(context.Background(), `
		CREATE MATERIALIZED VIEW IF NOT EXISTS health_hourly_mv
		TO health_history_hourly
		AS SELECT
			service_id,
			toStartOfHour(timestamp) as hour,
			countIf(status = 'online') as up_count,
			countIf(status = 'offline') as down_count,
			avg(latency_ms) as avg_latency
		FROM health_checks
		GROUP BY service_id, hour
	`)
	if err != nil {
		return err
	}

	// Daily aggregation for 30 days
	err = CH.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS health_history_daily (
			service_id String,
			day Date,
			up_count UInt64,
			down_count UInt64,
			avg_latency Float64
		) ENGINE = SummingMergeTree()
		ORDER BY (service_id, day)
		TTL day + INTERVAL 30 DAY
	`)
	if err != nil {
		return err
	}

	err = CH.Exec(context.Background(), `
		CREATE MATERIALIZED VIEW IF NOT EXISTS health_daily_mv
		TO health_history_daily
		AS SELECT
			service_id,
			toDate(timestamp) as day,
			countIf(status = 'online') as up_count,
			countIf(status = 'offline') as down_count,
			avg(latency_ms) as avg_latency
		FROM health_checks
		GROUP BY service_id, day
	`)
	return err
}

func LogHealthCheck(serviceID, url, status string, latencyMs int64) error {
	if CH == nil {
		return nil
	}
	return CH.Exec(context.Background(), `
		INSERT INTO health_checks (service_id, url, status, latency_ms, timestamp)
		VALUES (?, ?, ?, ?, ?)
	`, serviceID, url, status, latencyMs, time.Now())
}

func GetUptimeHistory(serviceID string) (*models.UptimeHistory, error) {
	if CH == nil {
		return nil, nil
	}

	history := &models.UptimeHistory{
		ServiceID: serviceID,
		Hourly:    make([]models.HealthPoint, 0),
		Daily:     make([]models.HealthPoint, 0),
	}

	// Fetch hourly data for last 24 hours
	rows, err := CH.Query(context.Background(), `
		SELECT hour, up_count, down_count, avg_latency 
		FROM health_history_hourly 
		WHERE service_id = ? 
		ORDER BY hour ASC
	`, serviceID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var p models.HealthPoint
			if err := rows.Scan(&p.Timestamp, &p.UpCount, &p.DownCount, &p.Latency); err == nil {
				history.Hourly = append(history.Hourly, p)
			}
		}
	}

	// Fetch daily data for last 30 days
	rows, err = CH.Query(context.Background(), `
		SELECT day, up_count, down_count, avg_latency 
		FROM health_history_daily 
		WHERE service_id = ? 
		ORDER BY day ASC
	`, serviceID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var p models.HealthPoint
			if err := rows.Scan(&p.Timestamp, &p.UpCount, &p.DownCount, &p.Latency); err == nil {
				history.Daily = append(history.Daily, p)
			}
		}
	}

	return history, nil
}
