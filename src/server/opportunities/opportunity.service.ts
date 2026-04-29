import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getDbPool } from '../db/mysql';
import {
  CreateOpportunityApplicationPayload,
  OpportunityDetail,
} from './opportunity.model';

interface VolunteerConfirmationRow extends RowDataPacket {
  id: number;
  user_email: string;
  opportunity_id: number;
  organization_id: number;
  status: 'pendiente' | 'confirmado' | 'completado' | 'cancelado';
  confirmed_at: string | null;
  completed_at: string | null;
  hours_worked: number | null;
  volunteer_rating: number | null;
  organization_feedback: string | null;
  volunteer_feedback: string | null;
  created_at: string;
  updated_at: string;
  title: string;
  organization_name: string;
  opportunity_date: string;
  location: string;
}

interface OpportunityRow extends RowDataPacket {
  id: number;
  title: string;
  category: string;
  image_url: string;
  opportunity_date: string;
  time_and_duration: string;
  location: string;
  availability_text: string;
  registered: number;
  total_spots: number;
  about: string;
  organization_name: string;
  organization_logo: string | null;
  organization_rating: string | number;
  organization_verified: number;
}

interface OpportunityListRow extends RowDataPacket {
  id: number;
  organization_id: number;
  title: string;
  category: string;
  image_url: string;
  organization_name: string;
  organization_logo: string | null;
  opportunity_date: string;
  location: string;
  registered: number;
  total_spots: number;
}

interface TextRow extends RowDataPacket {
  value: string;
}

function mapOpportunity(row: OpportunityRow, tags: string[], responsibilities: string[], requirements: string[]): OpportunityDetail {
  return {
    id: row.id,
    title: row.title,
    organization: row.organization_name,
    category: row.category,
    image: row.image_url,
    date: row.opportunity_date,
    timeAndDuration: row.time_and_duration,
    location: row.location,
    availability: row.availability_text,
    registered: row.registered,
    totalSpots: row.total_spots,
    rating: Number(row.organization_rating),
    verified: row.organization_verified === 1,
    tags,
    about: row.about,
    responsibilities,
    requirements,
    organizationLogo: row.organization_logo,
  };
}

export async function findOpportunityById(id: number): Promise<OpportunityDetail | null> {
  const pool = getDbPool();
  const [rows] = await pool.query<OpportunityRow[]>(
    `SELECT o.id, o.title, o.category, o.image_url, o.opportunity_date,
            o.time_and_duration, o.location, o.availability_text,
            o.registered, o.total_spots, o.about,
            COALESCE(NULLIF(org.name, ''), u.full_name) AS organization_name,
            up.photo_url AS organization_logo,
            org.rating AS organization_rating,
            org.verified AS organization_verified
     FROM opportunities o
     INNER JOIN organizations org ON org.id = o.organization_id
     INNER JOIN users u ON u.email = org.email
     LEFT JOIN user_profiles up ON up.user_email = u.email
     WHERE o.id = ?
     LIMIT 1`,
    [id],
  );

  if (rows.length === 0) {
    return null;
  }

  const [tagsRows] = await pool.query<TextRow[]>(
    `SELECT tag_name AS value
     FROM opportunity_tags
     WHERE opportunity_id = ?
     ORDER BY id ASC`,
    [id],
  );
  const [responsibilityRows] = await pool.query<TextRow[]>(
    `SELECT responsibility_text AS value
     FROM opportunity_responsibilities
     WHERE opportunity_id = ?
     ORDER BY id ASC`,
    [id],
  );
  const [requirementRows] = await pool.query<TextRow[]>(
    `SELECT requirement_text AS value
     FROM opportunity_requirements
     WHERE opportunity_id = ?
     ORDER BY id ASC`,
    [id],
  );

  return mapOpportunity(
    rows[0],
    tagsRows.map((row) => row.value),
    responsibilityRows.map((row) => row.value),
    requirementRows.map((row) => row.value),
  );
}

export async function findOpportunitySummaryList(): Promise<OpportunityListRow[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<OpportunityListRow[]>(
    `SELECT o.id, o.organization_id, o.title, o.category, o.image_url,
            COALESCE(NULLIF(org.name, ''), u.full_name) AS organization_name,
            up.photo_url AS organization_logo,
            o.opportunity_date, o.location, o.registered, o.total_spots
     FROM opportunities o
     INNER JOIN organizations org ON org.id = o.organization_id
     INNER JOIN users u ON u.email = org.email
     LEFT JOIN user_profiles up ON up.user_email = u.email
     ORDER BY o.id DESC`,
  );

  return rows;
}

export async function createOpportunityApplication(
  opportunityId: number,
  payload: CreateOpportunityApplicationPayload,
): Promise<number> {
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Obtener oportunidad actual
    const [opportunityRows] = await connection.query<RowDataPacket[]>(
      `SELECT registered, total_spots, organization_id FROM opportunities WHERE id = ? FOR UPDATE`,
      [opportunityId],
    );

    if (opportunityRows.length === 0) {
      throw new Error('Oportunidad no encontrada.');
    }

    const currentOpp = opportunityRows[0] as { registered: number; total_spots: number; organization_id: number };

    // Validar que hay cupo
    if (currentOpp.registered >= currentOpp.total_spots) {
      const error = new Error('La oportunidad ya no tiene cupos disponibles.');
      (error as Error & { code?: string }).code = 'OPPORTUNITY_FULL';
      throw error;
    }

    // Insertar aplicación
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO opportunity_applications (
        opportunity_id, full_name, email, phone,
        relevant_experience, motivation, confirm_availability, accept_terms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        opportunityId,
        payload.fullName,
        payload.email,
        payload.phone,
        payload.relevantExperience,
        payload.motivation,
        payload.confirmAvailability ? 1 : 0,
        payload.acceptTerms ? 1 : 0,
      ],
    );

    // Registrar voluntario en organization_volunteers si no existe
    const normalizedEmail = payload.email.trim().toLowerCase();
    await connection.execute(
      `INSERT IGNORE INTO organization_volunteers (organization_id, user_email, status, joined_date)
       VALUES (?, ?, 'new', CURRENT_TIMESTAMP)`,
      [currentOpp.organization_id, normalizedEmail],
    );

    // Actualizar oportunidad
    const nextRegistered = currentOpp.registered + 1;
    const spotsRemaining = currentOpp.total_spots - nextRegistered;
    const availabilityText = spotsRemaining > 0
      ? `${spotsRemaining} of ${currentOpp.total_spots} spots left`
      : 'No spots left';

    await connection.execute(
      `UPDATE opportunities SET registered = ?, availability_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [nextRegistered, availabilityText, opportunityId],
    );

    await connection.commit();
    console.log(`Application created for opportunity ${opportunityId}, new registered count: ${nextRegistered}`);
    return result.insertId;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Error during rollback:', rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
}

interface ApplicationRow extends RowDataPacket {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  created_at: Date;
}

export async function findOpportunityApplications(opportunityId: number): Promise<ApplicationRow[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<ApplicationRow[]>(
    `SELECT id, full_name, email, phone, status, created_at
     FROM opportunity_applications
     WHERE opportunity_id = ?
     ORDER BY created_at DESC`,
    [opportunityId],
  );

  return rows;
}

interface VolunteerApplicationRow extends RowDataPacket {
  id: number;
  opportunity_id: number;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  title: string;
  organization_name: string;
}

export async function getVolunteerApplications(userEmail: string): Promise<VolunteerApplicationRow[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<VolunteerApplicationRow[]>(
    `SELECT oa.id, oa.opportunity_id, oa.full_name, oa.email, oa.phone, oa.status, oa.created_at,
            o.title, org.name AS organization_name
     FROM opportunity_applications oa
     INNER JOIN opportunities o ON o.id = oa.opportunity_id
     INNER JOIN organizations org ON org.id = o.organization_id
     WHERE oa.email = ?
     ORDER BY oa.created_at DESC`,
    [userEmail],
  );

  return rows;
}

export async function hasVolunteerApplicationForOpportunity(
  userEmail: string,
  opportunityId: number,
): Promise<boolean> {
  const pool = getDbPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 1
     FROM opportunity_applications
     WHERE email = ? AND opportunity_id = ?
     LIMIT 1`,
    [userEmail, opportunityId],
  );

  return rows.length > 0;
}

export async function getVolunteerConfirmations(userEmail: string): Promise<VolunteerConfirmationRow[]> {
  const pool = getDbPool();

  const primaryQuery = `
    SELECT vc.*, o.title, org.name as organization_name, o.opportunity_date, o.location
    FROM volunteer_confirmations vc
    INNER JOIN opportunities o ON o.id = vc.opportunity_id
    INNER JOIN organizations org ON org.id = vc.organization_id
    WHERE vc.user_email = ?
    ORDER BY vc.created_at DESC`;

  const fallbackQuery = `
    SELECT
      oa.id,
      oa.email AS user_email,
      oa.opportunity_id,
      o.organization_id,
      CASE
        WHEN oa.status = 'accepted' THEN 'confirmado'
        WHEN oa.status = 'rejected' THEN 'cancelado'
        ELSE 'pendiente'
      END AS status,
      NULL AS confirmed_at,
      NULL AS completed_at,
      NULL AS hours_worked,
      NULL AS volunteer_rating,
      NULL AS organization_feedback,
      NULL AS volunteer_feedback,
      oa.created_at,
      oa.updated_at,
      o.title,
      org.name as organization_name,
      o.opportunity_date,
      o.location
    FROM opportunity_applications oa
    INNER JOIN opportunities o ON o.id = oa.opportunity_id
    INNER JOIN organizations org ON org.id = o.organization_id
    WHERE oa.email = ?
    ORDER BY oa.created_at DESC`;

  const connection = await pool.getConnection();
  try {
    try {
      const [rows] = await connection.query<VolunteerConfirmationRow[]>(primaryQuery, [userEmail]);
      return rows;
    } catch (error: any) {
      if (error?.code === 'ER_NO_SUCH_TABLE') {
        const [rows] = await connection.query<VolunteerConfirmationRow[]>(fallbackQuery, [userEmail]);
        return rows;
      }
      throw error;
    }
  } finally {
    connection.release();
  }
}

export async function createVolunteerConfirmation(
  userEmail: string,
  opportunityId: number,
  organizationId: number,
  status: 'pendiente' | 'confirmado' | 'completado' | 'cancelado' = 'pendiente'
): Promise<number> {
  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO volunteer_confirmations (
      user_email, opportunity_id, organization_id, status
    ) VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      updated_at = CURRENT_TIMESTAMP`,
    [userEmail, opportunityId, organizationId, status],
  );

  return result.insertId;
}

export async function updateVolunteerConfirmation(
  id: number,
  updates: Partial<{
    status: 'pendiente' | 'confirmado' | 'completado' | 'cancelado';
    confirmed_at: string;
    completed_at: string;
    hours_worked: number;
    volunteer_rating: number;
    organization_feedback: string;
    volunteer_feedback: string;
  }>
): Promise<boolean> {
  const pool = getDbPool();

  const setParts: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      setParts.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (setParts.length === 0) return false;

  setParts.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE volunteer_confirmations SET ${setParts.join(', ')} WHERE id = ?`,
    values,
  );

  return result.affectedRows > 0;
}