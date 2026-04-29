import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getDbPool } from '../db/mysql';
import {
  Organization,
  OrganizationFilters,
  OrganizationProfile,
  UpdateOrganizationProfilePayload,
} from './organization.model';

interface OrganizationRow extends RowDataPacket {
  id: number;
  initials: string;
  name: string;
  category: string;
  description: string;
  location: string;
  opportunities_count: number;
  volunteers_count: number;
  rating: string | number;
  verified?: number;
  email: string;
  phone: string;
  website: string;
  created_at?: Date;
}

interface OrganizationProfileRow extends RowDataPacket {
  id: number;
  initials: string;
  name: string;
  category: string;
  description: string;
  location: string;
  opportunities_count: number;
  volunteers_count: number;
  rating: string | number;
  verified?: number;
  email_notifications: number;
  public_profile: number;
  auto_approve_applications: number;
  show_volunteer_count: number;
  email: string;
  phone: string;
  website: string;
  created_at: Date;
  updated_at: Date;
}

interface UserAccountRow extends RowDataPacket {
  full_name: string;
  email: string;
  role: string;
}

interface OrganizationOverrideRow extends RowDataPacket {
  organization_id: number;
  verified: number | null;
  status: 'active' | 'inactive' | 'pending' | null;
}

function deriveOrganizationStatus(row: any): 'active' | 'inactive' | 'pending' {
  if (row?.status === 'active' || row?.status === 'inactive' || row?.status === 'pending') {
    return row.status;
  }
  return (row?.verified ?? 0) === 1 ? 'active' : 'pending';
}

async function ensureOrganizationOverridesTable(): Promise<void> {
  const pool = getDbPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS organization_admin_overrides (
      organization_id INT UNSIGNED NOT NULL,
      verified TINYINT(1) NULL,
      status ENUM('active', 'inactive', 'pending') NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (organization_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function upsertOrganizationOverride(
  organizationId: number,
  patch: { verified?: boolean; status?: 'active' | 'inactive' | 'pending' },
): Promise<void> {
  await ensureOrganizationOverridesTable();
  const pool = getDbPool();
  await pool.execute(
    `INSERT INTO organization_admin_overrides (organization_id, verified, status)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       verified = COALESCE(VALUES(verified), verified),
       status = COALESCE(VALUES(status), status)`,
    [organizationId, typeof patch.verified === 'undefined' ? null : (patch.verified ? 1 : 0), patch.status ?? null],
  );
}

async function getOrganizationOverridesMap(
  organizationIds: number[],
): Promise<Map<number, { verified?: boolean; status?: 'active' | 'inactive' | 'pending' }>> {
  const map = new Map<number, { verified?: boolean; status?: 'active' | 'inactive' | 'pending' }>();
  if (organizationIds.length === 0) {
    return map;
  }

  await ensureOrganizationOverridesTable();
  const pool = getDbPool();
  const placeholders = organizationIds.map(() => '?').join(',');
  const [rows] = await pool.query<OrganizationOverrideRow[]>(
    `SELECT organization_id, verified, status
     FROM organization_admin_overrides
     WHERE organization_id IN (${placeholders})`,
    organizationIds,
  );

  for (const row of rows) {
    map.set(row.organization_id, {
      verified: row.verified === null ? undefined : row.verified === 1,
      status: row.status ?? undefined,
    });
  }

  return map;
}

function mapOrganization(row: OrganizationRow): Organization {
  const verified = (row.verified ?? 0) === 1;
  return {
    id: row.id,
    initials: row.initials,
    name: row.name,
    category: row.category,
    description: row.description,
    location: row.location,
    opportunities: row.opportunities_count,
    volunteers: row.volunteers_count,
    rating: Number(row.rating),
    verified,
    status: deriveOrganizationStatus({ ...row, verified }),
    email: row.email,
    phone: row.phone,
    website: row.website,
    created_at: row.created_at,
  };
}

function mapOrganizationProfile(row: OrganizationProfileRow): OrganizationProfile {
  return {
    id: row.id,
    initials: row.initials,
    name: row.name,
    category: row.category,
    description: row.description,
    location: row.location,
    opportunities: row.opportunities_count,
    volunteers: row.volunteers_count,
    rating: Number(row.rating),
    verified: (row.verified ?? 0) === 1,
    status: deriveOrganizationStatus(row),
    emailNotifications: row.email_notifications === 1,
    publicProfile: row.public_profile === 1,
    autoApproveApplications: row.auto_approve_applications === 1,
    showVolunteerCount: row.show_volunteer_count === 1,
    email: row.email,
    phone: row.phone,
    website: row.website,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getInitials(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (words.length === 0) {
    return 'OR';
  }

  return words.map((word) => word.charAt(0).toUpperCase()).join('');
}

async function findUserAccountByEmail(email: string): Promise<UserAccountRow | null> {
  const pool = getDbPool();
  const [rows] = await pool.query<UserAccountRow[]>(
    `SELECT full_name, email, role
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email],
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

async function createOrganizationProfileFromUser(email: string): Promise<boolean> {
  const user = await findUserAccountByEmail(email);
  const name = user?.full_name?.trim() || `Organización ${email.split('@')[0]}`;
  const initials = getInitials(name);
  const category = 'Community Service';
  const description = 'Completa la información de tu organización desde el perfil.';
  const location = 'Por definir';
  const phone = 'Por definir';
  const website = 'Por definir';

  const pool = getDbPool();
  try {
    await pool.execute<ResultSetHeader>(
      `INSERT INTO organizations (
        initials, name, category, description, location,
        opportunities_count, volunteers_count, rating, verified,
        email_notifications, public_profile, auto_approve_applications, show_volunteer_count,
        email, phone, website
       ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 1, 1, 0, 1, ?, ?, ?)` ,
      [initials, name, category, description, location, email, phone, website],
    );
  } catch (err: any) {
    if (err && err.code === 'ER_BAD_FIELD_ERROR') {
      await pool.execute<ResultSetHeader>(
        `INSERT INTO organizations (
          initials, name, category, description, location,
          opportunities_count, volunteers_count, rating,
          email, phone, website
         ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?)` ,
        [initials, name, category, description, location, email, phone, website],
      );
    } else {
      throw err;
    }
  }

  return true;
}

export async function ensureOrganizationProfileByEmail(email: string): Promise<OrganizationProfile | null> {
  const existingProfile = await findOrganizationProfileByEmail(email);

  if (existingProfile) {
    return existingProfile;
  }

  const created = await createOrganizationProfileFromUser(email);

  if (!created) {
    return null;
  }

  return findOrganizationProfileByEmail(email);
}

export async function findOrganizations(filters: OrganizationFilters): Promise<Organization[]> {
  const pool = getDbPool();
  const values: Array<string> = [];
  const whereClauses: string[] = [];

  if (filters.search) {
    whereClauses.push('(name LIKE ? OR description LIKE ? OR location LIKE ?)');
    const search = `%${filters.search}%`;
    values.push(search, search, search);
  }

  if (filters.category) {
    whereClauses.push('category = ?');
    values.push(filters.category);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  try {
    const [rows] = await pool.query<OrganizationRow[]>(
      `SELECT o.id, o.initials, o.name, o.category, o.description, o.location,
              o.opportunities_count, o.volunteers_count, o.rating, o.verified,
              o.email, o.phone, o.website, o.created_at
       FROM organizations o
       INNER JOIN users u ON u.email = o.email AND u.role = 'empresa'
       ${whereSql}
       ORDER BY o.verified DESC, o.rating DESC, o.name ASC`,
      values,
    );
    const base = rows.map(mapOrganization);
    const overrides = await getOrganizationOverridesMap(base.map((o) => o.id));
    return base.map((org) => {
      const ov = overrides.get(org.id);
      return {
        ...org,
        verified: typeof ov?.verified === 'undefined' ? org.verified : ov.verified,
        status: ov?.status ?? org.status,
      };
    });
  } catch (err: any) {
    if (err && err.code === 'ER_BAD_FIELD_ERROR') {
      const [rows] = await pool.query<OrganizationRow[]>(
        `SELECT o.id, o.initials, o.name, o.category, o.description, o.location,
                o.opportunities_count, o.volunteers_count, o.rating,
                o.email, o.phone, o.website, o.created_at
         FROM organizations o
         INNER JOIN users u ON u.email = o.email AND u.role = 'empresa'
         ${whereSql}
         ORDER BY o.rating DESC, o.name ASC`,
        values,
      );
      const base = rows.map(mapOrganization);
      const overrides = await getOrganizationOverridesMap(base.map((o) => o.id));
      return base.map((org) => {
        const ov = overrides.get(org.id);
        return {
          ...org,
          verified: typeof ov?.verified === 'undefined' ? org.verified : ov.verified,
          status: ov?.status ?? org.status,
        };
      });
    }
    throw err;
  }
}

export async function findOrganizationById(id: number): Promise<Organization | null> {
  const pool = getDbPool();
  let rows: OrganizationRow[] = [];
  try {
    const [fullRows] = await pool.query<OrganizationRow[]>(
      `SELECT id, initials, name, category, description, location,
              opportunities_count, volunteers_count, rating, verified,
              email, phone, website
       FROM organizations
       WHERE id = ?
       LIMIT 1`,
      [id],
    );
    rows = fullRows;
  } catch (err: any) {
    if (err && err.code === 'ER_BAD_FIELD_ERROR') {
      const [legacyRows] = await pool.query<OrganizationRow[]>(
        `SELECT id, initials, name, category, description, location,
                opportunities_count, volunteers_count, rating,
                email, phone, website
         FROM organizations
         WHERE id = ?
         LIMIT 1`,
        [id],
      );
      rows = legacyRows;
    } else {
      throw err;
    }
  }

  if (rows.length === 0) {
    return null;
  }

  const org = mapOrganization(rows[0]);
  const overrides = await getOrganizationOverridesMap([org.id]);
  const ov = overrides.get(org.id);
  return {
    ...org,
    verified: typeof ov?.verified === 'undefined' ? org.verified : ov.verified,
    status: ov?.status ?? org.status,
  };
}

export async function findOrganizationProfileByEmail(
  email: string,
): Promise<OrganizationProfile | null> {
  const pool = getDbPool();
  let rows: OrganizationProfileRow[] = [];
  try {
    const [fullRows] = await pool.query<OrganizationProfileRow[]>(
      `SELECT id, initials, name, category, description, location,
              opportunities_count, volunteers_count, rating, verified,
              email_notifications, public_profile, auto_approve_applications, show_volunteer_count,
              email, phone, website, created_at, updated_at
       FROM organizations
       WHERE email = ?
       LIMIT 1`,
      [email],
    );
    rows = fullRows;
  } catch (err: any) {
    if (err && err.code === 'ER_BAD_FIELD_ERROR') {
      const [legacyRows] = await pool.query<OrganizationProfileRow[]>(
        `SELECT id, initials, name, category, description, location,
                opportunities_count, volunteers_count, rating,
                email, phone, website, created_at, updated_at
         FROM organizations
         WHERE email = ?
         LIMIT 1`,
        [email],
      );
      rows = legacyRows.map((r: any) => ({
        ...r,
        verified: 1,
        email_notifications: 1,
        public_profile: 1,
        auto_approve_applications: 0,
        show_volunteer_count: 1,
      }));
    } else {
      throw err;
    }
  }

  if (rows.length === 0) {
    return null;
  }

  return mapOrganizationProfile(rows[0]);
}

export async function updateOrganizationProfileByEmail(
  email: string,
  payload: UpdateOrganizationProfilePayload,
): Promise<boolean> {
  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE organizations
     SET initials = ?,
         name = ?,
         category = ?,
         description = ?,
         location = ?,
         phone = ?,
         website = ?,
         email_notifications = ?,
         public_profile = ?,
         auto_approve_applications = ?,
         show_volunteer_count = ?
     WHERE email = ?`,
    [
      payload.initials,
      payload.name,
      payload.category,
      payload.description,
      payload.location,
      payload.phone,
      payload.website,
      payload.emailNotifications ? 1 : 0,
      payload.publicProfile ? 1 : 0,
      payload.autoApproveApplications ? 1 : 0,
      payload.showVolunteerCount ? 1 : 0,
      email,
    ],
  );

  return result.affectedRows > 0;
}
export class OrganizationService {
  async getAllOrganizations() {
    const pool = getDbPool();
    try {
      const [rows] = await pool.query<any[]>(
        `SELECT id, name, category, email, phone, website, verified, created_at FROM organizations ORDER BY created_at DESC`,
      );
      return rows;
    } catch (err: any) {
      if (err && err.code === 'ER_BAD_FIELD_ERROR') {
        const [legacyRows] = await pool.query<any[]>(
          `SELECT id, name, category, email, phone, website, created_at FROM organizations ORDER BY created_at DESC`,
        );
        return legacyRows.map((r) => ({ ...r, verified: 1 }));
      }
      throw err;
    }
  }

  async updateVerificationStatus(organizationId: number, verified: boolean): Promise<boolean> {
    const pool = getDbPool();
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE organizations SET verified = ? WHERE id = ?`,
        [verified ? 1 : 0, organizationId],
      );
      await upsertOrganizationOverride(organizationId, {
        verified,
        status: verified ? 'active' : 'pending',
      });
      return result.affectedRows > 0;
    } catch (err: any) {
      if (err && err.code === 'ER_BAD_FIELD_ERROR') {
        await upsertOrganizationOverride(organizationId, {
          verified,
          status: verified ? 'active' : 'pending',
        });
        return true;
      }
      throw err;
    }
  }

  async updateOrganizationStatus(
    organizationId: number,
    status: 'active' | 'inactive' | 'pending',
  ): Promise<boolean> {
    const pool = getDbPool();
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE organizations SET status = ? WHERE id = ?`,
        [status, organizationId],
      );
      await upsertOrganizationOverride(organizationId, {
        status,
        verified: status === 'active',
      });
      return result.affectedRows > 0;
    } catch (err: any) {
      if (err && err.code === 'ER_BAD_FIELD_ERROR') {
        await upsertOrganizationOverride(organizationId, {
          status,
          verified: status === 'active',
        });
        return true;
      }
      throw err;
    }
  }
}
