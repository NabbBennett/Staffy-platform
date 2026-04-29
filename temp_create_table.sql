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
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;