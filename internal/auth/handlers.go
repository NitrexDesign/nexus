package auth

import (
	"encoding/json"
	"net/http"

	"github.com/nexus-homelab/nexus/internal/db"
	"github.com/nexus-homelab/nexus/internal/models"
)

func RegisterPasswordHandlers(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if body.Username == "" || body.Password == "" {
		http.Error(w, "username and password required", http.StatusBadRequest)
		return
	}

	// Check if user exists
	if _, err := db.GetUserByUsername(body.Username); err == nil {
		http.Error(w, "user already exists", http.StatusConflict)
		return
	}

	hashedPassword, err := HashPassword(body.Password)
	if err != nil {
		http.Error(w, "failed to hash password", http.StatusInternalServerError)
		return
	}

	user := &models.User{
		ID:           models.NewID(),
		Username:     body.Username,
		DisplayName:  body.Username,
		PasswordHash: hashedPassword,
		Approved:     false,
	}

	if err := db.CreateUser(user); err != nil {
		http.Error(w, "failed to create user", http.StatusInternalServerError)
		return
	}

	// Check if first user
	count, _ := db.CountUsers()
	if count == 1 {
		db.UpdateUserApproval(user.ID, true)
	}

	jsonResponse(w, http.StatusCreated, "Registration successful")
}

func LoginPasswordHandlers(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	user, err := db.GetUserByUsername(body.Username)
	if err != nil {
		http.Error(w, "invalid username or password", http.StatusUnauthorized)
		return
	}

	if user.PasswordHash == "" {
		http.Error(w, "account has no password set (use passkey)", http.StatusForbidden)
		return
	}

	if !CheckPasswordHash(body.Password, user.PasswordHash) {
		http.Error(w, "invalid username or password", http.StatusUnauthorized)
		return
	}

	if !user.Approved {
		http.Error(w, "your account is pending approval", http.StatusForbidden)
		return
	}

	jsonResponse(w, http.StatusOK, "Login successful")
}





