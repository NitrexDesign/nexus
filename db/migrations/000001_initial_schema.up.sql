-- Initial schema migration
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    approved BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS credentials (
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
);

CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL,
    icon VARCHAR(255),
    `group` VARCHAR(255),
    `order` INTEGER DEFAULT 0,
    public BOOLEAN DEFAULT FALSE,
    auth_required BOOLEAN DEFAULT FALSE,
    new_tab BOOLEAN DEFAULT TRUE,
    check_health BOOLEAN DEFAULT TRUE,
    health_status VARCHAR(50) DEFAULT 'unknown',
    last_checked TIMESTAMP NULL DEFAULT NULL
);