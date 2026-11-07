-- Run once in restaurant_db to enable email-verified customer registration.
CREATE TABLE IF NOT EXISTS customer_registration_otps (
  email VARCHAR(190) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(10) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  last_sent_at DATETIME NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (email),
  KEY ix_customer_registration_otps_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
