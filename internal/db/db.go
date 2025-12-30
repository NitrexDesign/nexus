package db

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/nexus-homelab/nexus/internal/models"
	_ "modernc.org/sqlite"
)

var DB *sql.DB

func InitDB(driver, dsn string) error {
	log.Printf("Connecting to %s database...", driver)

	var err error
	// Retry connection as database might take a moment to start
	for i := 0; i < 10; i++ {
		DB, err = sql.Open(driver, dsn)
		if err == nil {
			err = DB.Ping()
		}
		if err == nil {
			break
		}
		log.Printf("Failed to connect to database (attempt %d/10): %v", i+1, err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		return fmt.Errorf("failed to connect to database after retries: %w", err)
	}

	// Set connection pool settings
	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(25)
	DB.SetConnMaxLifetime(5 * time.Minute)

	if err := createTables(driver); err != nil {
		return fmt.Errorf("failed to create tables: %w", err)
	}

	log.Println("Database initialized successfully")
	return nil
}

func createTables(driver string) error {
	var queries []string
	if driver == "mysql" {
		queries = []string{
			`CREATE TABLE IF NOT EXISTS users (
				id VARCHAR(255) PRIMARY KEY,
				username VARCHAR(255) UNIQUE NOT NULL,
				display_name VARCHAR(255),
				approved BOOLEAN DEFAULT FALSE,
				password_hash VARCHAR(255)
			);`,
			`CREATE TABLE IF NOT EXISTS credentials (
				id VARBINARY(255) PRIMARY KEY,
				user_id VARCHAR(255) NOT NULL,
				public_key BLOB NOT NULL,
				attestation_type VARCHAR(255) NOT NULL,
				aaguid VARBINARY(255) NOT NULL,
				sign_count BIGINT NOT NULL,
				clone_warning BOOLEAN NOT NULL,
				backup_eligible BOOLEAN NOT NULL DEFAULT FALSE,
				backup_state BOOLEAN NOT NULL DEFAULT FALSE,
				FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
			);`,
			`CREATE TABLE IF NOT EXISTS services (
				id VARCHAR(255) PRIMARY KEY,
				name VARCHAR(255) NOT NULL,
				url VARCHAR(255) NOT NULL,
				icon VARCHAR(255),
				` + "`group`" + ` VARCHAR(255),
				` + "`order`" + ` INTEGER DEFAULT 0,
				public BOOLEAN DEFAULT FALSE,
				auth_required BOOLEAN DEFAULT FALSE,
				new_tab BOOLEAN DEFAULT TRUE,
				health_status VARCHAR(50) DEFAULT 'unknown',
				last_checked TIMESTAMP NULL DEFAULT NULL
			);`,
		}
	} else {
		// SQLite
		queries = []string{
			`CREATE TABLE IF NOT EXISTS users (
				id TEXT PRIMARY KEY,
				username TEXT UNIQUE NOT NULL,
				display_name TEXT,
				approved BOOLEAN DEFAULT FALSE,
				password_hash TEXT
			);`,
			`CREATE TABLE IF NOT EXISTS credentials (
				id BLOB PRIMARY KEY,
				user_id TEXT NOT NULL,
				public_key BLOB NOT NULL,
				attestation_type TEXT NOT NULL,
				aaguid BLOB NOT NULL,
				sign_count INTEGER NOT NULL,
				clone_warning BOOLEAN NOT NULL,
				backup_eligible BOOLEAN NOT NULL DEFAULT FALSE,
				backup_state BOOLEAN NOT NULL DEFAULT FALSE,
				FOREIGN KEY (user_id) REFERENCES users(id)
			);`,
			`CREATE TABLE IF NOT EXISTS services (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				url TEXT NOT NULL,
				icon TEXT,
				"group" TEXT,
				"order" INTEGER DEFAULT 0,
				public BOOLEAN DEFAULT FALSE,
				auth_required BOOLEAN DEFAULT FALSE,
				new_tab BOOLEAN DEFAULT TRUE,
				health_status TEXT DEFAULT 'unknown',
				last_checked DATETIME NULL DEFAULT NULL
			);`,
		}
	}

	for _, q := range queries {
		if _, err := DB.Exec(q); err != nil {
			return err
		}
	}

	// Migrations for existing tables
	if driver == "mysql" {
		DB.Exec("ALTER TABLE services ADD COLUMN health_status VARCHAR(50) DEFAULT 'unknown'")
		DB.Exec("ALTER TABLE services ADD COLUMN last_checked TIMESTAMP NULL DEFAULT NULL")
	} else {
		DB.Exec("ALTER TABLE services ADD COLUMN health_status TEXT DEFAULT 'unknown'")
		DB.Exec("ALTER TABLE services ADD COLUMN last_checked DATETIME NULL DEFAULT NULL")
	}

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
	_, err := DB.Exec("INSERT INTO users (id, username, display_name, approved, password_hash) VALUES (?, ?, ?, ?, ?)", user.ID, user.Username, user.DisplayName, user.Approved, user.PasswordHash)
	return err
}

func GetUsers() ([]models.User, error) {
	rows, err := DB.Query("SELECT id, username, display_name, approved, password_hash FROM users")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Username, &u.DisplayName, &u.Approved, &u.PasswordHash); err == nil {
			users = append(users, u)
		}
	}
	return users, nil
}

func UpdateUserApproval(id string, approved bool) error {
	_, err := DB.Exec("UPDATE users SET approved = ? WHERE id = ?", approved, id)
	return err
}

func DeleteUser(id string) error {
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
}

func CountUsers() (int, error) {
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	return count, err
}

func SaveCredential(userID string, cred *webauthn.Credential) error {
	_, err := DB.Exec(`INSERT INTO credentials (id, user_id, public_key, attestation_type, aaguid, sign_count, clone_warning, backup_eligible, backup_state) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		cred.ID, userID, cred.PublicKey, cred.AttestationType, cred.Authenticator.AAGUID, cred.Authenticator.SignCount, cred.Authenticator.CloneWarning, cred.Flags.BackupEligible, cred.Flags.BackupState)
	return err
}

func GetServices() ([]models.Service, error) {
	// Use backticks for MySQL compatibility, SQLite also supports them
	rows, err := DB.Query("SELECT id, name, url, icon, `group`, `order`, public, auth_required, new_tab, health_status, last_checked FROM services ORDER BY `order` ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var services []models.Service
	for rows.Next() {
		var s models.Service
		var lastChecked sql.NullTime
		if err := rows.Scan(&s.ID, &s.Name, &s.URL, &s.Icon, &s.Group, &s.Order, &s.Public, &s.AuthRequired, &s.NewTab, &s.HealthStatus, &lastChecked); err == nil {
			if lastChecked.Valid {
				s.LastChecked = lastChecked.Time
			}
			services = append(services, s)
		}
	}
	return services, nil
}

func CreateService(s *models.Service) error {
	_, err := DB.Exec("INSERT INTO services (id, name, url, icon, `group`, `order`, public, auth_required, new_tab, health_status, last_checked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		s.ID, s.Name, s.URL, s.Icon, s.Group, s.Order, s.Public, s.AuthRequired, s.NewTab, s.HealthStatus, toNullTime(s.LastChecked))
	return err
}

func UpdateService(s *models.Service) error {
	_, err := DB.Exec("UPDATE services SET name=?, url=?, icon=?, `group`=?, `order`=?, public=?, auth_required=?, new_tab=?, health_status=?, last_checked=? WHERE id=?",
		s.Name, s.URL, s.Icon, s.Group, s.Order, s.Public, s.AuthRequired, s.NewTab, s.HealthStatus, toNullTime(s.LastChecked), s.ID)
	return err
}

func UpdateServiceHealth(id string, status string, lastChecked time.Time) error {
	_, err := DB.Exec("UPDATE services SET health_status=?, last_checked=? WHERE id=?", status, toNullTime(lastChecked), id)
	return err
}

func DeleteService(id string) error {
	_, err := DB.Exec("DELETE FROM services WHERE id = ?", id)
	return err
}

func GetGroups() ([]string, error) {
	rows, err := DB.Query("SELECT DISTINCT `group` FROM services WHERE `group` IS NOT NULL AND `group` != '' ORDER BY `group` ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []string
	for rows.Next() {
		var g string
		if err := rows.Scan(&g); err == nil {
			groups = append(groups, g)
		}
	}
	return groups, nil
}

func BulkCreateServices(services []models.Service) error {
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
		_, err := tx.Exec("INSERT INTO services (id, name, url, icon, `group`, `order`, public, auth_required, new_tab, health_status, last_checked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			s.ID, s.Name, s.URL, s.Icon, s.Group, s.Order, s.Public, s.AuthRequired, s.NewTab, s.HealthStatus, toNullTime(s.LastChecked))
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func toNullTime(t time.Time) sql.NullTime {
	return sql.NullTime{
		Time:  t,
		Valid: !t.IsZero(),
	}
}
