-- Create volunteers table to track user participation with organizations
CREATE TABLE IF NOT EXISTS organization_volunteers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  organization_id INT UNSIGNED NOT NULL,
  user_email VARCHAR(191) NOT NULL,
  total_hours INT UNSIGNED NOT NULL DEFAULT 0,
  completed_opportunities INT UNSIGNED NOT NULL DEFAULT 0,
  volunteer_rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  attendance_percentage INT UNSIGNED NOT NULL DEFAULT 100,
  status ENUM('active', 'new', 'inactive') NOT NULL DEFAULT 'active',
  joined_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_organization_volunteers (organization_id, user_email),
  KEY idx_organization_volunteers_organization_id (organization_id),
  KEY idx_organization_volunteers_user_email (user_email),
  CONSTRAINT fk_organization_volunteers_organization_id
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_organization_volunteers_user_email
    FOREIGN KEY (user_email)
    REFERENCES users(email)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample volunteer data for testing
INSERT IGNORE INTO organization_volunteers (
  organization_id, user_email, total_hours, completed_opportunities,
  volunteer_rating, attendance_percentage, status, joined_date
) SELECT
  o.id,
  u.email,
  FLOOR(RAND() * 50) + 5,
  FLOOR(RAND() * 10) + 1,
  ROUND(4.0 + RAND() * 1.0, 2),
  FLOOR(RAND() * 30) + 70,
  'active',
  DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 180) DAY)
FROM organizations o
CROSS JOIN users u
WHERE u.role = 'voluntario'
LIMIT 1;
