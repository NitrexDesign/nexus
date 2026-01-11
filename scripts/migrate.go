package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/mysql"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/go-sql-driver/mysql"
)

func main() {
	if len(os.Args) < 3 {
		fmt.Println("Usage:")
		fmt.Println("  go run scripts/migrate.go <dsn> <command>")
		fmt.Println("\nCommands:")
		fmt.Println("  up       - Run all pending migrations")
		fmt.Println("  down     - Rollback the last migration")
		fmt.Println("  status   - Show migration status")
		fmt.Println("  version  - Show current migration version")
		fmt.Println("  force    - Force migration version (requires version number, optional 'dirty' as next arg)")
		fmt.Println("\nExamples:")
		fmt.Println("  go run scripts/migrate.go \"user:pass@tcp(localhost:3306)/nexus\" up")
		fmt.Println("  go run scripts/migrate.go \"user:pass@tcp(localhost:3306)/nexus\" force 1")
		fmt.Println("  go run scripts/migrate.go \"user:pass@tcp(localhost:3306)/nexus\" force 1 dirty")
		os.Exit(1)
	}

	dsn := os.Args[1]
	command := os.Args[2]

	// Initialize database connection
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	// Create migrate instance
	m, err := createMigrateInstance(db)
	if err != nil {
		log.Fatalf("Failed to create migrate instance: %v", err)
	}
	defer m.Close()

	switch command {
	case "up":
		runMigrations(m)
	case "down":
		rollbackMigration(m)
	case "status":
		showStatus(m)
	case "version":
		showVersion(m)
	case "force":
		if len(os.Args) < 4 {
			log.Fatal("Force command requires a version number")
		}
		version := 0
		_, err := fmt.Sscanf(os.Args[3], "%d", &version)
		if err != nil {
			log.Fatalf("Invalid version number: %v", err)
		}
		
		if len(os.Args) >= 5 && os.Args[4] == "dirty" {
			forceDirty(db, version)
		} else {
			forceVersion(m, version)
		}
	default:
		fmt.Printf("Unknown command: %s\n", command)
		os.Exit(1)
	}
}

func createMigrateInstance(db *sql.DB) (*migrate.Migrate, error) {
	// Create a MySQL driver instance
	driver, err := mysql.WithInstance(db, &mysql.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to create migration driver: %w", err)
	}

	// Get absolute path for migrations
	wd, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("failed to get working directory: %w", err)
	}
	migrationsPath := filepath.Join(wd, "db", "migrations")

	// Create migrate instance with file source
	m, err := migrate.NewWithDatabaseInstance(
		"file://"+migrationsPath,
		"mysql",
		driver,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create migrate instance: %w", err)
	}

	return m, nil
}

func runMigrations(m *migrate.Migrate) {
	fmt.Println("Running migrations...")

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	fmt.Println("Migrations completed successfully")
}

func rollbackMigration(m *migrate.Migrate) {
	fmt.Println("Rolling back last migration...")

	if err := m.Steps(-1); err != nil && err != migrate.ErrNoChange {
		log.Fatalf("Failed to rollback migration: %v", err)
	}

	fmt.Println("Rollback completed successfully")
}

func showStatus(m *migrate.Migrate) {
	version, dirty, err := m.Version()
	if err != nil {
		log.Fatalf("Failed to get migration version: %v", err)
	}

	fmt.Println("Migration Status:")
	fmt.Println("=================")
	fmt.Printf("Current version: %d\n", version)
	fmt.Printf("Dirty: %t\n", dirty)
}

func showVersion(m *migrate.Migrate) {
	version, dirty, err := m.Version()
	if err != nil {
		log.Fatalf("Failed to get migration version: %v", err)
	}

	fmt.Printf("Current migration version: %d", version)
	if dirty {
		fmt.Printf(" (dirty)")
	}
	fmt.Println()
}

func forceVersion(m *migrate.Migrate, version int) {
	fmt.Printf("Forcing migration version to %d...\n", version)

	if err := m.Force(version); err != nil {
		log.Fatalf("Failed to force version: %v", err)
	}

	fmt.Println("Version forced successfully")
}

func forceDirty(db *sql.DB, version int) {
	fmt.Printf("Forcing migration version to %d and setting DIRTY=1...\n", version)
	
	_, err := db.Exec("REPLACE INTO schema_migrations (version, dirty) VALUES (?, 1)", version)
	if err != nil {
		log.Fatalf("Failed to set dirty state: %v", err)
	}
	
	fmt.Println("Dirty state set successfully")
}
