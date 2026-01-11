package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"path"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
	"github.com/nexus-homelab/nexus/internal/api"
	"github.com/nexus-homelab/nexus/internal/auth"
	"github.com/nexus-homelab/nexus/internal/db"
	"github.com/nexus-homelab/nexus/internal/health"
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

		// If requesting something that looks like an API or icons, don't fallback
		if strings.HasPrefix(r.URL.Path, "/api") || strings.HasPrefix(r.URL.Path, "/icons") {
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

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: No .env file found or error loading it: %v", err)
	}

	dbUser := getEnv("DB_USER", "nexus")
	dbPass := getEnv("DB_PASSWORD", "nexus_password")
	dbHost := getEnv("DB_HOST", "mysql")
	dbPort := getEnv("DB_PORT", "3306")
	dbName := getEnv("DB_NAME", "nexus")
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true", dbUser, dbPass, dbHost, dbPort, dbName)

	if err := db.InitDB(dsn); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	if err := db.InitClickHouse(); err != nil {
		log.Printf("Warning: Failed to initialize ClickHouse: %v", err)
	}

	health.StartHealthChecker(5 * time.Minute)

	if err := auth.InitWebAuthn(); err != nil {
		log.Fatalf("Failed to initialize WebAuthn: %v", err)
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// API routes first - these take priority
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

	// Serve Icons from data/icons
	r.Get("/icons/*", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/icons/")
		http.ServeFile(w, r, "data/icons/"+path)
	})

	// Serve Frontend static files - catchall must be last
	workDir, _ := os.Getwd()
	filesDir := http.Dir(path.Join(workDir, "web/dist"))
	FileServer(r, "/", filesDir)

	port := getEnv("API_PORT", "8081")

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
