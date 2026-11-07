-- Persistent account activity. Run against the same DB_NAME as the backend.
-- No passwords, OTP codes or session tokens are stored in these history tables.
CREATE TABLE IF NOT EXISTS customer_registration_history (
  registration_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  registration_source ENUM('email_otp', 'existing_account') NOT NULL,
  registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  email_verified_at DATETIME NULL,
  PRIMARY KEY (registration_id),
  UNIQUE KEY uq_customer_registration_user (user_id),
  KEY ix_customer_registration_time (registered_at),
  CONSTRAINT fk_customer_registration_history_user FOREIGN KEY (user_id)
    REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_login_history (
  login_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  auth_method ENUM('password', 'email_otp') NOT NULL,
  logged_in_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (login_id),
  KEY ix_customer_login_user_time (user_id, logged_in_at),
  CONSTRAINT fk_customer_login_history_user FOREIGN KEY (user_id)
    REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Import the real creation time of existing accounts; verification time is unknown.
-- Do not invent historical logins from active sessions.
INSERT INTO customer_registration_history (user_id, registration_source, registered_at, email_verified_at)
SELECT u.user_id, 'existing_account', u.created_at, NULL
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM customer_registration_history h WHERE h.user_id = u.user_id
);
