package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/nexus-homelab/nexus/internal/api"
	"github.com/nexus-homelab/nexus/internal/auth"
	"github.com/nexus-homelab/nexus/internal/db"
	"path"
	"strings"
)

func FileServer(r chi.Router, path string, root http.FileSystem) {
	if strings.ContainsAny(path, "{}*") {
		panic("FileServer does not permit any URL parameters.")
	}

	if path != "/" && path[len(path)-1] != '/' {
		r.Get(path, http.RedirectHandler(path+"/", http.StatusMovedPermanently).ServeHTTP)
		path += "/"
	}

	r.Get(path+"*", func(w http.ResponseWriter, r *http.Request) {
		rctx := chi.RouteContext(r.Context())
		pathPrefix := strings.TrimSuffix(rctx.RoutePattern(), "/*")
		
		// If requesting something that looks like an API, don't fallback
		if strings.HasPrefix(r.URL.Path, "/api") {
			http.NotFound(w, r)
			return
		}

		fs := http.StripPrefix(pathPrefix, http.FileServer(root))
		
		// Check if file exists
		f, err := root.Open(strings.TrimPrefix(r.URL.Path, pathPrefix))
		if err != nil {
			// Serve index.html for SPA routing
			r.URL.Path = pathPrefix + "/"
			fs.ServeHTTP(w, r)
			return
		}
		f.Close()

		fs.ServeHTTP(w, r)
	})
}

func main() {
	dbType := os.Getenv("DB_TYPE")
	var dsn string

	if dbType == "mysql" {
		user := os.Getenv("DB_USER")
		pass := os.Getenv("DB_PASSWORD")
		host := os.Getenv("DB_HOST")
		port := os.Getenv("DB_PORT")
		name := os.Getenv("DB_NAME")
		dsn = fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true", user, pass, host, port, name)
	} else {
		// Fallback to SQLite for local dev if not specified
		dbPath := os.Getenv("DB_PATH")
		if dbPath == "" {
			dbPath = "data/nexus.db"
		}
		// For local dev, we can still support SQLite if we want, 
		// but the user asked to switch to MySQL.
		// I'll keep the SQLite path for now but it will fail if the driver is removed.
		dsn = dbPath 
		log.Printf("Warning: Using SQLite at %s. MySQL is recommended.", dsn)
	}

	if err := db.InitDB(dsn); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	if err := auth.InitWebAuthn(); err != nil {
		log.Fatalf("Failed to initialize WebAuthn: %v", err)
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status": "ok"}`)
	})

	// Public & Service API Routes
	r.Get("/api/auth/register/begin", auth.BeginRegistration)
	r.Post("/api/auth/register/finish", auth.FinishRegistration)
	r.Get("/api/auth/login/begin", auth.BeginLogin)
	r.Post("/api/auth/login/finish", auth.FinishLogin)
	r.Post("/api/auth/register/password", auth.RegisterPasswordHandlers)
	r.Post("/api/auth/login/password", auth.LoginPasswordHandlers)
	
	api.RegisterServiceHandlers(r)
	api.RegisterUserHandlers(r)

	// Serve Icons
	FileServer(r, "/icons", http.Dir("data/icons"))

	// Serve Frontend
	workDir, _ := os.Getwd()
	filesDir := http.Dir(path.Join(workDir, "web/dist"))
	FileServer(r, "/", filesDir)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
