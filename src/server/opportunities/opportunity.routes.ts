import { Router } from 'express';
import {
  createOpportunityApplication,
  findOpportunityById,
  findOpportunitySummaryList,
  findOpportunityApplications,
  getVolunteerApplications,
  hasVolunteerApplicationForOpportunity,
  getVolunteerConfirmations,
  createVolunteerConfirmation,
  updateVolunteerConfirmation,
} from './opportunity.service';
import { CreateOpportunityApplicationPayload } from './opportunity.model';

const opportunityRouter = Router();

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function normalizeApplicationPayload(rawBody: unknown): CreateOpportunityApplicationPayload | null {
  if (!rawBody || typeof rawBody !== 'object') {
    return null;
  }

  const body = rawBody as Record<string, unknown>;
  const fullName = typeof body['fullName'] === 'string' ? body['fullName'].trim() : '';
  const email = typeof body['email'] === 'string' ? body['email'].trim().toLowerCase() : '';
  const phone = typeof body['phone'] === 'string'
    ? body['phone'].replace(/\D/g, '').slice(0, 10)
    : '';
  const relevantExperience = typeof body['relevantExperience'] === 'string'
    ? body['relevantExperience'].trim()
    : '';
  const motivation = typeof body['motivation'] === 'string'
    ? body['motivation'].trim()
    : '';
  const confirmAvailability = body['confirmAvailability'] === true;
  const acceptTerms = body['acceptTerms'] === true;

  const fullNameRegex = /^[A-Za-z\s'-]{3,140}$/;

  if (
    !fullNameRegex.test(fullName) ||
    !isValidEmail(email) ||
    !/^\d{10}$/.test(phone) ||
    relevantExperience.length < 20 ||
    motivation.length < 20 ||
    !confirmAvailability ||
    !acceptTerms
  ) {
    return null;
  }

  return {
    fullName,
    email,
    phone,
    relevantExperience,
    motivation,
    confirmAvailability,
    acceptTerms,
  };
}

opportunityRouter.get('/', async (_request, response) => {
  try {
    const opportunities = await findOpportunitySummaryList();
    response.status(200).json(opportunities);
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    response.status(500).json({ message: 'Error interno al obtener oportunidades.' });
  }
});

opportunityRouter.get('/applications/user/:userEmail', async (request, response) => {
  try {
    const { userEmail } = request.params;

    if (!isValidEmail(userEmail)) {
      response.status(400).json({ message: 'Email invalido.' });
      return;
    }

    const applications = await getVolunteerApplications(userEmail);
    response.status(200).json(applications);
  } catch (error) {
    console.error('Error fetching volunteer applications:', error);
    response.status(500).json({ message: 'Error interno al obtener aplicaciones de usuario.' });
  }
});

opportunityRouter.get('/confirmations', async (request, response) => {
  try {
    const userEmail = typeof request.query['email'] === 'string'
      ? request.query['email'].trim().toLowerCase()
      : '';

    if (!isValidEmail(userEmail)) {
      response.status(400).json({ message: 'Email invalido.' });
      return;
    }

    const confirmations = await getVolunteerConfirmations(userEmail);
    response.status(200).json(confirmations);
  } catch (error) {
    console.error('Error fetching volunteer confirmations:', error);
    response.status(500).json({ message: 'Error interno al obtener confirmaciones.' });
  }
});

opportunityRouter.get('/:id', async (request, response) => {
  try {
    const opportunityId = Number(request.params.id);

    if (!Number.isInteger(opportunityId) || opportunityId <= 0) {
      response.status(400).json({ message: 'Id de oportunidad invalido.' });
      return;
    }

    const opportunity = await findOpportunityById(opportunityId);

    if (!opportunity) {
      response.status(404).json({ message: 'Oportunidad no encontrada.' });
      return;
    }

    response.status(200).json(opportunity);
  } catch (error) {
    console.error('Error fetching opportunity detail:', error);
    response.status(500).json({ message: 'Error interno al obtener oportunidad.' });
  }
});

opportunityRouter.get('/:id/applications', async (request, response) => {
  try {
    const opportunityId = Number(request.params.id);

    if (!Number.isInteger(opportunityId) || opportunityId <= 0) {
      response.status(400).json({ message: 'Id de oportunidad invalido.' });
      return;
    }

    const applications = await findOpportunityApplications(opportunityId);
    response.status(200).json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    response.status(500).json({ message: 'Error interno al obtener aplicaciones.' });
  }
});

opportunityRouter.post('/:id/applications', async (request, response) => {
  try {
    const opportunityId = Number(request.params.id);
    const payload = normalizeApplicationPayload(request.body);

    if (!Number.isInteger(opportunityId) || opportunityId <= 0) {
      response.status(400).json({ message: 'Id de oportunidad invalido.' });
      return;
    }

    if (!payload) {
      response.status(400).json({ message: 'Datos de aplicacion invalidos.' });
      return;
    }

    const opportunity = await findOpportunityById(opportunityId);

    if (!opportunity) {
      response.status(404).json({ message: 'Oportunidad no encontrada.' });
      return;
    }

    const alreadyApplied = await hasVolunteerApplicationForOpportunity(payload.email, opportunityId);

    if (alreadyApplied) {
      response.status(409).json({ message: 'Ya has aplicado a este voluntariado.' });
      return;
    }

    const applicationId = await createOpportunityApplication(opportunityId, payload);

    response.status(201).json({
      id: applicationId,
      opportunityId,
      status: 'submitted',
      message: 'Aplicacion enviada correctamente.',
    });
  } catch (error) {
    if ((error as any)?.code === 'OPPORTUNITY_FULL' || (error as Error)?.message?.includes('cupos')) {
      response.status(409).json({ message: 'Esta oportunidad ya no tiene cupos disponibles.' });
      return;
    }

    console.error('Error creating application:', error);
    response.status(500).json({ message: 'Error interno al enviar aplicacion.' });
  }
});

// Volunteer confirmations routes
opportunityRouter.get('/confirmations/:userEmail', async (request, response) => {
  try {
    const { userEmail } = request.params;

    if (!isValidEmail(userEmail)) {
      response.status(400).json({ message: 'Email invalido.' });
      return;
    }

    const confirmations = await getVolunteerConfirmations(userEmail);
    response.json(confirmations);
  } catch (error) {
    console.error('Error fetching volunteer confirmations:', error);
    response.status(500).json({ message: 'Error interno al obtener confirmaciones.' });
  }
});

opportunityRouter.post('/confirmations', async (request, response) => {
  try {
    const { userEmail, opportunityId, organizationId, status } = request.body;

    if (!isValidEmail(userEmail) || !opportunityId || !organizationId) {
      response.status(400).json({ message: 'Datos invalidos para crear confirmacion.' });
      return;
    }

    const confirmationId = await createVolunteerConfirmation(
      userEmail,
      opportunityId,
      organizationId,
      status || 'pendiente'
    );

    response.status(201).json({
      id: confirmationId,
      message: 'Confirmacion creada correctamente.',
    });
  } catch (error) {
    console.error('Error creating volunteer confirmation:', error);
    response.status(500).json({ message: 'Error interno al crear confirmacion.' });
  }
});

opportunityRouter.put('/confirmations/:id', async (request, response) => {
  try {
    const { id } = request.params;
    const updates = request.body;

    const success = await updateVolunteerConfirmation(parseInt(id), updates);

    if (!success) {
      response.status(404).json({ message: 'Confirmacion no encontrada.' });
      return;
    }

    response.json({ message: 'Confirmacion actualizada correctamente.' });
  } catch (error) {
    console.error('Error updating volunteer confirmation:', error);
    response.status(500).json({ message: 'Error interno al actualizar confirmacion.' });
  }
});

export { opportunityRouter };