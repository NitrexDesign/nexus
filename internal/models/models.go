package models

import (
	"github.com/go-webauthn/webauthn/webauthn"
)

type User struct {
	ID           string `json:"id"`
	Username     string `json:"username"`
	DisplayName  string `json:"display_name"`
	Approved     bool   `json:"approved"`
	PasswordHash string `json:"-"`
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
	ID           string `json:"id"`
	Name         string `json:"name"`
	URL          string `json:"url"`
	Icon         string `json:"icon"`
	Group        string `json:"group"`
	Order        int    `json:"order"`
	Public       bool   `json:"public"`
	AuthRequired bool   `json:"auth_required"`
	NewTab       bool   `json:"new_tab"`
}
