import { Router, Request, Response } from 'express';
import { UserService } from '../users/user.service';
import { findUserById } from '../users/user.service';
import { OrganizationService, findOrganizationById, findOrganizations } from '../organizations/organization.service';
import { DashboardService } from './dashboard.service';

const router = Router();
const userService = new UserService();
const organizationService = new OrganizationService();
const dashboardService = new DashboardService();

// Middleware para verificar que el usuario sea admin
const verifyAdmin = async (req: Request, res: Response, next: Function): Promise<void> => {
  try {
    const userIdHeader = req.header('x-staffy-user-id');
    if (!userIdHeader) {
      res.status(401).json({ message: 'No autorizado. Token de usuario faltante.' });
      return;
    }

    const userId = parseInt(userIdHeader, 10);
    if (isNaN(userId)) {
      res.status(401).json({ message: 'No autorizado. Token de usuario inválido.' });
      return;
    }

    // Verificar que el usuario existe y es admin
    const user = await findUserById(userId);
    if (!user || user.role !== 'admin') {
      res.status(403).json({ message: 'No autorizado. Se requiere rol de administrador.' });
      return;
    }

    // Adjuntar información del usuario al request para uso posterior
    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Error en verifyAdmin:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

// GET /api/admin/users - Obtener todos los usuarios
router.get('/users', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt((req.query['page'] as string) || '1', 10) || 1;
    const pageSize = parseInt((req.query['pageSize'] as string) || '10', 10) || 10;
    const search = (req.query['search'] as string) || undefined;

    // If helper exists, use it; otherwise fallback to fetching all and paginating
    let results = await userService.getAllUsers();
    if (search) {
      results = results.filter((u: any) => (u.full_name || '').toLowerCase().includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase()));
    }

    const total = results.length;
    const start = (page - 1) * pageSize;
    const data = results.slice(start, start + pageSize);
    res.json({ data, total });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error });
  }
});

// GET /api/admin/users/:id - Obtener usuario por id
router.get('/users/:id', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params['id'] as string, 10);
    const user = await findUserById(id);
    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuario', error });
  }
});

// GET /api/admin/organizations - Obtener todas las organizaciones
router.get('/organizations', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt((req.query['page'] as string) || '1', 10) || 1;
    const pageSize = parseInt((req.query['pageSize'] as string) || '10', 10) || 10;
    const search = (req.query['search'] as string) || undefined;
    const status = (req.query['status'] as string) || undefined;

    // Use findOrganizations filter for server-side filtering, then paginate
    const allOrgs = await findOrganizations({ search, category: undefined });
    const filtered = status ? allOrgs.filter((o: any) => (status === 'all' ? true : o.status === status)) : allOrgs;
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);
    res.json({ data, total });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener organizaciones', error });
  }
});

// GET /api/admin/dashboard - Obtener estadísticas del dashboard
router.get('/dashboard', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await dashboardService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estadísticas', error });
  }
});

// GET /api/admin/dashboard/stats - Obtener estadísticas del dashboard (endpoint compatible con frontend)
router.get('/dashboard/stats', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await dashboardService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estadísticas', error });
  }
});

// GET /api/admin/analytics/growth - Obtener datos de crecimiento de plataforma
router.get('/analytics/growth', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const growth = await dashboardService.getPlatformGrowthData();
    res.json(growth);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener crecimiento de plataforma', error });
  }
});

// GET /api/admin/analytics/opportunities-category - Obtener oportunidades por categoría
router.get('/analytics/opportunities-category', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await dashboardService.getOpportunitiesByCategoryData();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener oportunidades por categoría', error });
  }
});

// GET /api/admin/analytics/volunteer-engagement - Obtener compromiso de voluntarios
router.get('/analytics/volunteer-engagement', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const engagement = await dashboardService.getVolunteerEngagementData();
    res.json(engagement);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener compromiso de voluntarios', error });
  }
});

// GET /api/admin/analytics/hours-trend - Obtener tendencia de horas de voluntariado
router.get('/analytics/hours-trend', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const hoursTrend = await dashboardService.getVolunteeringHoursTrendData();
    res.json(hoursTrend);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener tendencia de horas', error });
  }
});

// GET /api/admin/analytics/top-organizations - Obtener organizaciones con mejor desempeño
router.get('/analytics/top-organizations', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const topOrgs = await dashboardService.getTopOrganizationsData();
    res.json(topOrgs);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener organizaciones de alto desempeño', error });
  }
});

// PUT /api/admin/users/:id/role - Cambiar rol de usuario
router.put('/users/:id/role', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const { role } = req.body;

    if (!['admin', 'voluntario', 'empresa'].includes(role)) {
      res.status(400).json({ message: 'Rol inválido' });
      return;
    }

    await userService.updateUserRole(parseInt(id), role);
    const updated = await findUserById(parseInt(id));
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar rol', error });
  }
});

// PUT /api/admin/users/:id/status - Actualizar estado del usuario
router.put('/users/:id/status', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params['id'] as string, 10);
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      res.status(400).json({ message: 'Estado inválido' });
      return;
    }

    await userService.updateUserStatus(id, status);
    const updated = await findUserById(id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar estado', error });
  }
});

// PUT /api/admin/users/:id/block - Bloquear/Desbloquear usuario
router.put('/users/:id/block', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const { blocked } = req.body;

    await userService.updateUserBlocked(parseInt(id), blocked);
    res.json({ message: blocked ? 'Usuario bloqueado' : 'Usuario desbloqueado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al bloquear/desbloquear usuario', error });
  }
});

// PUT /api/admin/organizations/:id/verify - Verificar/Rechazar organización
router.put('/organizations/:id/verify', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params['id'] as string;
    const verified = typeof req.body?.verified === 'boolean' ? req.body.verified : true;

    await organizationService.updateVerificationStatus(parseInt(id), verified);
    const updated = await findOrganizationById(parseInt(id));
    if (!updated) {
      res.status(404).json({ message: 'Organización no encontrada' });
      return;
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar estado de verificación', error });
  }
});

// PUT /api/admin/organizations/:id/status - Actualizar estado de organización
router.put('/organizations/:id/status', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params['id'] as string, 10);
    const { status } = req.body;

    if (!['active', 'inactive', 'pending'].includes(status)) {
      res.status(400).json({ message: 'Estado inválido' });
      return;
    }

    await organizationService.updateOrganizationStatus(id, status);
    const updated = await findOrganizationById(id);
    if (!updated) {
      res.status(404).json({ message: 'Organización no encontrada' });
      return;
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar estado de organización', error });
  }
});

// GET /api/admin/analytics - Obtener datos de analítica detallados
router.get('/analytics', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const analytics = await dashboardService.getDetailedAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener analíticas', error });
  }
});

// POST /api/admin/reports/generate - Generar reporte exportable
router.post('/reports/generate', verifyAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.body; // 'users' | 'organizations' | 'opportunities' | 'analytics'
    const timestamp = new Date().toISOString().split('T')[0];

    if (type === 'users') {
      const users = await userService.getAllUsers();
      const csv = generateUsersCSV(users);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="users_${timestamp}.csv"`);
      res.send(csv);
    } else if (type === 'organizations') {
      const orgs = await findOrganizations({});
      const csv = generateOrganizationsCSV(orgs);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="organizations_${timestamp}.csv"`);
      res.send(csv);
    } else if (type === 'analytics') {
      const stats = await dashboardService.getDashboardStats();
      const growth = await dashboardService.getPlatformGrowthData();
      const categories = await dashboardService.getOpportunitiesByCategoryData();
      const engagement = await dashboardService.getVolunteerEngagementData();
      const hours = await dashboardService.getVolunteeringHoursTrendData();
      
      const csv = generateAnalyticsCSV({ stats, growth, categories, engagement, hours });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="analytics_${timestamp}.csv"`);
      res.send(csv);
    } else {
      res.status(400).json({ message: 'Tipo de reporte inválido' });
    }
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Error al generar reporte', error });
  }
});

// Helper functions to generate CSV content
function generateUsersCSV(users: any[]): string {
  const headers = ['ID', 'Full Name', 'Email', 'Role', 'Status', 'Created At', 'Last Login'];
  const rows = users.map(u => [
    u.id,
    u.full_name || '',
    u.email || '',
    u.role || '',
    u.status || '',
    u.created_at || '',
    u.last_login || ''
  ]);
  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

function generateOrganizationsCSV(orgs: any[]): string {
  const headers = ['ID', 'Name', 'Category', 'Email', 'Phone', 'Status', 'Verified', 'Opportunities', 'Volunteers'];
  const rows = orgs.map(o => [
    o.id,
    o.name || '',
    o.category || '',
    o.email || '',
    o.phone || '',
    o.status || '',
    o.verified ? 'Yes' : 'No',
    o.opportunities || 0,
    o.volunteers || 0
  ]);
  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

function generateAnalyticsCSV(data: any): string {
  let csv = 'PLATFORM ANALYTICS REPORT\n';
  csv += `Generated: ${new Date().toISOString()}\n\n`;

  // Dashboard Stats
  csv += 'DASHBOARD STATISTICS\n';
  csv += `Total Users,${data.stats?.total_users || 0}\n`;
  csv += `Total Organizations,${data.stats?.total_organizations || 0}\n`;
  csv += `Total Opportunities,${data.stats?.total_opportunities || 0}\n`;
  csv += `Active Volunteers,${data.stats?.active_volunteers || 0}\n`;
  csv += `Completed Hours,${data.stats?.completed_hours || 0}\n\n`;

  // Growth data
  if (data.growth && data.growth.length > 0) {
    csv += 'PLATFORM GROWTH\n';
    csv += 'Month,Count\n';
    data.growth.forEach((g: any) => {
      csv += `${g.label},${g.value}\n`;
    });
    csv += '\n';
  }

  // Categories
  if (data.categories && data.categories.length > 0) {
    csv += 'OPPORTUNITIES BY CATEGORY\n';
    csv += 'Category,Count\n';
    data.categories.forEach((c: any) => {
      csv += `${c.label},${c.value}\n`;
    });
    csv += '\n';
  }

  // Engagement
  if (data.engagement && data.engagement.length > 0) {
    csv += 'VOLUNTEER ENGAGEMENT\n';
    csv += 'Range,Count\n';
    data.engagement.forEach((e: any) => {
      csv += `${e.label},${e.value}\n`;
    });
    csv += '\n';
  }

  // Hours trend
  if (data.hours && data.hours.length > 0) {
    csv += 'VOLUNTEERING HOURS TREND\n';
    csv += 'Month,Hours\n';
    data.hours.forEach((h: any) => {
      csv += `${h.label},${h.value}\n`;
    });
  }

  return csv;
}

export default router;
