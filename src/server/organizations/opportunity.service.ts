import { getDbPool } from '../db/mysql';
import * as fs from 'fs';
import * as path from 'path';

export interface Opportunity {
  id: number;
  organization_id: number;
  title: string;
  category: string;
  image_url?: string;
  opportunity_date: string;
  time_and_duration: string;
  location: string;
  availability_text: string;
  registered: number;
  total_spots: number;
  about: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOpportunityPayload {
  title: string;
  category: string;
  opportunity_date: string;
  time_and_duration: string;
  location: string;
  availability_text: string;
  total_spots: number;
  about: string;
  requirements?: string[];
  responsibilities?: string[];
  skills?: string[];
}

export interface UpdateOpportunityPayload extends CreateOpportunityPayload {
  imageUrl?: string | null;
}

function getNormalizedImageExtension(file: Express.Multer.File): string {
  const originalExtension = path.extname(file.originalname).toLowerCase();
  const mimeExtensionMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/pjpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/bmp': '.bmp',
    'image/tiff': '.tiff',
    'image/x-icon': '.ico',
  };

  if (originalExtension === '.jfif') {
    return '.jpg';
  }

  if (mimeExtensionMap[file.mimetype]) {
    return mimeExtensionMap[file.mimetype];
  }

  return originalExtension || '.jpg';
}

export async function findOrganizationOpportunities(organizationId: number): Promise<Opportunity[]> {
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    const query = `
      SELECT
        id,
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
        about,
        created_at,
        updated_at
      FROM opportunities
      WHERE organization_id = ?
      ORDER BY created_at DESC
    `;

    const [rows] = await connection.query(query, [organizationId]) as [Opportunity[], any];
    return rows || [];
  } finally {
    connection.release();
  }
}

export async function createOrganizationOpportunity(
  organizationId: number,
  payload: CreateOpportunityPayload,
  file?: Express.Multer.File
): Promise<Opportunity | null> {
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    console.log('[createOrganizationOpportunity] starting', {
      organizationId,
      title: payload.title,
      category: payload.category,
      total_spots: payload.total_spots,
      requirementsCount: payload.requirements?.length ?? 0,
      responsibilitiesCount: payload.responsibilities?.length ?? 0,
      skillsCount: payload.skills?.length ?? 0,
      hasFile: Boolean(file),
    });

    let imageUrl = '';

    if (file) {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'opportunities');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const fileExtension = getNormalizedImageExtension(file);
      const fileName = `opportunity_${organizationId}_${Date.now()}${fileExtension}`;
      const filePath = path.join(uploadsDir, fileName);

      // Move file to uploads directory
      fs.writeFileSync(filePath, file.buffer);

      // Set image URL relative to public directory
      imageUrl = `/uploads/opportunities/${fileName}`;
    }

    const query = `
      INSERT INTO opportunities (
        organization_id,
        title,
        category,
        image_url,
        opportunity_date,
        time_and_duration,
        location,
        availability_text,
        total_spots,
        about
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await connection.query(query, [
      organizationId,
      payload.title,
      payload.category,
      imageUrl,
      payload.opportunity_date,
      payload.time_and_duration,
      payload.location,
      payload.availability_text,
      payload.total_spots,
      payload.about
    ]);

    console.log('[createOrganizationOpportunity] main insert result', result);

    if ('insertId' in result && result.insertId) {

      const opportunityId = Number(result.insertId);

      const requirementValues = (payload.requirements ?? [])
        .map((item) => item.trim())
        .filter(Boolean);
      const responsibilityValues = (payload.responsibilities ?? [])
        .map((item) => item.trim())
        .filter(Boolean);
      const skillValues = (payload.skills ?? [])
        .map((item) => item.trim())
        .filter(Boolean);

      console.log('[createOrganizationOpportunity] related rows to insert', {
        opportunityId,
        requirementValues,
        responsibilityValues,
        skillValues,
      });

      for (const requirement of requirementValues) {
        console.log('[createOrganizationOpportunity] inserting requirement', requirement);
        await connection.query(
          `INSERT IGNORE INTO opportunity_requirements (opportunity_id, requirement_text) VALUES (?, ?)`,
          [opportunityId, requirement],
        );
      }

      for (const responsibility of responsibilityValues) {
        console.log('[createOrganizationOpportunity] inserting responsibility', responsibility);
        await connection.query(
          `INSERT IGNORE INTO opportunity_responsibilities (opportunity_id, responsibility_text) VALUES (?, ?)`,
          [opportunityId, responsibility],
        );
      }

      for (const skill of skillValues) {
        console.log('[createOrganizationOpportunity] inserting skill tag', skill);
        await connection.query(
          `INSERT IGNORE INTO opportunity_tags (opportunity_id, tag_name) VALUES (?, ?)`,
          [opportunityId, skill],
        );
      }

      console.log('[createOrganizationOpportunity] fetching created opportunity');

      const opportunities = await findOrganizationOpportunities(organizationId);
      const created = opportunities.find(opp => opp.id === opportunityId) || null;

      console.log('[createOrganizationOpportunity] created opportunity fetched', created);
      return created;
    }

    console.log('[createOrganizationOpportunity] insert did not return insertId');
    return null;
  } finally {
    console.log('[createOrganizationOpportunity] releasing connection');
    connection.release();
  }
}

export async function deleteOrganizationOpportunity(organizationId: number, opportunityId: number): Promise<boolean> {
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    const query = `
      DELETE FROM opportunities
      WHERE id = ? AND organization_id = ?
    `;

    const [result] = await connection.query(query, [opportunityId, organizationId]);
    return 'affectedRows' in result && result.affectedRows > 0;
  } finally {
    connection.release();
  }
}

export async function findOpportunityById(opportunityId: number): Promise<Opportunity | null> {
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    const query = `
      SELECT
        id,
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
        about,
        created_at,
        updated_at
      FROM opportunities
      WHERE id = ?
    `;

    const [rows] = await connection.query(query, [opportunityId]) as [Opportunity[], any];
    return rows && rows.length > 0 ? rows[0] : null;
  } finally {
    connection.release();
  }
}

export async function updateOrganizationOpportunity(
  organizationId: number,
  opportunityId: number,
  payload: CreateOpportunityPayload,
  file?: Express.Multer.File,
): Promise<Opportunity | null> {
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    console.log('[updateOrganizationOpportunity] starting', {
      organizationId,
      opportunityId,
      title: payload.title,
      category: payload.category,
      total_spots: payload.total_spots,
      requirementsCount: payload.requirements?.length ?? 0,
      responsibilitiesCount: payload.responsibilities?.length ?? 0,
      skillsCount: payload.skills?.length ?? 0,
      hasFile: Boolean(file),
    });

    const existing = await findOrganizationOpportunities(organizationId);
    const current = existing.find((item) => item.id === opportunityId);

    if (!current) {
      console.log('[updateOrganizationOpportunity] opportunity not found');
      return null;
    }

    let imageUrl = current.image_url;

    if (file) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'opportunities');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileExtension = getNormalizedImageExtension(file);
      const fileName = `opportunity_${organizationId}_${Date.now()}${fileExtension}`;
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, file.buffer);
      imageUrl = `/uploads/opportunities/${fileName}`;
    }

    const updateQuery = `
      UPDATE opportunities
      SET title = ?,
          category = ?,
          image_url = ?,
          opportunity_date = ?,
          time_and_duration = ?,
          location = ?,
          availability_text = ?,
          total_spots = ?,
          about = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND organization_id = ?
    `;

    const [result] = await connection.query(updateQuery, [
      payload.title,
      payload.category,
      imageUrl,
      payload.opportunity_date,
      payload.time_and_duration,
      payload.location,
      payload.availability_text,
      payload.total_spots,
      payload.about,
      opportunityId,
      organizationId,
    ]);

    console.log('[updateOrganizationOpportunity] main update result', result);

    await connection.query(`DELETE FROM opportunity_requirements WHERE opportunity_id = ?`, [opportunityId]);
    await connection.query(`DELETE FROM opportunity_responsibilities WHERE opportunity_id = ?`, [opportunityId]);
    await connection.query(`DELETE FROM opportunity_tags WHERE opportunity_id = ?`, [opportunityId]);

    const requirementValues = (payload.requirements ?? []).map((item) => item.trim()).filter(Boolean);
    const responsibilityValues = (payload.responsibilities ?? []).map((item) => item.trim()).filter(Boolean);
    const skillValues = (payload.skills ?? []).map((item) => item.trim()).filter(Boolean);

    console.log('[updateOrganizationOpportunity] reinserting related rows', {
      requirementValues,
      responsibilityValues,
      skillValues,
    });

    for (const requirement of requirementValues) {
      await connection.query(
        `INSERT IGNORE INTO opportunity_requirements (opportunity_id, requirement_text) VALUES (?, ?)`,
        [opportunityId, requirement],
      );
    }

    for (const responsibility of responsibilityValues) {
      await connection.query(
        `INSERT IGNORE INTO opportunity_responsibilities (opportunity_id, responsibility_text) VALUES (?, ?)`,
        [opportunityId, responsibility],
      );
    }

    for (const skill of skillValues) {
      await connection.query(
        `INSERT IGNORE INTO opportunity_tags (opportunity_id, tag_name) VALUES (?, ?)`,
        [opportunityId, skill],
      );
    }

    const opportunities = await findOrganizationOpportunities(organizationId);
    const updated = opportunities.find((item) => item.id === opportunityId) || null;
    console.log('[updateOrganizationOpportunity] updated opportunity fetched', updated);
    return updated;
  } finally {
    console.log('[updateOrganizationOpportunity] releasing connection');
    connection.release();
  }
}