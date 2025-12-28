package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	_ "github.com/go-sql-driver/mysql"
	_ "modernc.org/sqlite"
)

// Service matches the structure for importing
type Service struct {
	Name         string `json:"name"`
	URL          string `json:"url"`
	Icon         string `json:"icon"`
	Group        string `json:"group"`
	Order        int    `json:"order"`
	Public       bool   `json:"public"`
	AuthRequired bool   `json:"auth_required"`
	NewTab       bool   `json:"new_tab"`
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage:")
		fmt.Println("  go run scripts/dump_nexus.go <url_or_db_path_or_dsn>")
		fmt.Println("\nExamples:")
		fmt.Println("  go run scripts/dump_nexus.go http://localhost:8080")
		fmt.Println("  go run scripts/dump_nexus.go data/nexus.db")
		fmt.Println("  go run scripts/dump_nexus.go \"user:pass@tcp(localhost:8767)/nexus\"")
		os.Exit(1)
	}

	target := os.Args[1]
	var services []Service

	if strings.HasPrefix(target, "http://") || strings.HasPrefix(target, "https://") || (strings.Contains(target, ":") && !strings.Contains(target, "/") && !strings.Contains(target, "@")) {
		if !strings.HasPrefix(target, "http") {
			target = "http://" + target
		}
		services = fetchFromAPI(target)
	} else if strings.Contains(target, "@tcp(") {
		services = readFromMySQL(target)
	} else {
		services = readFromSQLite(target)
	}

	output, err := json.MarshalIndent(services, "", "  ")
	if err != nil {
		log.Fatalf("Error marshaling JSON: %v", err)
	}

	fmt.Println(string(output))
}

func fetchFromAPI(baseURL string) []Service {
	apiURL := fmt.Sprintf("%s/api/services", strings.TrimSuffix(baseURL, "/"))
	fmt.Fprintf(os.Stderr, "Fetching services from %s...\n", apiURL)

	resp, err := http.Get(apiURL)
	if err != nil {
		log.Fatalf("Error fetching services: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Fatalf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	var all []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&all); err != nil {
		log.Fatalf("Error decoding JSON: %v", err)
	}

	filtered := []Service{}
	for _, m := range all {
		pub, _ := m["public"].(bool)
		auth, _ := m["auth_required"].(bool)
		s := Service{
			Name:         getString(m, "name"),
			URL:          getString(m, "url"),
			Icon:         getString(m, "icon"),
			Group:        getString(m, "group"),
			Order:        getInt(m, "order"),
			Public:       pub,
			AuthRequired: auth,
			NewTab:       getBool(m, "new_tab"),
		}
		filtered = append(filtered, s)
	}
	return filtered
}

func readFromSQLite(dbPath string) []Service {
	fmt.Fprintf(os.Stderr, "Reading services from SQLite database %s...\n", dbPath)
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	rows, err := db.Query("SELECT name, url, icon, `group`, `order`, public, auth_required, new_tab FROM services ORDER BY `order` ASC")
	if err != nil {
		log.Fatalf("Failed to query services: %v", err)
	}
	defer rows.Close()

	services := []Service{}
	for rows.Next() {
		var s Service
		err := rows.Scan(&s.Name, &s.URL, &s.Icon, &s.Group, &s.Order, &s.Public, &s.AuthRequired, &s.NewTab)
		if err != nil {
			log.Fatalf("Failed to scan row: %v", err)
		}
		services = append(services, s)
	}
	return services
}

func readFromMySQL(dsn string) []Service {
	fmt.Fprintf(os.Stderr, "Reading services from MySQL database...\n")
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	rows, err := db.Query("SELECT name, url, icon, `group`, `order`, public, auth_required, new_tab FROM services ORDER BY `order` ASC")
	if err != nil {
		log.Fatalf("Failed to query services: %v", err)
	}
	defer rows.Close()

	services := []Service{}
	for rows.Next() {
		var s Service
		err := rows.Scan(&s.Name, &s.URL, &s.Icon, &s.Group, &s.Order, &s.Public, &s.AuthRequired, &s.NewTab)
		if err != nil {
			log.Fatalf("Failed to scan row: %v", err)
		}
		services = append(services, s)
	}
	return services
}

func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}

func getInt(m map[string]interface{}, key string) int {
	if v, ok := m[key].(float64); ok {
		return int(v)
	}
	return 0
}

func getBool(m map[string]interface{}, key string) bool {
	if v, ok := m[key].(bool); ok {
		return v
	}
	return false
}
