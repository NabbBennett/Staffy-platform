ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS email_notifications TINYINT(1) NOT NULL DEFAULT 1 AFTER verified,
  ADD COLUMN IF NOT EXISTS public_profile TINYINT(1) NOT NULL DEFAULT 1 AFTER email_notifications,
  ADD COLUMN IF NOT EXISTS auto_approve_applications TINYINT(1) NOT NULL DEFAULT 0 AFTER public_profile,
  ADD COLUMN IF NOT EXISTS show_volunteer_count TINYINT(1) NOT NULL DEFAULT 1 AFTER auto_approve_applications;

UPDATE organizations
SET email_notifications = COALESCE(email_notifications, 1),
    public_profile = COALESCE(public_profile, 1),
    auto_approve_applications = COALESCE(auto_approve_applications, 0),
    show_volunteer_count = COALESCE(show_volunteer_count, 1);