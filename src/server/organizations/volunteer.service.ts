import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getDbPool } from '../db/mysql';

export interface VolunteerRecord extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'new' | 'inactive';
  hours: number;
  opportunities: number;
  rating: number;
  attendance: number;
  joined: string;
}

export interface ApplicationRecord extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  opportunity: string;
  status: 'submitted' | 'reviewed' | 'accepted' | 'rejected';
  time: string;
}

export interface DashboardStats extends RowDataPacket {
  total_volunteers: number;
  active_opportunities: number;
  total_applications: number;
  approved_applications: number;
  pending_applications: number;
  total_hours_served: number;
}

/**
 * Get all volunteers for an organization
 */
export async function findOrganizationVolunteers(organizationId: number): Promise<VolunteerRecord[]> {
  const pool = getDbPool();
  const query = `
    SELECT
      ov.id,
      COALESCE(u.full_name, SUBSTRING_INDEX(ov.user_email, '@', 1)) AS name,
      ov.user_email AS email,
      ov.status,
      ov.total_hours AS hours,
      ov.completed_opportunities AS opportunities,
      ov.volunteer_rating AS rating,
      ov.attendance_percentage AS attendance,
      DATE_FORMAT(ov.joined_date, '%b %Y') AS joined
    FROM organization_volunteers ov
    LEFT JOIN users u ON ov.user_email = u.email
    WHERE ov.organization_id = ?
    ORDER BY ov.last_activity DESC, ov.total_hours DESC
  `;

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<VolunteerRecord[]>(query, [organizationId]);
    return rows || [];
  } finally {
    connection.release();
  }
}

/**
 * Get all applications for an organization
 */
export async function findOrganizationApplications(organizationId: number): Promise<ApplicationRecord[]> {
  const pool = getDbPool();
  const query = `
    SELECT
      oa.id,
      oa.full_name AS name,
      oa.email,
      o.title AS opportunity,
      oa.status,
      DATE_FORMAT(oa.created_at, '%b %d, %Y') AS time
    FROM opportunity_applications oa
    INNER JOIN opportunities o ON oa.opportunity_id = o.id
    WHERE o.organization_id = ?
    ORDER BY oa.created_at DESC
  `;

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<ApplicationRecord[]>(query, [organizationId]);
    return rows || [];
  } finally {
    connection.release();
  }
}

export async function updateOrganizationApplicationStatus(
  organizationId: number,
  applicationId: number,
  status: 'submitted' | 'reviewed' | 'accepted' | 'rejected',
): Promise<boolean> {
  const pool = getDbPool();
  const query = `
    UPDATE opportunity_applications oa
    INNER JOIN opportunities o ON oa.opportunity_id = o.id
    SET oa.status = ?
    WHERE oa.id = ? AND o.organization_id = ?
  `;

  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute<ResultSetHeader>(query, [status, applicationId, organizationId]);
    return result.affectedRows > 0;
  } finally {
    connection.release();
  }
}

/**
 * Get dashboard statistics for an organization
 */
export async function findDashboardStats(organizationId: number): Promise<DashboardStats | null> {
  const pool = getDbPool();
  const query = `
    SELECT
      COALESCE(COUNT(DISTINCT ov.user_email), 0) AS total_volunteers,
      COALESCE(SUM(CASE WHEN o.registered < o.total_spots THEN 1 ELSE 0 END), 0) AS active_opportunities,
      COALESCE(COUNT(DISTINCT oa.id), 0) AS total_applications,
      COALESCE(SUM(CASE WHEN oa.status IN ('accepted', 'reviewed') THEN 1 ELSE 0 END), 0) AS approved_applications,
      COALESCE(SUM(CASE WHEN oa.status = 'submitted' THEN 1 ELSE 0 END), 0) AS pending_applications,
      COALESCE(SUM(ov.total_hours), 0) AS total_hours_served
    FROM organizations org
    LEFT JOIN organization_volunteers ov ON org.id = ov.organization_id
    LEFT JOIN opportunities o ON org.id = o.organization_id
    LEFT JOIN opportunity_applications oa ON o.id = oa.opportunity_id
    WHERE org.id = ?
  `;

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<DashboardStats[]>(query, [organizationId]);
    return rows && rows.length > 0 ? rows[0] : null;
  } finally {
    connection.release();
  }
}

/**
 * Get recent opportunities for dashboard
 */
export interface OpportunityItem extends RowDataPacket {
  id: number;
  title: string;
  date: string;
  status: string;
  progress: string;
}

export async function findRecentOpportunities(organizationId: number, limit: number = 5): Promise<OpportunityItem[]> {
  const pool = getDbPool();
  const query = `
    SELECT
      o.id,
      o.title,
      o.opportunity_date AS date,
      CASE
        WHEN o.registered >= o.total_spots THEN 'Full'
        WHEN (o.total_spots - o.registered) <= 2 THEN 'Almost Full'
        ELSE 'Open'
      END AS status,
      CONCAT(o.registered, '/', o.total_spots, ' registered') AS progress
    FROM opportunities o
    WHERE o.organization_id = ?
    ORDER BY STR_TO_DATE(o.opportunity_date, '%M %d, %Y') ASC
    LIMIT ?
  `;

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<OpportunityItem[]>(query, [organizationId, limit]);
    return rows || [];
  } finally {
    connection.release();
  }
}

/**
 * Mark a volunteer as having completed a program for an organization
 */
export async function markVolunteerCompleted(organizationId: number, volunteerId: number): Promise<boolean> {
  const pool = getDbPool();
  const query = `
    UPDATE organization_volunteers
    SET completed_opportunities = completed_opportunities + 1,
        last_activity = CURRENT_TIMESTAMP,
        status = 'active'
    WHERE id = ? AND organization_id = ?
  `;

  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute<ResultSetHeader>(query, [volunteerId, organizationId]);
    return result.affectedRows > 0;
  } finally {
    connection.release();
  }
}

/**
 * Rate a volunteer (set their volunteer_rating). Caller should supply a value 0-5
 */
export async function rateOrganizationVolunteer(organizationId: number, volunteerId: number, rating: number): Promise<boolean> {
  const pool = getDbPool();
  const query = `
    UPDATE organization_volunteers
    SET volunteer_rating = ?, last_activity = CURRENT_TIMESTAMP
    WHERE id = ? AND organization_id = ?
  `;

  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute<ResultSetHeader>(query, [rating, volunteerId, organizationId]);
    return result.affectedRows > 0;
  } finally {
    connection.release();
  }
}

/**
 * Set volunteer status (active/new/inactive) for an organization
 */
export async function setVolunteerStatus(organizationId: number, volunteerId: number, status: 'active' | 'new' | 'inactive'): Promise<boolean> {
  const pool = getDbPool();
  const query = `
    UPDATE organization_volunteers
    SET status = ?, last_activity = CURRENT_TIMESTAMP
    WHERE id = ? AND organization_id = ?
  `;

  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute<ResultSetHeader>(query, [status, volunteerId, organizationId]);
    return result.affectedRows > 0;
  } finally {
    connection.release();
  }
}
