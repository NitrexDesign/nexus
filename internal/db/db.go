package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/mysql"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/go-sql-driver/mysql"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/nexus-homelab/nexus/internal/models"
)

var DB *sql.DB

type dbTask struct {
	fn   func() error
	done chan error
}

var taskQueue = make(chan dbTask, 500)

func startWorker() {
	for task := range taskQueue {
		err := task.fn()
		task.done <- err
	}
}

func runTask(fn func() error) error {
	done := make(chan error, 1)
	taskQueue <- dbTask{fn: fn, done: done}
	return <-done
}

// InitDB initializes the database connection and runs migrations automatically
func InitDB(dsn string) error {
	if err := ConnectDB(dsn); err != nil {
		return err
	}

	if err := runMigrations(dsn); err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("Database initialized successfully")
	return nil
}

// ConnectDB establishes a database connection and sets up connection pooling
func ConnectDB(dsn string) error {
	log.Println("Connecting to MySQL database...")

	var err error
	for i := 0; i < 10; i++ {
		DB, err = sql.Open("mysql", dsn)
		if err == nil {
			err = DB.Ping()
		}
		if err == nil {
			break
		}
		log.Printf("Failed to connect to database (attempt %d/10): %v", i+1, err)
		time.Sleep(2 * time.Second)
	}

	if err == nil {
		go startWorker()
	}

	if err != nil {
		return fmt.Errorf("failed to connect to database after retries: %w", err)
	}

	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(25)
	DB.SetConnMaxLifetime(5 * time.Minute)

	log.Println("Database connected successfully")
	return nil
}

// runMigrations runs database migrations using golang-migrate
func runMigrations(dsn string) error {
	log.Println("Running database migrations...")

	// 1. Check for dirty migration state before creating migrate instance
	var version int
	var dirty bool
	err := DB.QueryRow("SELECT version, dirty FROM schema_migrations LIMIT 1").Scan(&version, &dirty)
	if err == nil && dirty {
		log.Printf("Database is dirty at version %d, fixing by dropping migration table...", version)
		if _, err := DB.Exec("DROP TABLE IF EXISTS schema_migrations"); err != nil {
			log.Printf("Warning: Failed to drop dirty migration table: %v", err)
		}
	} else if err != nil && !strings.Contains(err.Error(), "doesn't exist") {
		// Log other errors but continue
		log.Printf("Note: Could not check migration status: %v", err)
	}

	// 2. Get migrations path
	var migrationsPath string

	// First try relative to executable (works in Docker containers)
	execPath, err := os.Executable()
	if err == nil {
		candidatePath := filepath.Join(filepath.Dir(execPath), "db", "migrations")
		if _, err := os.Stat(candidatePath); err == nil {
			migrationsPath = candidatePath
		}
	}

	// Fallback to relative paths from working directory
	if migrationsPath == "" {
		cwd, _ := os.Getwd()
		// Try current directory first
		if _, err := os.Stat("db/migrations"); err == nil {
			migrationsPath = "db/migrations"
		} else if _, err := os.Stat("../db/migrations"); err == nil {
			// Try parent directory (for development)
			migrationsPath = "../db/migrations"
		}
		log.Printf("Using migrations at: %s (CWD: %s)", migrationsPath, cwd)
	}

	if migrationsPath == "" {
		return fmt.Errorf("could not find migrations directory")
	}

	// 3. Create migrate instance using DSN to avoid closing the shared DB pool
	// golang-migrate expects mysql:// prefix
	m, err := migrate.New("file://"+migrationsPath, "mysql://"+dsn)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}
	defer m.Close()

	// 4. Run migrations
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	// 5. Final check
	finalVersion, finalDirty, err := m.Version()
	if err == nil {
		log.Printf("Final migration version: %d, dirty: %t", finalVersion, finalDirty)
	}

	log.Println("Database migrations completed successfully")
	return nil
}

func GetUserByUsername(username string) (*models.User, error) {
	var user models.User
	err := DB.QueryRow("SELECT id, username, display_name, approved, password_hash FROM users WHERE username = ?", username).
		Scan(&user.ID, &user.Username, &user.DisplayName, &user.Approved, &user.PasswordHash)
	if err != nil {
		return nil, err
	}

	// Fetch credentials
	rows, err := DB.Query("SELECT id, public_key, attestation_type, aaguid, sign_count, clone_warning, backup_eligible, backup_state FROM credentials WHERE user_id = ?", user.ID)
	if err != nil {
		return &user, nil
	}
	defer rows.Close()

	for rows.Next() {
		var cred webauthn.Credential
		if err := rows.Scan(&cred.ID, &cred.PublicKey, &cred.AttestationType, &cred.Authenticator.AAGUID, &cred.Authenticator.SignCount, &cred.Authenticator.CloneWarning, &cred.Flags.BackupEligible, &cred.Flags.BackupState); err == nil {
			user.Credentials = append(user.Credentials, cred)
		}
	}

	return &user, nil
}

func CreateUser(user *models.User) error {
	return runTask(func() error {
		_, err := DB.Exec("INSERT INTO users (id, username, display_name, approved, password_hash) VALUES (?, ?, ?, ?, ?)", user.ID, user.Username, user.DisplayName, user.Approved, user.PasswordHash)
		return err
	})
}

func GetUsers() ([]models.User, error) {
	rows, err := DB.Query("SELECT id, username, display_name, approved, password_hash FROM users")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []models.User{}
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Username, &u.DisplayName, &u.Approved, &u.PasswordHash); err == nil {
			users = append(users, u)
		}
	}
	return users, nil
}

func UpdateUserApproval(id string, approved bool) error {
	return runTask(func() error {
		_, err := DB.Exec("UPDATE users SET approved = ? WHERE id = ?", approved, id)
		return err
	})
}

func DeleteUser(id string) error {
	return runTask(func() error {
		tx, err := DB.Begin()
		if err != nil {
			return err
		}
		defer tx.Rollback()

		_, err = tx.Exec("DELETE FROM credentials WHERE user_id = ?", id)
		if err != nil {
			return err
		}
		_, err = tx.Exec("DELETE FROM users WHERE id = ?", id)
		if err != nil {
			return err
		}

		return tx.Commit()
	})
}

func CountUsers() (int, error) {
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	return count, err
}

func SaveCredential(userID string, cred *webauthn.Credential) error {
	return runTask(func() error {
		_, err := DB.Exec(`INSERT INTO credentials (id, user_id, public_key, attestation_type, aaguid, sign_count, clone_warning, backup_eligible, backup_state) 
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			cred.ID, userID, cred.PublicKey, cred.AttestationType, cred.Authenticator.AAGUID, cred.Authenticator.SignCount, cred.Authenticator.CloneWarning, cred.Flags.BackupEligible, cred.Flags.BackupState)
		return err
	})
}

func GetServices() ([]models.Service, error) {
	// Use backticks for MySQL compatibility, SQLite also supports them
	rows, err := DB.Query("SELECT id, name, url, icon, `group`, `order`, public, auth_required, new_tab, check_health, health_status, last_checked FROM services ORDER BY `order` ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	services := []models.Service{}
	for rows.Next() {
		var s models.Service
		var lastChecked sql.NullTime
		if err := rows.Scan(&s.ID, &s.Name, &s.URL, &s.Icon, &s.Group, &s.Order, &s.Public, &s.AuthRequired, &s.NewTab, &s.CheckHealth, &s.HealthStatus, &lastChecked); err == nil {
			if lastChecked.Valid {
				s.LastChecked = lastChecked.Time
			}
			services = append(services, s)
		}
	}
	return services, nil
}

func CreateService(s *models.Service) error {
	return runTask(func() error {
		_, err := DB.Exec("INSERT INTO services (id, name, url, icon, `group`, `order`, public, auth_required, new_tab, check_health, health_status, last_checked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			s.ID, s.Name, s.URL, s.Icon, s.Group, s.Order, s.Public, s.AuthRequired, s.NewTab, s.CheckHealth, s.HealthStatus, toNullTime(s.LastChecked))
		return err
	})
}

func UpdateService(s *models.Service) error {
	return runTask(func() error {
		_, err := DB.Exec("UPDATE services SET name=?, url=?, icon=?, `group`=?, `order`=?, public=?, auth_required=?, new_tab=?, check_health=?, health_status=?, last_checked=? WHERE id=?",
			s.Name, s.URL, s.Icon, s.Group, s.Order, s.Public, s.AuthRequired, s.NewTab, s.CheckHealth, s.HealthStatus, toNullTime(s.LastChecked), s.ID)
		return err
	})
}

func UpdateServiceHealth(id string, status string, lastChecked time.Time) error {
	return runTask(func() error {
		_, err := DB.Exec("UPDATE services SET health_status=?, last_checked=? WHERE id=?", status, toNullTime(lastChecked), id)
		return err
	})
}

func DeleteService(id string) error {
	return runTask(func() error {
		_, err := DB.Exec("DELETE FROM services WHERE id = ?", id)
		return err
	})
}

func GetGroups() ([]string, error) {
	rows, err := DB.Query("SELECT DISTINCT `group` FROM services WHERE `group` IS NOT NULL AND `group` != '' ORDER BY `group` ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	groups := []string{}
	for rows.Next() {
		var g string
		if err := rows.Scan(&g); err == nil {
			groups = append(groups, g)
		}
	}
	return groups, nil
}

func BulkCreateServices(services []models.Service) error {
	return runTask(func() error {
		tx, err := DB.Begin()
		if err != nil {
			return err
		}
		defer tx.Rollback()

		_, err = tx.Exec("DELETE FROM services")
		if err != nil {
			return err
		}

		for _, s := range services {
			if s.ID == "" {
				s.ID = models.NewID()
			}
			_, err := tx.Exec("INSERT INTO services (id, name, url, icon, `group`, `order`, public, auth_required, new_tab, check_health, health_status, last_checked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
				s.ID, s.Name, s.URL, s.Icon, s.Group, s.Order, s.Public, s.AuthRequired, s.NewTab, s.CheckHealth, s.HealthStatus, toNullTime(s.LastChecked))
			if err != nil {
				return err
			}
		}

		return tx.Commit()
	})
}

func toNullTime(t time.Time) sql.NullTime {
	return sql.NullTime{
		Time:  t,
		Valid: !t.IsZero(),
	}
}

// WidgetSettings represents global widget settings
type WidgetSettings struct {
	ID            string   `json:"id"`
	CategoryOrder []string `json:"category_order"`
	GridCols      int      `json:"grid_cols"`
	GridRows      int      `json:"grid_rows"`
}

func GetWidgetSettings() (*WidgetSettings, error) {
	var settings WidgetSettings
	var categoryOrderJSON string
	err := DB.QueryRow("SELECT id, category_order, grid_cols, grid_rows FROM widget_settings WHERE id = 'default'").
		Scan(&settings.ID, &categoryOrderJSON, &settings.GridCols, &settings.GridRows)
	if err != nil {
		if err == sql.ErrNoRows {
			// Return default settings if none exist yet
			return &WidgetSettings{
				ID:            "default",
				CategoryOrder: []string{},
				GridCols:      4,
				GridRows:      6,
			}, nil
		}
		return nil, err
	}

	if err := json.Unmarshal([]byte(categoryOrderJSON), &settings.CategoryOrder); err != nil {
		return nil, err
	}

	return &settings, nil
}

func UpdateWidgetSettings(settings *WidgetSettings) error {
	return runTask(func() error {
		categoryOrderJSON, err := json.Marshal(settings.CategoryOrder)
		if err != nil {
			return err
		}

		_, err = DB.Exec(`
			INSERT INTO widget_settings (id, category_order, grid_cols, grid_rows, updated_at)
			VALUES ('default', ?, ?, ?, NOW())
			ON DUPLICATE KEY UPDATE
			category_order = VALUES(category_order),
			grid_cols = VALUES(grid_cols),
			grid_rows = VALUES(grid_rows),
			updated_at = NOW()
		`, string(categoryOrderJSON), settings.GridCols, settings.GridRows)
		return err
	})
}

func GetWidgetCategoryOrder() ([]string, error) {
	settings, err := GetWidgetSettings()
	if err != nil {
		return nil, err
	}
	return settings.CategoryOrder, nil
}

func SetWidgetCategoryOrder(categoryOrder []string) error {
	settings, err := GetWidgetSettings()
	if err != nil {
		return err
	}
	settings.CategoryOrder = categoryOrder
	return UpdateWidgetSettings(settings)
}

// WidgetConfig represents a widget configuration in the database
type WidgetConfig struct {
	ID         string                 `json:"id"`
	WidgetType string                 `json:"widget_type"`
	Position   WidgetPosition         `json:"position"`
	Settings   map[string]interface{} `json:"settings"`
	Enabled    bool                   `json:"enabled"`
	SortOrder  int                    `json:"sort_order"`
	CreatedAt  time.Time              `json:"created_at"`
	UpdatedAt  time.Time              `json:"updated_at"`
}

type WidgetPosition struct {
	X      int `json:"x"`
	Y      int `json:"y"`
	Width  int `json:"width"`
	Height int `json:"height"`
}

func GetWidgetConfigs() ([]WidgetConfig, error) {
	rows, err := DB.Query(`
		SELECT id, widget_type, position_x, position_y, width, height, settings, enabled, sort_order, created_at, updated_at
		FROM widget_configs
		ORDER BY sort_order ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var configs []WidgetConfig
	for rows.Next() {
		var config WidgetConfig
		var settingsJSON string
		if err := rows.Scan(
			&config.ID, &config.WidgetType,
			&config.Position.X, &config.Position.Y, &config.Position.Width, &config.Position.Height,
			&settingsJSON, &config.Enabled, &config.SortOrder,
			&config.CreatedAt, &config.UpdatedAt,
		); err != nil {
			return nil, err
		}

		// Parse settings JSON
		if err := json.Unmarshal([]byte(settingsJSON), &config.Settings); err != nil {
			return nil, err
		}

		configs = append(configs, config)
	}

	return configs, nil
}

func CreateWidgetConfig(config *WidgetConfig) error {
	return runTask(func() error {
		settingsJSON, err := json.Marshal(config.Settings)
		if err != nil {
			return err
		}

		_, err = DB.Exec(`
			INSERT INTO widget_configs (id, widget_type, position_x, position_y, width, height, settings, enabled, sort_order)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, config.ID, config.WidgetType, config.Position.X, config.Position.Y, config.Position.Width, config.Position.Height,
		   string(settingsJSON), config.Enabled, config.SortOrder)
		return err
	})
}

func UpdateWidgetConfig(config *WidgetConfig) error {
	return runTask(func() error {
		settingsJSON, err := json.Marshal(config.Settings)
		if err != nil {
			return err
		}

		// First try to update the existing widget
		result, err := DB.Exec(`
			UPDATE widget_configs
			SET widget_type=?, position_x=?, position_y=?, width=?, height=?, settings=?, enabled=?, sort_order=?, updated_at=NOW()
			WHERE id=?
		`, config.WidgetType, config.Position.X, config.Position.Y, config.Position.Width, config.Position.Height,
		   string(settingsJSON), config.Enabled, config.SortOrder, config.ID)

		if err != nil {
			return err
		}

		// Check if any rows were affected (widget exists)
		rowsAffected, err := result.RowsAffected()
		if err != nil {
			return err
		}

		// If no rows were affected, the widget doesn't exist, so create it
		if rowsAffected == 0 {
			return DB.QueryRow(`
				INSERT INTO widget_configs (id, widget_type, position_x, position_y, width, height, settings, enabled, sort_order)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			`, config.ID, config.WidgetType, config.Position.X, config.Position.Y, config.Position.Width, config.Position.Height,
			   string(settingsJSON), config.Enabled, config.SortOrder).Err()
		}

		return nil
	})
}

func DeleteWidgetConfig(id string) error {
	return runTask(func() error {
		_, err := DB.Exec("DELETE FROM widget_configs WHERE id = ?", id)
		return err
	})
}

func GetWidgetConfig(id string) (*WidgetConfig, error) {
	var config WidgetConfig
	var settingsJSON string

	err := DB.QueryRow(`
		SELECT id, widget_type, position_x, position_y, width, height, settings, enabled, sort_order, created_at, updated_at
		FROM widget_configs WHERE id = ?
	`, id).Scan(
		&config.ID, &config.WidgetType,
		&config.Position.X, &config.Position.Y, &config.Position.Width, &config.Position.Height,
		&settingsJSON, &config.Enabled, &config.SortOrder,
		&config.CreatedAt, &config.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Parse settings JSON
	if err := json.Unmarshal([]byte(settingsJSON), &config.Settings); err != nil {
		return nil, err
	}

	return &config, nil
}
