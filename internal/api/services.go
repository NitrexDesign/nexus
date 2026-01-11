package api

import (
	"database/sql"
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
	r.Get("/api/services/{id}/uptime", getServiceUptime)
	r.Get("/api/uptime/bulk", getAllServicesUptime)

	// Widget settings handlers
	r.Get("/api/widgets/settings", getWidgetSettings)
	r.Put("/api/widgets/settings", updateWidgetSettings)
	r.Get("/api/widgets/category-order", getWidgetCategoryOrder)
	r.Put("/api/widgets/category-order", setWidgetCategoryOrder)

	// Widget configuration handlers
	r.Get("/api/widgets/configs", getWidgetConfigs)
	r.Post("/api/widgets/configs", createWidgetConfig)
	r.Get("/api/widgets/configs/{id}", getWidgetConfig)
	r.Put("/api/widgets/configs/{id}", updateWidgetConfig)
	r.Delete("/api/widgets/configs/{id}", deleteWidgetConfig)

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

func getServiceUptime(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	history, err := db.GetUptimeHistory(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if history == nil {
		http.NotFound(w, r)
		return
	}
	jsonResponse(w, http.StatusOK, history)
}

func getAllServicesUptime(w http.ResponseWriter, r *http.Request) {
	histories, err := db.GetAllUptimeHistory()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResponse(w, http.StatusOK, histories)
}

func getWidgetSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := db.GetWidgetSettings()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResponse(w, http.StatusOK, settings)
}

func updateWidgetSettings(w http.ResponseWriter, r *http.Request) {
	var settings db.WidgetSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := db.UpdateWidgetSettings(&settings); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse(w, http.StatusOK, settings)
}

func getWidgetCategoryOrder(w http.ResponseWriter, r *http.Request) {
	categoryOrder, err := db.GetWidgetCategoryOrder()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResponse(w, http.StatusOK, map[string]interface{}{"category_order": categoryOrder})
}

func setWidgetCategoryOrder(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		CategoryOrder []string `json:"category_order"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := db.SetWidgetCategoryOrder(payload.CategoryOrder); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{"category_order": payload.CategoryOrder})
}

func getWidgetConfigs(w http.ResponseWriter, r *http.Request) {
	configs, err := db.GetWidgetConfigs()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResponse(w, http.StatusOK, configs)
}

func createWidgetConfig(w http.ResponseWriter, r *http.Request) {
	var config db.WidgetConfig
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Generate ID if not provided
	if config.ID == "" {
		config.ID = models.NewID()
	}

	if err := db.CreateWidgetConfig(&config); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse(w, http.StatusCreated, config)
}

func getWidgetConfig(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	config, err := db.GetWidgetConfig(id)
	if err != nil {
		if err == sql.ErrNoRows {
			http.NotFound(w, r)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse(w, http.StatusOK, config)
}

func updateWidgetConfig(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var config db.WidgetConfig
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Ensure ID matches URL parameter
	config.ID = id

	if err := db.UpdateWidgetConfig(&config); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResponse(w, http.StatusOK, config)
}

func deleteWidgetConfig(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := db.DeleteWidgetConfig(id); err != nil {
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
