package db

import (
	"database/sql"
	"fmt"
	"log"

	"path/filepath"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/nexus-homelab/nexus/internal/models"
	_ "modernc.org/sqlite"
)

var DB *sql.DB

func InitDB(path string) error {
	absPath, _ := filepath.Abs(path)
	log.Printf("Connecting to database at: %s", absPath)

	var err error
	DB, err = sql.Open("sqlite", path)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	// Set pragmas for better reliability
	_, err = DB.Exec(`
		PRAGMA journal_mode = WAL;
		PRAGMA busy_timeout = 5000;
		PRAGMA synchronous = NORMAL;
	`)
	if err != nil {
		log.Printf("Warning: failed to set pragmas: %v", err)
	}

	if err := DB.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	if err := createTables(); err != nil {
		return fmt.Errorf("failed to create tables: %w", err)
	}

	log.Println("Database initialized successfully")
	return nil
}

func createTables() error {
	queries := []string{
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
			auth_required BOOLEAN DEFAULT FALSE
		);`,
	}

	for _, q := range queries {
		if _, err := DB.Exec(q); err != nil {
			return err
		}
	}

	// Simple migration for existing DB
	DB.Exec("ALTER TABLE services ADD COLUMN public BOOLEAN DEFAULT FALSE;")
	DB.Exec("ALTER TABLE services ADD COLUMN auth_required BOOLEAN DEFAULT FALSE;")
	DB.Exec("ALTER TABLE users ADD COLUMN approved BOOLEAN DEFAULT FALSE;")
	DB.Exec("ALTER TABLE users ADD COLUMN password_hash TEXT;")
	DB.Exec("UPDATE users SET approved = TRUE WHERE (SELECT COUNT(*) FROM users) = 1;") // Keep existing user approved if migration
	DB.Exec("ALTER TABLE credentials ADD COLUMN backup_eligible BOOLEAN DEFAULT FALSE;")
	DB.Exec("ALTER TABLE credentials ADD COLUMN backup_state BOOLEAN DEFAULT FALSE;")

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
	rows, err := DB.Query(`SELECT id, name, url, icon, "group", "order", public, auth_required FROM services ORDER BY "order" ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var services []models.Service
	for rows.Next() {
		var s models.Service
		if err := rows.Scan(&s.ID, &s.Name, &s.URL, &s.Icon, &s.Group, &s.Order, &s.Public, &s.AuthRequired); err == nil {
			services = append(services, s)
		}
	}
	return services, nil
}

func CreateService(s *models.Service) error {
	_, err := DB.Exec(`INSERT INTO services (id, name, url, icon, "group", "order", public, auth_required) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		s.ID, s.Name, s.URL, s.Icon, s.Group, s.Order, s.Public, s.AuthRequired)
	return err
}

func UpdateService(s *models.Service) error {
	_, err := DB.Exec(`UPDATE services SET name=?, url=?, icon=?, "group"=?, "order"=?, public=?, auth_required=? WHERE id=?`,
		s.Name, s.URL, s.Icon, s.Group, s.Order, s.Public, s.AuthRequired, s.ID)
	return err
}

func DeleteService(id string) error {
	_, err := DB.Exec("DELETE FROM services WHERE id = ?", id)
	return err
}

func GetGroups() ([]string, error) {
	rows, err := DB.Query(`SELECT DISTINCT "group" FROM services WHERE "group" IS NOT NULL AND "group" != '' ORDER BY "group" ASC`)
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
		_, err := tx.Exec(`INSERT INTO services (id, name, url, icon, "group", "order", public, auth_required) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			s.ID, s.Name, s.URL, s.Icon, s.Group, s.Order, s.Public, s.AuthRequired)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}
