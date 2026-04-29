CREATE TABLE IF NOT EXISTS volunteer_confirmations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_email VARCHAR(191) NOT NULL,
  opportunity_id INT UNSIGNED NOT NULL,
  organization_id INT UNSIGNED NOT NULL,
  status ENUM('pendiente', 'confirmado', 'completado', 'cancelado') NOT NULL DEFAULT 'pendiente',
  confirmed_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  hours_worked DECIMAL(5,2) NULL,
  volunteer_rating DECIMAL(3,2) NULL,
  organization_feedback TEXT NULL,
  volunteer_feedback TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_volunteer_confirmations (user_email, opportunity_id),
  KEY idx_volunteer_confirmations_user_email (user_email),
  KEY idx_volunteer_confirmations_opportunity_id (opportunity_id),
  KEY idx_volunteer_confirmations_organization_id (organization_id),
  KEY idx_volunteer_confirmations_status (status),
  CONSTRAINT fk_volunteer_confirmations_user_email
    FOREIGN KEY (user_email)
    REFERENCES users(email)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_volunteer_confirmations_opportunity_id
    FOREIGN KEY (opportunity_id)
    REFERENCES opportunities(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_volunteer_confirmations_organization_id
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;