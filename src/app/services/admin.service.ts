import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  last_login: string | null;
}

export interface Organization {
  id: number;
  name: string;
  category: string;
  email: string;
  phone: string;
  verified: boolean;
  opportunities: number;
  volunteers: number;
  rating: number;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
}

export interface Report {
  id: number;
  type: string;
  title: string;
  description: string;
  generated_at: string;
  generated_by: string;
  file_url?: string;
}

export interface DashboardStats {
  total_users: number;
  total_organizations: number;
  total_opportunities: number;
  total_volunteers: number;
  active_volunteers: number;
  completed_hours: number;
  platform_growth: number;
}

export interface AnalyticsData {
  label: string;
  value: number;
  change?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = '/api/admin';

  constructor(private http: HttpClient) { }

  // Users Management
  getUsers(page: number = 1, pageSize: number = 10, search?: string): Observable<{ data: User[]; total: number }> {
    let url = `${this.apiUrl}/users?page=${page}&pageSize=${pageSize}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    return this.http.get<{ data: User[]; total: number }>(url);
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`);
  }

  updateUserStatus(userId: number, status: 'active' | 'inactive' | 'suspended'): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${userId}/status`, { status });
  }

  updateUserRole(userId: number, role: string): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${userId}/role`, { role });
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}`);
  }

  // Organizations Management
  getOrganizations(page: number = 1, pageSize: number = 10, search?: string, status?: string): Observable<{ data: Organization[]; total: number }> {
    let url = `${this.apiUrl}/organizations?page=${page}&pageSize=${pageSize}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    if (status) {
      url += `&status=${status}`;
    }
    return this.http.get<{ data: Organization[]; total: number }>(url);
  }

  getOrganizationById(id: number): Observable<Organization> {
    return this.http.get<Organization>(`${this.apiUrl}/organizations/${id}`);
  }

  verifyOrganization(organizationId: number): Observable<Organization> {
    return this.http.put<Organization>(`${this.apiUrl}/organizations/${organizationId}/verify`, {});
  }

  updateOrganizationStatus(organizationId: number, status: 'active' | 'inactive' | 'pending'): Observable<Organization> {
    return this.http.put<Organization>(`${this.apiUrl}/organizations/${organizationId}/status`, { status });
  }

  deleteOrganization(organizationId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/organizations/${organizationId}`);
  }

  // Reports & Analytics
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard/stats`);
  }

  getPlatformGrowthData(): Observable<AnalyticsData[]> {
    return this.http.get<AnalyticsData[]>(`${this.apiUrl}/analytics/growth`);
  }

  getOpportunitiesByCategory(): Observable<AnalyticsData[]> {
    return this.http.get<AnalyticsData[]>(`${this.apiUrl}/analytics/opportunities-category`);
  }

  getVolunteerEngagement(): Observable<AnalyticsData[]> {
    return this.http.get<AnalyticsData[]>(`${this.apiUrl}/analytics/volunteer-engagement`);
  }

  getVolunteeringHoursTrend(): Observable<AnalyticsData[]> {
    return this.http.get<AnalyticsData[]>(`${this.apiUrl}/analytics/hours-trend`);
  }

  getTopOrganizations(): Observable<Organization[]> {
    return this.http.get<Organization[]>(`${this.apiUrl}/analytics/top-organizations`);
  }

  generateReport(type: 'users' | 'organizations' | 'opportunities' | 'analytics'): Observable<any> {
    return new Observable((observer) => {
      this.http.post(`${this.apiUrl}/reports/generate`, { type }, {
        responseType: 'blob' as 'json'
      }).subscribe({
        next: (blob: any) => {
          // Create a download link
          const filename = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
          const link = document.createElement('a');
          link.href = window.URL.createObjectURL(blob);
          link.download = filename;
          link.click();
          window.URL.revokeObjectURL(link.href);
          observer.next({ success: true });
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  getReports(): Observable<Report[]> {
    return this.http.get<Report[]>(`${this.apiUrl}/reports`);
  }
}
