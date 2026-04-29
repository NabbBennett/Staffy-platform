import { getDbPool } from '../db/mysql';

export interface DashboardStats {
  total_users: number;
  total_organizations: number;
  total_opportunities: number;
  pending_verifications: number;
  total_volunteers: number;
  // Added to match frontend expectations
  active_volunteers: number;
  completed_hours: number;
  platform_growth: number;
}

export interface AnalyticsData {
  user_growth: Array<{ date: string; count: number }>;
  opportunity_stats: { active: number; closed: number; filled: number };
  application_stats: { pending: number; accepted: number; rejected: number };
  organization_distribution: Array<{ name: string; count: number }>;
}

export class DashboardService {
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const pool = getDbPool();
      const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
      let organizations: any;
      let pending: any;
      try {
        [organizations] = await pool.query('SELECT COUNT(*) as count FROM organizations WHERE verified = 1');
        [pending] = await pool.query('SELECT COUNT(*) as count FROM organizations WHERE verified = 0');
      } catch (err: any) {
        if (err && err.code === 'ER_BAD_FIELD_ERROR') {
          [organizations] = await pool.query('SELECT COUNT(*) as count FROM organizations');
          pending = [{ count: 0 }];
        } else {
          throw err;
        }
      }
      const [opportunities] = await pool.query('SELECT COUNT(*) as count FROM opportunities');
      const [volunteers] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "voluntario"');

      // Active volunteers: those with last_login within 30 days
      // Active volunteers: those with volunteer activity within the last 30 days
      const [activeVols] = await pool.query(`
        SELECT COUNT(DISTINCT vh.user_email) as count
        FROM volunteer_history vh
        JOIN users u ON u.email = vh.user_email
        WHERE u.role = 'voluntario' AND (vh.activity_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) OR vh.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))
      `);

      // Completed hours total
      const [completedHours] = await pool.query(`
        SELECT IFNULL(SUM(hours), 0) as total_hours FROM volunteer_history WHERE status = 'completado'
      `);

      // Platform growth: compare users in last 30 days vs previous 30 days
      const [recentUsers] = await pool.query(`
        SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);
      const [prevUsers] = await pool.query(`
        SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);

      const recent = (recentUsers as any)[0]?.count || 0;
      const prev = (prevUsers as any)[0]?.count || 0;
      const growthPct = prev === 0 ? (recent === 0 ? 0 : 100) : Math.round(((recent - prev) / prev) * 100);

      return {
        total_users: (users as any)[0]?.count || 0,
        total_organizations: (organizations as any)[0]?.count || 0,
        total_opportunities: (opportunities as any)[0]?.count || 0,
        pending_verifications: (pending as any)[0]?.count || 0,
        total_volunteers: (volunteers as any)[0]?.count || 0,
        // new fields expected by frontend
        active_volunteers: (activeVols as any)[0]?.count || 0,
        completed_hours: (completedHours as any)[0]?.total_hours || 0,
        platform_growth: growthPct,
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas del dashboard:', error);
      throw error;
    }
  }

  async getDetailedAnalytics(): Promise<AnalyticsData> {
    try {
      const pool = getDbPool();

      // User growth data (últimos 30 días)
      const [userGrowth] = await pool.query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date
      `);

      // Opportunity stats - using registered/total_spots to determine status
      const [opportunityStats] = await pool.query(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN registered < total_spots THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN registered >= total_spots THEN 1 ELSE 0 END) as filled
        FROM opportunities
      `);

      // Application stats
      const [applicationStats] = await pool.query(`
        SELECT
          SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM opportunity_applications
      `);

      // Organization distribution
      const [orgDist] = await pool.query(`
        SELECT o.name, COUNT(op.id) as count
        FROM organizations o
        LEFT JOIN opportunities op ON o.id = op.organization_id
        GROUP BY o.id, o.name
        LIMIT 10
      `);

      return {
        user_growth: (userGrowth as any).map((u: any) => ({
          date: u.date,
          count: u.count,
        })),
        opportunity_stats: {
          active: (opportunityStats as any)[0]?.active || 0,
          closed: 0, // No closed status in current schema
          filled: (opportunityStats as any)[0]?.filled || 0,
        },
        application_stats: {
          pending: (applicationStats as any)[0]?.pending || 0,
          accepted: (applicationStats as any)[0]?.accepted || 0,
          rejected: (applicationStats as any)[0]?.rejected || 0,
        },
        organization_distribution: (orgDist as any).map((o: any) => ({
          name: o.name,
          count: o.count,
        })),
      };
    } catch (error) {
      console.error('Error obteniendo analítica detallada:', error);
      throw error;
    }
  }

  async getPlatformGrowthData(): Promise<Array<{ label: string; value: number }>> {
    try {
      const pool = getDbPool();
      const [rows] = await pool.query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date
      `);

      return (rows as any).map((row: any) => ({
        label: row.date,
        value: row.count,
      }));
    } catch (error) {
      console.error('Error obteniendo crecimiento de plataforma:', error);
      throw error;
    }
  }

  async getOpportunitiesByCategoryData(): Promise<Array<{ label: string; value: number }>> {
    try {
      const pool = getDbPool();
      const [rows] = await pool.query(`
        SELECT category, COUNT(*) as count
        FROM opportunities
        GROUP BY category
        ORDER BY count DESC
      `);

      return (rows as any).map((row: any) => ({
        label: row.category,
        value: row.count,
      }));
    } catch (error) {
      console.error('Error obteniendo oportunidades por categoría:', error);
      throw error;
    }
  }

  async getVolunteerEngagementData(): Promise<Array<{ label: string; value: number }>> {
    try {
      const pool = getDbPool();
      const [rows] = await pool.query(`
        SELECT name, volunteers_count as count
        FROM organizations
        ORDER BY volunteers_count DESC
        LIMIT 10
      `);

      return (rows as any).map((row: any) => ({
        label: row.name,
        value: row.count,
      }));
    } catch (error) {
      console.error('Error obteniendo engagement de voluntarios:', error);
      throw error;
    }
  }

  async getVolunteeringHoursTrendData(): Promise<Array<{ label: string; value: number }>> {
    try {
      const pool = getDbPool();
      const [rows] = await pool.query(`
        SELECT DATE(created_at) as date, SUM(hours) as total_hours
        FROM volunteer_history
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date
      `);

      return (rows as any).map((row: any) => ({
        label: row.date,
        value: row.total_hours,
      }));
    } catch (error) {
      console.error('Error obteniendo tendencia de horas:', error);
      throw error;
    }
  }

  async getTopOrganizationsData(): Promise<Array<{ id: number; name: string; opportunities: number; volunteers: number; rating: number }>> {
    try {
      const pool = getDbPool();
      const [rows] = await pool.query(`
        SELECT id, name, opportunities_count as opportunities, volunteers_count as volunteers, rating
        FROM organizations
        ORDER BY volunteers_count DESC, opportunities_count DESC
        LIMIT 10
      `);

      return (rows as any).map((row: any) => ({
        id: row.id,
        name: row.name,
        opportunities: row.opportunities,
        volunteers: row.volunteers,
        rating: Number(row.rating),
      }));
    } catch (error) {
      console.error('Error obteniendo organizaciones top:', error);
      throw error;
    }
  }
}
