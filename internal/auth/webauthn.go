package auth

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/nexus-homelab/nexus/internal/db"
	"github.com/nexus-homelab/nexus/internal/models"
)

var WebAuthn *webauthn.WebAuthn

// In-memory session store for simplicity in this scaffold. Keyed by username.
var sessionData = make(map[string]*webauthn.SessionData)

func InitWebAuthn() error {
	rpName := os.Getenv("WEBAUTHN_RP_NAME")
	if rpName == "" {
		rpName = "Nexus"
	}
	rpID := os.Getenv("WEBAUTHN_RP_ID")
	if rpID == "" {
		rpID = "localhost"
	}
	rpOrigin := os.Getenv("WEBAUTHN_RP_ORIGIN")
	if rpOrigin == "" {
		rpOrigin = "http://localhost:5173,http://localhost:8080" // Default dev ports
	}
	origins := strings.Split(rpOrigin, ",")

	var err error
	WebAuthn, err = webauthn.New(&webauthn.Config{
		RPDisplayName: rpName,
		RPID:          rpID,
		RPOrigins:     origins,
	})
	return err
}

func BeginRegistration(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	if username == "" {
		http.Error(w, "username required", http.StatusBadRequest)
		return
	}

	user, err := db.GetUserByUsername(username)
	if err != nil {
		user = &models.User{
			ID:          models.NewID(),
			Username:    username,
			DisplayName: username,
		}
	}

	options, session, err := WebAuthn.BeginRegistration(user)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	sessionData[username] = session
	log.Printf("[DEBUG] Session created for %s", username)
	jsonResponse(w, http.StatusOK, options.Response)
}

func FinishRegistration(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	if username == "" {
		http.Error(w, "username required", http.StatusBadRequest)
		return
	}

	session, ok := sessionData[username]
	if !ok {
		log.Printf("[DEBUG] Session NOT FOUND for %s. Map size: %d", username, len(sessionData))
		http.Error(w, "session not found", http.StatusBadRequest)
		return
	}
	log.Printf("[DEBUG] Session retrieved for %s", username)

	user, err := db.GetUserByUsername(username)
	if err != nil {
		// New user - use the ID generated during BeginRegistration
		user = &models.User{
			ID:          string(session.UserID),
			Username:    username,
			DisplayName: username,
		}
	}

	credential, err := WebAuthn.FinishRegistration(user, *session, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Save user if new
	if err := db.CreateUser(user); err != nil {
		// If user exists, it might be a second credential registration
		// but for now our scaffold just returns
	} else {
		// Check if first user
		count, _ := db.CountUsers()
		if count == 1 {
			db.UpdateUserApproval(user.ID, true)
		}
	}

	if err := db.SaveCredential(user.ID, credential); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	delete(sessionData, username)
	jsonResponse(w, http.StatusOK, "Registration successful")
}

func BeginLogin(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	if username == "" {
		http.Error(w, "username required", http.StatusBadRequest)
		return
	}

	user, err := db.GetUserByUsername(username)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	options, session, err := WebAuthn.BeginLogin(user)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	sessionData[username] = session
	log.Printf("[DEBUG] Login session created for %s", username)
	jsonResponse(w, http.StatusOK, options.Response)
}

func FinishLogin(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	if username == "" {
		http.Error(w, "username required", http.StatusBadRequest)
		return
	}

	user, err := db.GetUserByUsername(username)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	session, ok := sessionData[username]
	if !ok {
		log.Printf("[DEBUG] Login session NOT FOUND for %s. Map size: %d", username, len(sessionData))
		http.Error(w, "session not found", http.StatusBadRequest)
		return
	}
	log.Printf("[DEBUG] Login session retrieved for %s", username)

	_, err = WebAuthn.FinishLogin(user, *session, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if !user.Approved {
		http.Error(w, "your account is pending approval", http.StatusForbidden)
		return
	}

	delete(sessionData, username)
	jsonResponse(w, http.StatusOK, "Login successful")
}

func jsonResponse(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
