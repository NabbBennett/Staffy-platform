import { Router } from 'express';
import multer from 'multer';
import {
  ensureOrganizationProfileByEmail,
  findOrganizationById,
  findOrganizations,
  updateOrganizationProfileByEmail,
} from './organization.service';
import {
  findOrganizationVolunteers,
  findOrganizationApplications,
  updateOrganizationApplicationStatus,
  findDashboardStats,
  findRecentOpportunities,
  markVolunteerCompleted,
  rateOrganizationVolunteer,
  setVolunteerStatus,
} from './volunteer.service';
import {
  findOrganizationOpportunities,
  createOrganizationOpportunity,
  updateOrganizationOpportunity,
  deleteOrganizationOpportunity,
  CreateOpportunityPayload,
} from './opportunity.service';

const organizationRouter = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function toNormalizedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 1 || value === '1' || value === 'true') {
    return true;
  }

  if (value === 0 || value === '0' || value === 'false') {
    return false;
  }

  return fallback;
}

function normalizeProfilePayload(rawBody: unknown):
  | {
      email: string;
      profile: {
        initials: string;
        name: string;
        category: string;
        description: string;
        location: string;
        phone: string;
        website: string;
        emailNotifications: boolean;
        publicProfile: boolean;
        autoApproveApplications: boolean;
        showVolunteerCount: boolean;
      };
    }
  | null {
  if (!rawBody || typeof rawBody !== 'object') {
    return null;
  }

  const body = rawBody as Record<string, unknown>;
  const email = typeof body['email'] === 'string' ? body['email'].trim().toLowerCase() : '';

  if (!email || !isValidEmail(email)) {
    return null;
  }

  const initials = toNormalizedString(body['initials'], 12) ?? '';
  const name = toNormalizedString(body['name'], 160) ?? '';
  const category = toNormalizedString(body['category'], 120) ?? '';
  const description = toNormalizedString(body['description'], 4000) ?? '';
  const location = toNormalizedString(body['location'], 180) ?? '';
  const phone = toNormalizedString(body['phone'], 60) ?? '';
  const website = toNormalizedString(body['website'], 255) ?? '';

  if (!initials || !name || !category || !description || !location || !phone || !website) {
    return null;
  }

  return {
    email,
    profile: {
      initials,
      name,
      category,
      description,
      location,
      phone,
      website,
      emailNotifications: toBoolean(body['emailNotifications'], true),
      publicProfile: toBoolean(body['publicProfile'], true),
      autoApproveApplications: toBoolean(body['autoApproveApplications'], false),
      showVolunteerCount: toBoolean(body['showVolunteerCount'], true),
    },
  };
}

function normalizeOpportunityPayload(rawBody: unknown): CreateOpportunityPayload | null {
  if (!rawBody || typeof rawBody !== 'object') {
    return null;
  }

  const body = rawBody as Record<string, unknown>;
  const title = toNormalizedString(body['title'], 180);
  const category = toNormalizedString(body['category'], 120);
  const opportunity_date = toNormalizedString(body['opportunity_date'], 100);
  const time_and_duration = toNormalizedString(body['time_and_duration'], 120);
  const location = toNormalizedString(body['location'], 255);
  const availability_text = toNormalizedString(body['availability_text'], 120);
  const about = toNormalizedString(body['about'], 4000);
	const requirements = parseStringArray(body['requirements']);
	const responsibilities = parseStringArray(body['responsibilities']);
	const skills = parseStringArray(body['skills']);

  const total_spots = typeof body['total_spots'] === 'number' && body['total_spots'] > 0
    ? body['total_spots']
    : typeof body['total_spots'] === 'string'
      ? parseInt(body['total_spots'], 10)
      : null;

  if (!title || !category || !opportunity_date || !time_and_duration || !location || !availability_text || !about || total_spots === null) {
    return null;
  }

  return {
    title,
    category,
    opportunity_date,
    time_and_duration,
    location,
    availability_text,
    total_spots,
    about,
	  requirements,
	  responsibilities,
	  skills,
  };
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value !== 'string') {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  } catch {
    // fallback below
  }

  return trimmed
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

organizationRouter.get('/', async (request, response) => {
  try {
    const search = typeof request.query['search'] === 'string'
      ? request.query['search'].trim()
      : '';
    const category = typeof request.query['category'] === 'string'
      ? request.query['category'].trim()
      : '';

    const organizations = await findOrganizations({
      search: search || undefined,
      category: category && category !== 'All Categories' ? category : undefined,
    });

    response.status(200).json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    response.status(500).json({ message: 'Error interno al obtener organizaciones.' });
  }
});

organizationRouter.get('/profile', async (request, response) => {
  try {
    const email = typeof request.query['email'] === 'string'
      ? request.query['email'].trim().toLowerCase()
      : '';

    if (!email || !isValidEmail(email)) {
      response.status(400).json({ message: 'Correo inválido.' });
      return;
    }

    const profile = await ensureOrganizationProfileByEmail(email);

    if (!profile) {
      response.status(404).json({ message: 'Organización no encontrada.' });
      return;
    }

    response.status(200).json(profile);
  } catch (error) {
    console.error('Error fetching organization profile:', error);
    response.status(500).json({ message: 'Error interno al obtener perfil.' });
  }
});

organizationRouter.put('/profile', async (request, response) => {
  try {
    const normalized = normalizeProfilePayload(request.body);

    if (!normalized) {
      response.status(400).json({ message: 'Datos de perfil inválidos.' });
      return;
    }

    await ensureOrganizationProfileByEmail(normalized.email);
    const wasUpdated = await updateOrganizationProfileByEmail(normalized.email, normalized.profile);

    if (!wasUpdated) {
      response.status(404).json({ message: 'Organización no encontrada.' });
      return;
    }

    const updatedProfile = await ensureOrganizationProfileByEmail(normalized.email);

    if (!updatedProfile) {
      response.status(404).json({ message: 'Organización no encontrada.' });
      return;
    }

    response.status(200).json(updatedProfile);
  } catch (error) {
    console.error('Error updating organization profile:', error);
    response.status(500).json({ message: 'Error interno al actualizar perfil.' });
  }
});

organizationRouter.get('/:id', async (request, response) => {
  try {
    const organizationId = Number(request.params['id']);

    if (!Number.isInteger(organizationId) || organizationId <= 0) {
      response.status(400).json({ message: 'Id de organizacion invalido.' });
      return;
    }

    const organization = await findOrganizationById(organizationId);

    if (!organization) {
      response.status(404).json({ message: 'Organizacion no encontrada.' });
      return;
    }

    response.status(200).json(organization);
  } catch (error) {
    console.error('Error fetching organization detail:', error);
    response.status(500).json({ message: 'Error interno al obtener organizacion.' });
  }
});

organizationRouter.get('/:id/volunteers', async (request, response) => {
  try {
    const organizationId = Number(request.params['id']);

    if (!Number.isInteger(organizationId) || organizationId <= 0) {
      response.status(400).json({ message: 'Id de organizacion invalido.' });
      return;
    }

    const volunteers = await findOrganizationVolunteers(organizationId);
    response.status(200).json(volunteers);
  } catch (error) {
    console.error('Error fetching organization volunteers:', error);
    response.status(500).json({ message: 'Error interno al obtener voluntarios.' });
  }
});

// Mark volunteer as completed for an organization
organizationRouter.post('/:id/volunteers/:volunteerId/complete', async (request, response) => {
  try {
    const organizationId = Number(request.params['id']);
    const volunteerId = Number(request.params['volunteerId']);

    if (!Number.isInteger(organizationId) || organizationId <= 0 || !Number.isInteger(volunteerId) || volunteerId <= 0) {
      response.status(400).json({ message: 'Id de organizacion o voluntario invalido.' });
      return;
    }

    const updated = await markVolunteerCompleted(organizationId, volunteerId);

    if (!updated) {
      response.status(404).json({ message: 'Voluntario no encontrado para esta organizacion.' });
      return;
    }

    response.status(200).json({ message: 'Voluntario marcado como completado.' });
  } catch (error) {
    console.error('Error marking volunteer completed:', error);
    response.status(500).json({ message: 'Error interno al marcar completado.' });
  }
});

// Rate a volunteer
organizationRouter.post('/:id/volunteers/:volunteerId/rate', async (request, response) => {
  try {
    const organizationId = Number(request.params['id']);
    const volunteerId = Number(request.params['volunteerId']);
    const rating = typeof request.body['rating'] === 'number' ? request.body['rating'] : Number(request.body['rating']);

    if (!Number.isInteger(organizationId) || organizationId <= 0 || !Number.isInteger(volunteerId) || volunteerId <= 0) {
      response.status(400).json({ message: 'Id de organizacion o voluntario invalido.' });
      return;
    }

    if (typeof rating !== 'number' || isNaN(rating) || rating < 0 || rating > 5) {
      response.status(400).json({ message: 'Calificación inválida. Debe ser número entre 0 y 5.' });
      return;
    }

    const updated = await rateOrganizationVolunteer(organizationId, volunteerId, rating);

    if (!updated) {
      response.status(404).json({ message: 'Voluntario no encontrado para esta organizacion.' });
      return;
    }

    response.status(200).json({ message: 'Voluntario calificado correctamente.' });
  } catch (error) {
    console.error('Error rating volunteer:', error);
    response.status(500).json({ message: 'Error interno al calificar voluntario.' });
  }
});

// Set volunteer status (accept/activate or set to inactive/new)
organizationRouter.post('/:id/volunteers/:volunteerId/status', async (request, response) => {
  try {
    const organizationId = Number(request.params['id']);
    const volunteerId = Number(request.params['volunteerId']);
    const statusRaw = typeof request.body['status'] === 'string' ? request.body['status'].trim().toLowerCase() : '';

    if (!Number.isInteger(organizationId) || organizationId <= 0 || !Number.isInteger(volunteerId) || volunteerId <= 0) {
      response.status(400).json({ message: 'Id de organizacion o voluntario invalido.' });
      return;
    }

    if (!['active', 'new', 'inactive'].includes(statusRaw)) {
      response.status(400).json({ message: 'Estado inválido.' });
      return;
    }

    const updated = await setVolunteerStatus(organizationId, volunteerId, statusRaw as 'active' | 'new' | 'inactive');

    if (!updated) {
      response.status(404).json({ message: 'Voluntario no encontrado para esta organizacion.' });
      return;
    }

    response.status(200).json({ message: 'Estado de voluntario actualizado.' });
  } catch (error) {
    console.error('Error updating volunteer status:', error);
    response.status(500).json({ message: 'Error interno al actualizar estado del voluntario.' });
  }
});

organizationRouter.get('/:id/applications', async (request, response) => {
  try {
    const organizationId = Number(request.params['id']);

    if (!Number.isInteger(organizationId) || organizationId <= 0) {
      response.status(400).json({ message: 'Id de organizacion invalido.' });
      return;
    }

    const applications = await findOrganizationApplications(organizationId);
    response.status(200).json(applications);
  } catch (error) {
    console.error('Error fetching organization applications:', error);
    response.status(500).json({ message: 'Error interno al obtener aplicaciones.' });
  }
});

organizationRouter.put('/:id/applications/:applicationId', async (request, response) => {
  try {
    const organizationId = Number(request.params['id']);
    const applicationId = Number(request.params['applicationId']);
    const status = typeof request.body['status'] === 'string'
      ? request.body['status'].trim().toLowerCase()
      : '';

    if (!Number.isInteger(organizationId) || organizationId <= 0 || !Number.isInteger(applicationId) || applicationId <= 0) {
      response.status(400).json({ message: 'Id de organizacion o aplicación invalido.' });
      return;
    }

    if (!['submitted', 'reviewed', 'accepted', 'rejected'].includes(status)) {
      response.status(400).json({ message: 'Estado de aplicación inválido.' });
      return;
    }

    const updated = await updateOrganizationApplicationStatus(organizationId, applicationId, status as 'submitted' | 'reviewed' | 'accepted' | 'rejected');

    if (!updated) {
      response.status(404).json({ message: 'Aplicación no encontrada o no pertenece a la organización.' });
      return;
    }

    response.status(200).json({ message: 'Estado de aplicación actualizado correctamente.' });
  } catch (error) {
    console.error('Error updating organization application status:', error);
    response.status(500).json({ message: 'Error interno al actualizar estado de la aplicación.' });
  }
});

organizationRouter.get('/:id/dashboard', async (request, response) => {
  try {
    const organizationId = Number(request.params['id']);

    if (!Number.isInteger(organizationId) || organizationId <= 0) {
      response.status(400).json({ message: 'Id de organizacion invalido.' });
      return;
    }

    const stats = await findDashboardStats(organizationId);
    const recentOpportunities = await findRecentOpportunities(organizationId, 5);
    const recentApplications = await findOrganizationApplications(organizationId);

    response.status(200).json({
      stats,
      recentOpportunities,
      recentApplications,
    });
  } catch (error) {
    console.error('Error fetching organization dashboard:', error);
    response.status(500).json({ message: 'Error interno al obtener dashboard.' });
  }
});

// Opportunities routes
organizationRouter.get('/:id/opportunities', async (request, response) => {
  try {
    const organizationId = Number(request.params['id']);

    if (!Number.isInteger(organizationId) || organizationId <= 0) {
      response.status(400).json({ message: 'Id de organizacion invalido.' });
      return;
    }

    const opportunities = await findOrganizationOpportunities(organizationId);
    response.status(200).json(opportunities);
  } catch (error) {
    console.error('Error fetching organization opportunities:', error);
    response.status(500).json({ message: 'Error interno al obtener oportunidades.' });
  }
});

organizationRouter.post('/:id/opportunities', upload.single('image'), async (request, response) => {
  try {
    const organizationId = Number(request.params['id']);

	console.log('[organizationRouter] POST /:id/opportunities', {
		organizationId,
		bodyKeys: Object.keys(request.body ?? {}),
		hasFile: Boolean(request.file),
		file: request.file ? {
			originalname: request.file.originalname,
			mimetype: request.file.mimetype,
			size: request.file.size,
		} : null,
	});

    if (!Number.isInteger(organizationId) || organizationId <= 0) {
      response.status(400).json({ message: 'Id de organizacion invalido.' });
      return;
    }

    const normalized = normalizeOpportunityPayload(request.body);

	console.log('[organizationRouter] normalized opportunity payload', normalized);

    if (!normalized) {
      response.status(400).json({ message: 'Datos de oportunidad inválidos.' });
      return;
    }

    const opportunity = await createOrganizationOpportunity(organizationId, normalized, request.file);

	console.log('[organizationRouter] createOrganizationOpportunity result', opportunity);

    if (!opportunity) {
      response.status(500).json({ message: 'Error al crear oportunidad.' });
      return;
    }

    response.status(201).json(opportunity);
  } catch (error) {
    console.error('Error creating organization opportunity:', error);
    response.status(500).json({ message: 'Error interno al crear oportunidad.' });
  }
});

organizationRouter.put('/:id/opportunities/:opportunityId', upload.single('image'), async (request, response) => {
  try {
    const organizationId = Number(request.params['id']);
    const opportunityId = Number(request.params['opportunityId']);

    console.log('[organizationRouter] PUT /:id/opportunities/:opportunityId', {
      organizationId,
      opportunityId,
      bodyKeys: Object.keys(request.body ?? {}),
      hasFile: Boolean(request.file),
    });

    if (!Number.isInteger(organizationId) || organizationId <= 0) {
      response.status(400).json({ message: 'Id de organizacion invalido.' });
      return;
    }

    if (!Number.isInteger(opportunityId) || opportunityId <= 0) {
      response.status(400).json({ message: 'Id de oportunidad invalido.' });
      return;
    }

    const normalized = normalizeOpportunityPayload(request.body);

    console.log('[organizationRouter] normalized opportunity payload for update', normalized);

    if (!normalized) {
      response.status(400).json({ message: 'Datos de oportunidad inválidos.' });
      return;
    }

    const opportunity = await updateOrganizationOpportunity(organizationId, opportunityId, normalized, request.file);

    console.log('[organizationRouter] updateOrganizationOpportunity result', opportunity);

    if (!opportunity) {
      response.status(404).json({ message: 'Oportunidad no encontrada.' });
      return;
    }

    response.status(200).json(opportunity);
  } catch (error) {
    console.error('Error updating organization opportunity:', error);
    response.status(500).json({ message: 'Error interno al actualizar oportunidad.' });
  }
});

organizationRouter.delete('/:id/opportunities/:opportunityId', async (request, response) => {
  try {
    const organizationId = Number(request.params['id']);
    const opportunityId = Number(request.params['opportunityId']);

    if (!Number.isInteger(organizationId) || organizationId <= 0) {
      response.status(400).json({ message: 'Id de organizacion invalido.' });
      return;
    }

    if (!Number.isInteger(opportunityId) || opportunityId <= 0) {
      response.status(400).json({ message: 'Id de oportunidad invalido.' });
      return;
    }

    const wasDeleted = await deleteOrganizationOpportunity(organizationId, opportunityId);

    if (!wasDeleted) {
      response.status(404).json({ message: 'Oportunidad no encontrada.' });
      return;
    }

    response.status(200).json({ message: 'Oportunidad eliminada exitosamente.' });
  } catch (error) {
    console.error('Error deleting organization opportunity:', error);
    response.status(500).json({ message: 'Error interno al eliminar oportunidad.' });
  }
});

export { organizationRouter };