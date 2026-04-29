CREATE TABLE IF NOT EXISTS organizations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  initials VARCHAR(12) NOT NULL,
  name VARCHAR(160) NOT NULL,
  category VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(180) NOT NULL,
  opportunities_count INT UNSIGNED NOT NULL DEFAULT 0,
  volunteers_count INT UNSIGNED NOT NULL DEFAULT 0,
  rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  email VARCHAR(191) NOT NULL,
  phone VARCHAR(60) NOT NULL,
  website VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_organizations_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS opportunities (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  organization_id INT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  category VARCHAR(120) NOT NULL,
  image_url VARCHAR(1000) NOT NULL,
  opportunity_date VARCHAR(100) NOT NULL,
  time_and_duration VARCHAR(120) NOT NULL,
  location VARCHAR(255) NOT NULL,
  availability_text VARCHAR(120) NOT NULL,
  registered INT UNSIGNED NOT NULL DEFAULT 0,
  total_spots INT UNSIGNED NOT NULL DEFAULT 1,
  about TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_opportunities_organization_id (organization_id),
  CONSTRAINT fk_opportunities_organization_id
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS opportunity_tags (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  opportunity_id INT UNSIGNED NOT NULL,
  tag_name VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_opportunity_tags (opportunity_id, tag_name),
  CONSTRAINT fk_opportunity_tags_opportunity_id
    FOREIGN KEY (opportunity_id)
    REFERENCES opportunities(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS opportunity_responsibilities (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  opportunity_id INT UNSIGNED NOT NULL,
  responsibility_text VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_opportunity_responsibilities (opportunity_id, responsibility_text),
  CONSTRAINT fk_opportunity_responsibilities_opportunity_id
    FOREIGN KEY (opportunity_id)
    REFERENCES opportunities(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS opportunity_requirements (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  opportunity_id INT UNSIGNED NOT NULL,
  requirement_text VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_opportunity_requirements (opportunity_id, requirement_text),
  CONSTRAINT fk_opportunity_requirements_opportunity_id
    FOREIGN KEY (opportunity_id)
    REFERENCES opportunities(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS opportunity_applications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  opportunity_id INT UNSIGNED NOT NULL,
  full_name VARCHAR(140) NOT NULL,
  email VARCHAR(191) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  relevant_experience TEXT NOT NULL,
  motivation TEXT NOT NULL,
  confirm_availability TINYINT(1) NOT NULL DEFAULT 0,
  accept_terms TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('submitted', 'reviewed', 'accepted', 'rejected') NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_opportunity_applications_opportunity_id (opportunity_id),
  KEY idx_opportunity_applications_email (email),
  CONSTRAINT fk_opportunity_applications_opportunity_id
    FOREIGN KEY (opportunity_id)
    REFERENCES opportunities(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO organizations (
  initials, name, category, description, location, opportunities_count, volunteers_count,
  rating, verified, email, phone, website
) VALUES
  (
    'CFB', 'City Food Bank', 'Food & Nutrition',
    'Fighting hunger and food insecurity in our community through volunteer-powered food distribution and essential supplies delivery.',
    'San Francisco, CA', 18, 248, 4.80, 1, 'contact@cityfoodbank.org', '(555) 123-4567', 'www.cityfoodbank.org'
  ),
  (
    'OG', 'Ocean Guardians', 'Environment',
    'Dedicated to protecting our oceans and beaches through clean-up drives, marine life education, and sustainable practices advocacy.',
    'Santa Monica, CA', 12, 186, 4.90, 1, 'hello@oceanguardians.org', '(555) 234-7788', 'www.oceanguardians.org'
  ),
  (
    'BFA', 'Bright Futures Academy', 'Education',
    'Empowering youth through tutoring, mentorship programs, and educational workshops to help students reach their full potential.',
    'Oakland, CA', 25, 412, 4.70, 1, 'team@brightfuturesacademy.org', '(555) 445-0912', 'www.brightfuturesacademy.org'
  ),
  (
    'PCR', 'Paws & Claws Rescue', 'Animal Welfare',
    'Providing care, shelter, and adoption services for abandoned and rescued animals while promoting responsible pet ownership.',
    'Berkeley, CA', 8, 95, 4.90, 1, 'adopt@pawsclawsrescue.org', '(555) 889-1200', 'www.pawsclawsrescue.org'
  ),
  (
    'SCA', 'Senior Care Alliance', 'Healthcare',
    'Supporting elderly community members through companionship visits, daily living assistance, and social activities to combat isolation.',
    'San Jose, CA', 32, 324, 4.80, 1, 'support@seniorcarealliance.org', '(555) 990-2234', 'www.seniorcarealliance.org'
  ),
  (
    'GTC', 'Green Thumbs Collective', 'Community Service',
    'Building sustainable community gardens and teaching urban farming techniques to promote healthy eating and environmental stewardship.',
    'San Francisco, CA', 15, 156, 4.60, 1, 'hello@greenthumbscollective.org', '(555) 650-8877', 'www.greenthumbscollective.org'
  )
ON DUPLICATE KEY UPDATE
  initials = VALUES(initials),
  category = VALUES(category),
  description = VALUES(description),
  location = VALUES(location),
  opportunities_count = VALUES(opportunities_count),
  volunteers_count = VALUES(volunteers_count),
  rating = VALUES(rating),
  verified = VALUES(verified),
  email = VALUES(email),
  phone = VALUES(phone),
  website = VALUES(website);

INSERT INTO opportunities (
  organization_id,
  title,
  category,
  image_url,
  opportunity_date,
  time_and_duration,
  location,
  availability_text,
  registered,
  total_spots,
  about
) VALUES (
  (SELECT id FROM organizations WHERE name = 'City Food Bank' LIMIT 1),
  'Community Food Distribution',
  'Food & Nutrition',
  'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1200&h=420&fit=crop',
  'March 8, 2026',
  '9:00 AM · 4 hours',
  'Downtown Community Center, 123 Main St, San Francisco, CA',
  '2 of 5 spots left',
  3,
  5,
  'Join us in making a difference by helping distribute fresh food and essential supplies to families in need. We are looking for enthusiastic volunteers to help sort, pack, and distribute food items to our community members. This is a great opportunity to give back and connect with your local community.'
)
ON DUPLICATE KEY UPDATE
  category = VALUES(category),
  image_url = VALUES(image_url),
  opportunity_date = VALUES(opportunity_date),
  time_and_duration = VALUES(time_and_duration),
  location = VALUES(location),
  availability_text = VALUES(availability_text),
  registered = VALUES(registered),
  total_spots = VALUES(total_spots),
  about = VALUES(about);

INSERT IGNORE INTO opportunity_tags (opportunity_id, tag_name)
SELECT o.id, t.tag_name
FROM opportunities o
JOIN (
  SELECT 'Community Food Distribution' AS title, 'Food & Nutrition' AS tag_name
  UNION ALL SELECT 'Community Food Distribution', 'Teamwork'
  UNION ALL SELECT 'Community Food Distribution', 'Physical fitness'
  UNION ALL SELECT 'Community Food Distribution', 'Communication'
  UNION ALL SELECT 'Community Food Distribution', 'Organization'
) t ON t.title = o.title;

INSERT IGNORE INTO opportunity_responsibilities (opportunity_id, responsibility_text)
SELECT o.id, r.responsibility_text
FROM opportunities o
JOIN (
  SELECT 'Community Food Distribution' AS title, 'Sort and organize donated food items' AS responsibility_text
  UNION ALL SELECT 'Community Food Distribution', 'Pack food bags according to family size'
  UNION ALL SELECT 'Community Food Distribution', 'Assist with loading and unloading delivery vehicles'
  UNION ALL SELECT 'Community Food Distribution', 'Help distribute food to community members'
  UNION ALL SELECT 'Community Food Distribution', 'Maintain clean and organized workspace'
) r ON r.title = o.title;

INSERT IGNORE INTO opportunity_requirements (opportunity_id, requirement_text)
SELECT o.id, r.requirement_text
FROM opportunities o
JOIN (
  SELECT 'Community Food Distribution' AS title, 'Ability to lift up to 25 lbs' AS requirement_text
  UNION ALL SELECT 'Community Food Distribution', 'Comfortable working in a team environment'
  UNION ALL SELECT 'Community Food Distribution', 'Punctual and reliable'
  UNION ALL SELECT 'Community Food Distribution', 'Background check required'
  UNION ALL SELECT 'Community Food Distribution', 'Must be 16 years or older'
) r ON r.title = o.title;