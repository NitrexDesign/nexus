package db

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/nexus-homelab/nexus/internal/models"
	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func InitDB(dsn string) error {
	log.Printf("Connecting to MySQL database...")

	var err error
	// Retry connection as MySQL might take a moment to start in docker
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

	if err != nil {
		return fmt.Errorf("failed to connect to database after retries: %w", err)
	}

	// Set connection pool settings
	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(25)
	DB.SetConnMaxLifetime(5 * time.Minute)

	if err := createTables(); err != nil {
		return fmt.Errorf("failed to create tables: %w", err)
	}

	log.Println("Database initialized successfully")
	return nil
}

func createTables() error {
	queries := []string{
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
			new_tab BOOLEAN DEFAULT TRUE
		);`,
	}

	for _, q := range queries {
		if _, err := DB.Exec(q); err != nil {
			return err
		}
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
	rows, err := DB.Query("SELECT id, name, url, icon, `group`, `order`, public, auth_required, new_tab FROM services ORDER BY `order` ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var services []models.Service
	for rows.Next() {
		var s models.Service
		if err := rows.Scan(&s.ID, &s.Name, &s.URL, &s.Icon, &s.Group, &s.Order, &s.Public, &s.AuthRequired, &s.NewTab); err == nil {
			services = append(services, s)
		}
	}
	return services, nil
}

func CreateService(s *models.Service) error {
	_, err := DB.Exec("INSERT INTO services (id, name, url, icon, `group`, `order`, public, auth_required, new_tab) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		s.ID, s.Name, s.URL, s.Icon, s.Group, s.Order, s.Public, s.AuthRequired, s.NewTab)
	return err
}

func UpdateService(s *models.Service) error {
	_, err := DB.Exec("UPDATE services SET name=?, url=?, icon=?, `group`=?, `order`=?, public=?, auth_required=?, new_tab=? WHERE id=?",
		s.Name, s.URL, s.Icon, s.Group, s.Order, s.Public, s.AuthRequired, s.NewTab, s.ID)
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
		_, err := tx.Exec("INSERT INTO services (id, name, url, icon, `group`, `order`, public, auth_required, new_tab) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
			s.ID, s.Name, s.URL, s.Icon, s.Group, s.Order, s.Public, s.AuthRequired, s.NewTab)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}
