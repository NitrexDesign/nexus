package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/nexus-homelab/nexus/internal/db"
	"github.com/nexus-homelab/nexus/internal/models"
)

func RegisterServiceHandlers(r chi.Router) {
	r.Get("/api/services", listServices)
	r.Post("/api/services", createService)
	r.Put("/api/services/{id}", updateService)
	r.Delete("/api/services/{id}", deleteService)
	r.Post("/api/services/bulk", bulkImportServices)
	r.Get("/api/groups", listGroups)

	// Icon handlers
	r.Get("/api/icons/search", searchIcons)
	r.Post("/api/icons/download", downloadIcon)
	r.Post("/api/icons/upload", uploadIcon)
}

func listServices(w http.ResponseWriter, r *http.Request) {
	// Return all services from the database
	services, err := db.GetServices()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResponse(w, http.StatusOK, services)
}

func createService(w http.ResponseWriter, r *http.Request) {
	var s models.Service
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	s.ID = models.NewID()
	if err := db.CreateService(&s); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResponse(w, http.StatusCreated, s)
}

func updateService(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var s models.Service
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	s.ID = id
	if err := db.UpdateService(&s); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResponse(w, http.StatusOK, s)
}

func deleteService(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := db.DeleteService(id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func listGroups(w http.ResponseWriter, r *http.Request) {
	groups, err := db.GetGroups()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResponse(w, http.StatusOK, groups)
}

func bulkImportServices(w http.ResponseWriter, r *http.Request) {
	var services []models.Service
	if err := json.NewDecoder(r.Body).Decode(&services); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := db.BulkCreateServices(services); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func jsonResponse(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
