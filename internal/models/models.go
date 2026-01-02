package models

import (
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
)

type User struct {
	ID           string                `json:"id"`
	Username     string                `json:"username"`
	DisplayName  string                `json:"display_name"`
	Approved     bool                  `json:"approved"`
	PasswordHash string                `json:"-"`
	Credentials  []webauthn.Credential `json:"-"`
}

func (u *User) WebAuthnID() []byte {
	return []byte(u.ID)
}

func (u *User) WebAuthnName() string {
	return u.Username
}

func (u *User) WebAuthnDisplayName() string {
	return u.DisplayName
}

func (u *User) WebAuthnIcon() string {
	return ""
}

func (u *User) WebAuthnCredentials() []webauthn.Credential {
	return u.Credentials
}

type Service struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	URL          string    `json:"url"`
	Icon         string    `json:"icon"`
	Group        string    `json:"group"`
	Order        int       `json:"order"`
	Public       bool      `json:"public"`
	AuthRequired bool      `json:"auth_required"`
	NewTab       bool      `json:"new_tab"`
	CheckHealth  bool      `json:"check_health"`
	HealthStatus string    `json:"health_status"`
	LastChecked  time.Time `json:"last_checked"`
}

func NewService() Service {
	return Service{
		HealthStatus: "unknown",
		LastChecked:  time.Time{},
		Order:        999,
		Group:        "General",
	}
}

type HealthPoint struct {
	Timestamp time.Time `json:"timestamp"`
	UpCount   uint64    `json:"up_count"`
	DownCount uint64    `json:"down_count"`
	Latency   float64   `json:"latency"`
}

type UptimeHistory struct {
	ServiceID string        `json:"service_id"`
	Hourly    []HealthPoint `json:"hourly"`
	Daily     []HealthPoint `json:"daily"`
}
