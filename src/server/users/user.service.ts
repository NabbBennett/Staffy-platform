import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getDbPool } from '../db/mysql';
import {
  AuthUser,
  SignUpPayload,
  UpdateProfilePayload,
  UserBadge,
  UserProfile,
  UserRole,
  UserSkill,
  VolunteerHistoryItem,
} from './user.model';

interface UserRow extends RowDataPacket {
  id: number;
}

interface AuthUserRow extends RowDataPacket {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  password_hash: string;
}

interface UserProfileRow extends RowDataPacket {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  location: string | null;
  bio: string | null;
  photo_url: string | null;
  created_at: Date;
  updated_at: Date;
}

interface UserSkillRow extends RowDataPacket {
  id: number;
  skill_name: string;
  created_at: Date;
}

interface VolunteerHistoryRow extends RowDataPacket {
  id: number;
  title: string;
  organization: string;
  activity_date: Date | null;
  hours: number;
  status: 'completado' | 'proximo';
  created_at: Date;
}

interface UserBadgeRow extends RowDataPacket {
  id: number;
  badge_name: string;
  status: 'earned' | 'locked';
  created_at: Date;
}

async function ensureUserStatusOverridesTable(): Promise<void> {
  const pool = getDbPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_status_overrides (
      user_id INT UNSIGNED NOT NULL,
      status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function upsertUserStatusOverride(userId: number, status: string): Promise<void> {
  await ensureUserStatusOverridesTable();
  const pool = getDbPool();
  await pool.execute(
    `INSERT INTO user_status_overrides (user_id, status)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status)`,
    [userId, status],
  );
}

async function getUserStatusOverride(userId: number): Promise<'active' | 'inactive' | 'suspended' | null> {
  await ensureUserStatusOverridesTable();
  const pool = getDbPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT status FROM user_status_overrides WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  if (rows.length === 0) {
    return null;
  }
  const value = (rows[0] as any).status;
  if (value === 'active' || value === 'inactive' || value === 'suspended') {
    return value;
  }
  return null;
}

async function getStatusOverridesMap(userIds: number[]): Promise<Map<number, 'active' | 'inactive' | 'suspended'>> {
  const map = new Map<number, 'active' | 'inactive' | 'suspended'>();
  if (userIds.length === 0) {
    return map;
  }

  await ensureUserStatusOverridesTable();
  const pool = getDbPool();
  const placeholders = userIds.map(() => '?').join(',');
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id, status FROM user_status_overrides WHERE user_id IN (${placeholders})`,
    userIds,
  );

  for (const row of rows as any[]) {
    if (row.status === 'active' || row.status === 'inactive' || row.status === 'suspended') {
      map.set(Number(row.user_id), row.status);
    }
  }

  return map;
}

function normalizeUserStatus(row: any): 'active' | 'inactive' | 'suspended' {
  const raw = row?.status;
  if (raw === 'active' || raw === 'inactive' || raw === 'suspended') {
    return raw;
  }
  if (typeof row?.blocked !== 'undefined') {
    return Number(row.blocked) === 1 ? 'inactive' : 'active';
  }
  return 'active';
}

export async function findUserIdByEmail(email: string): Promise<number | null> {
  const pool = getDbPool();
  const [rows] = await pool.query<UserRow[]>(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [email],
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0].id;
}

export async function findAuthUserByEmail(email: string): Promise<AuthUser | null> {
  const pool = getDbPool();
  const [rows] = await pool.query<AuthUserRow[]>(
    `SELECT id, full_name, email, role, password_hash
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email],
  );

  if (rows.length === 0) {
    return null;
  }

  const user = rows[0];
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    passwordHash: user.password_hash,
  };
}

export async function createUser(
  payload: SignUpPayload & { passwordHash: string; role: UserRole },
): Promise<number> {
  const pool = getDbPool();
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO users (full_name, email, password_hash, role, status, blocked)
       VALUES (?, ?, ?, ?, 'active', 0)`,
      [payload.fullName, payload.email, payload.passwordHash, payload.role],
    );
    return result.insertId;
  } catch (err: any) {
    // If DB doesn't have status/blocked columns (legacy schema), fallback to simple insert
    if (err && err.code === 'ER_BAD_FIELD_ERROR') {
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO users (full_name, email, password_hash, role)
         VALUES (?, ?, ?, ?)`,
        [payload.fullName, payload.email, payload.passwordHash, payload.role],
      );
      return result.insertId;
    }
    throw err;
  }
}

export async function findUserProfileByEmail(email: string): Promise<UserProfile | null> {
  const pool = getDbPool();
  const [rows] = await pool.query<UserProfileRow[]>(
    `SELECT u.id, u.full_name, u.email, u.role,
            up.phone, up.location, up.bio, up.photo_url,
            u.created_at, u.updated_at
     FROM users u
     LEFT JOIN user_profiles up ON up.user_email = u.email
     WHERE u.email = ?
     LIMIT 1`,
    [email],
  );

  if (rows.length === 0) {
    return null;
  }

  const user = rows[0];
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    location: user.location,
    bio: user.bio,
    photoUrl: user.photo_url,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

export async function updateUserProfileByEmail(
  email: string,
  payload: UpdateProfilePayload,
): Promise<boolean> {
  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO user_profiles (user_email, phone, location, bio, photo_url)
     SELECT email, ?, ?, ?, ?
     FROM users
     WHERE email = ?
     ON DUPLICATE KEY UPDATE
       phone = VALUES(phone),
       location = VALUES(location),
       bio = VALUES(bio),
       photo_url = VALUES(photo_url)`,
    [payload.phone, payload.location, payload.bio, payload.photoUrl, email],
  );

  return result.affectedRows > 0;
}

export async function findUserSkillsByEmail(email: string): Promise<UserSkill[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<UserSkillRow[]>(
    `SELECT id, skill_name, created_at
     FROM user_skills
     WHERE user_email = ?
     ORDER BY created_at DESC`,
    [email],
  );

  return rows.map((row) => ({
    id: row.id,
    skillName: row.skill_name,
    createdAt: row.created_at,
  }));
}

export async function addUserSkillByEmail(email: string, skillName: string): Promise<boolean> {
  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO user_skills (user_email, skill_name)
     SELECT email, ?
     FROM users
     WHERE email = ?
     ON DUPLICATE KEY UPDATE skill_name = VALUES(skill_name)`,
    [skillName, email],
  );

  return result.affectedRows > 0;
}

export async function deleteUserSkillByEmail(email: string, skillName: string): Promise<boolean> {
  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM user_skills
     WHERE user_email = ? AND skill_name = ?`,
    [email, skillName],
  );

  return result.affectedRows > 0;
}

export async function findVolunteerHistoryByEmail(email: string): Promise<VolunteerHistoryItem[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<VolunteerHistoryRow[]>(
    `SELECT id, title, organization, activity_date, hours, status, created_at
     FROM volunteer_history
     WHERE user_email = ?
     ORDER BY activity_date DESC, created_at DESC`,
    [email],
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    organization: row.organization,
    date: row.activity_date
      ? new Date(row.activity_date).toLocaleDateString('es-ES')
      : '',
    hours: row.hours,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function findUserBadgesByEmail(email: string): Promise<UserBadge[]> {
  const pool = getDbPool();
  const [rows] = await pool.query<UserBadgeRow[]>(
    `SELECT id, badge_name, status, created_at
     FROM user_badges
     WHERE user_email = ?
     ORDER BY created_at DESC`,
    [email],
  );

  return rows.map((row) => ({
    id: row.id,
    badgeName: row.badge_name,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function findUserById(id: number): Promise<{ id: number; fullName: string; email: string; role: string } | null> {
  const pool = getDbPool();
  let rows: RowDataPacket[];
  try {
    const [fullRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, full_name, email, role, status, blocked, created_at FROM users WHERE id = ? LIMIT 1`,
      [id],
    );
    rows = fullRows;
  } catch (err: any) {
    if (err && err.code === 'ER_BAD_FIELD_ERROR') {
      try {
        const [blockedRows] = await pool.query<RowDataPacket[]>(
          `SELECT id, full_name, email, role, blocked, created_at FROM users WHERE id = ? LIMIT 1`,
          [id],
        );
        rows = blockedRows;
      } catch (innerErr: any) {
        if (innerErr && innerErr.code === 'ER_BAD_FIELD_ERROR') {
          const [legacyRows] = await pool.query<RowDataPacket[]>(
            `SELECT id, full_name, email, role, created_at FROM users WHERE id = ? LIMIT 1`,
            [id],
          );
          rows = legacyRows;
        } else {
          throw innerErr;
        }
      }
    } else {
      throw err;
    }
  }

  if ((rows as any).length === 0) return null;

  const r: any = (rows as any)[0];
  const normalizedStatus = normalizeUserStatus(r);
  const overrideStatus = await getUserStatusOverride(r.id);
  return {
    id: r.id,
    fullName: r.full_name,
    full_name: r.full_name,
    email: r.email,
    role: r.role,
    status: overrideStatus ?? normalizedStatus,
    blocked: r.blocked ?? 0,
    created_at: r.created_at,
    last_login: null,
  } as any;
}

export class UserService {
  async getAllUsers() {
    const pool = getDbPool();
    try {
      const [rows] = await pool.query<any[]>(
        `SELECT id, full_name, email, role, status, blocked, created_at FROM users ORDER BY created_at DESC`,
      );
      const overrides = await getStatusOverridesMap(rows.map((r) => Number(r.id)));
      return rows.map((r) => ({
        ...r,
        status: overrides.get(Number(r.id)) ?? normalizeUserStatus(r),
        last_login: r.last_login ?? null,
      }));
    } catch (err: any) {
      if (err && err.code === 'ER_BAD_FIELD_ERROR') {
        try {
          const [blockedRows] = await pool.query<any[]>(
            `SELECT id, full_name, email, role, blocked, created_at FROM users ORDER BY created_at DESC`,
          );
          const overrides = await getStatusOverridesMap(blockedRows.map((r) => Number(r.id)));
          return blockedRows.map((r) => ({
            ...r,
            status: overrides.get(Number(r.id)) ?? normalizeUserStatus(r),
            last_login: null,
          }));
        } catch (innerErr: any) {
          if (innerErr && innerErr.code === 'ER_BAD_FIELD_ERROR') {
            const [legacyRows] = await pool.query<any[]>(
              `SELECT id, full_name, email, role, created_at FROM users ORDER BY created_at DESC`,
            );
            const overrides = await getStatusOverridesMap(legacyRows.map((r) => Number(r.id)));
            return legacyRows.map((r) => ({
              ...r,
              status: overrides.get(Number(r.id)) ?? 'active',
              blocked: 0,
              last_login: null,
            }));
          }
          throw innerErr;
        }
      }
      throw err;
    }
  }

  async updateUserRole(userId: number, role: string): Promise<boolean> {
    const pool = getDbPool();
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE users SET role = ? WHERE id = ?`,
      [role, userId],
    );
    return result.affectedRows > 0;
  }

  async updateUserStatus(userId: number, status: string): Promise<boolean> {
    const pool = getDbPool();
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE users SET status = ? WHERE id = ?`,
        [status, userId],
      );
      return result.affectedRows > 0;
    } catch (err: any) {
      const isBadField = err && err.code === 'ER_BAD_FIELD_ERROR';
      const isEnumError = err && (err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' || err.code === 'WARN_DATA_TRUNCATED');

      if (isEnumError && status === 'suspended') {
        // For schemas that only allow active/inactive, map suspended -> inactive.
        const [result] = await pool.execute<ResultSetHeader>(
          `UPDATE users SET status = 'inactive' WHERE id = ?`,
          [userId],
        );
        return result.affectedRows > 0;
      }

      if (isBadField || isEnumError) {
        try {
          const blocked = status === 'active' ? 0 : 1;
          const [legacyResult] = await pool.execute<ResultSetHeader>(
            `UPDATE users SET blocked = ? WHERE id = ?`,
            [blocked, userId],
          );
          return legacyResult.affectedRows > 0;
        } catch (innerErr: any) {
          if (innerErr && innerErr.code === 'ER_BAD_FIELD_ERROR') {
            await upsertUserStatusOverride(userId, status);
            return true;
          }
          throw innerErr;
        }
      }
      throw err;
    }
  }

  async updateUserBlocked(userId: number, blocked: boolean): Promise<boolean> {
    const pool = getDbPool();
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE users SET blocked = ? WHERE id = ?`,
        [blocked ? 1 : 0, userId],
      );
      return result.affectedRows > 0;
    } catch (err: any) {
      if (err && err.code === 'ER_BAD_FIELD_ERROR') {
        return true;
      }
      throw err;
    }
  }
}
