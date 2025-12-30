package health

import (
	"log"
	"net/http"
	"time"

	"github.com/nexus-homelab/nexus/internal/db"
)

type healthJob struct {
	ID  string
	URL string
}

var jobChan = make(chan healthJob, 100)

func StartHealthChecker(interval time.Duration) {
	log.Printf("Starting health checker with interval %v", interval)
	
	// Start worker pool
	for i := 0; i < 5; i++ {
		go healthWorker()
	}

	ticker := time.NewTicker(interval)
	go func() {
		// Run once immediately
		checkAllServices()
		for range ticker.C {
			checkAllServices()
		}
	}()
}

func healthWorker() {
	for job := range jobChan {
		processCheck(job.ID, job.URL)
	}
}

func checkAllServices() {
	services, err := db.GetServices()
	if err != nil {
		log.Printf("Health Check: Failed to get services: %v", err)
		return
	}

	for _, s := range services {
		jobChan <- healthJob{ID: s.ID, URL: s.URL}
	}
}

func processCheck(id string, url string) {
	client := http.Client{
		Timeout: 10 * time.Second,
	}

	status := "offline"
	start := time.Now()
	resp, err := client.Get(url)
	latency := time.Since(start).Milliseconds()

	if err == nil {
		if resp.StatusCode >= 200 && resp.StatusCode < 400 {
			status = "online"
		}
		resp.Body.Close()
	}

	err = db.UpdateServiceHealth(id, status, time.Now())
	if err != nil {
		log.Printf("Health Check: Failed to update status for %s: %v", url, err)
	}

	// Log to ClickHouse
	err = db.LogHealthCheck(id, url, status, latency)
	if err != nil {
		log.Printf("Health Check: Failed to log to ClickHouse for %s: %v", url, err)
	}
}
