import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Organization {
  id: number;
  initials: string;
  name: string;
  category: string;
  description: string;
  location: string;
  opportunities: number;
  volunteers: number;
  rating: number;
  verified: boolean;
  email: string;
  phone: string;
  website: string;
}

export interface OrganizationProfile extends Organization {
  emailNotifications: boolean;
  publicProfile: boolean;
  autoApproveApplications: boolean;
  showVolunteerCount: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrganizationProfilePayload {
  email: string;
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
}

export interface Volunteer {
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

export interface Application {
  id: number;
  name: string;
  email: string;
  opportunity: string;
  status: 'submitted' | 'reviewed' | 'accepted' | 'rejected';
  time: string;
}

export interface DashboardStats {
  total_volunteers: number;
  active_opportunities: number;
  total_applications: number;
  approved_applications: number;
  pending_applications: number;
  total_hours_served: number;
}

export interface OpportunityItem {
  id: number;
  title: string;
  date: string;
  status: string;
  progress: string;
}

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

export interface OpportunityDetail {
  id: number;
  title: string;
  organization: string;
  category: string;
  image: string;
  date: string;
  timeAndDuration: string;
  location: string;
  availability: string;
  registered: number;
  totalSpots: number;
  rating: number;
  verified: boolean;
  tags: string[];
  about: string;
  responsibilities: string[];
  requirements: string[];
  organizationLogo?: string | null;
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
}

export interface DashboardData {
  stats: DashboardStats;
  recentOpportunities: OpportunityItem[];
  recentApplications: Application[];
}

@Injectable({
  providedIn: 'root'
})
export class OrganizationsService {
  private apiUrl = '/api/organizations';

  constructor(private http: HttpClient) { }

  getOrganizations(search?: string, category?: string): Observable<Organization[]> {
    let url = this.apiUrl;
    const params: string[] = [];

    if (search) {
      params.push(`search=${encodeURIComponent(search)}`);
    }

    if (category && category !== 'Todas las Categorías') {
      params.push(`category=${encodeURIComponent(category)}`);
    }

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    return this.http.get<Organization[]>(url);
  }

  getOrganizationById(id: number): Observable<Organization> {
    return this.http.get<Organization>(`${this.apiUrl}/${id}`);
  }

  getOrganizationProfile(email: string): Observable<OrganizationProfile> {
    return this.http.get<OrganizationProfile>(`${this.apiUrl}/profile?email=${encodeURIComponent(email)}`);
  }

  updateOrganizationProfile(payload: UpdateOrganizationProfilePayload): Observable<OrganizationProfile> {
    return this.http.put<OrganizationProfile>(`${this.apiUrl}/profile`, payload);
  }

  getOrganizationVolunteers(organizationId: number): Observable<Volunteer[]> {
    return this.http.get<Volunteer[]>(`${this.apiUrl}/${organizationId}/volunteers`);
  }

  markVolunteerComplete(organizationId: number, volunteerId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${organizationId}/volunteers/${volunteerId}/complete`, {});
  }

  rateVolunteer(organizationId: number, volunteerId: number, rating: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${organizationId}/volunteers/${volunteerId}/rate`, { rating });
  }

  setVolunteerStatus(organizationId: number, volunteerId: number, status: 'active' | 'new' | 'inactive'): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${organizationId}/volunteers/${volunteerId}/status`, { status });
  }

  getOrganizationApplications(organizationId: number): Observable<Application[]> {
    return this.http.get<Application[]>(`${this.apiUrl}/${organizationId}/applications`);
  }

  getDashboardData(organizationId: number): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.apiUrl}/${organizationId}/dashboard`);
  }

  getOrganizationOpportunities(organizationId: number): Observable<Opportunity[]> {
    return this.http.get<Opportunity[]>(`${this.apiUrl}/${organizationId}/opportunities`);
  }

  createOrganizationOpportunity(organizationId: number, payload: CreateOpportunityPayload): Observable<Opportunity> {
    return this.http.post<Opportunity>(`${this.apiUrl}/${organizationId}/opportunities`, payload);
  }

  deleteOrganizationOpportunity(organizationId: number, opportunityId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${organizationId}/opportunities/${opportunityId}`);
  }

  createOrganizationOpportunityWithImage(organizationId: number, formData: FormData): Observable<Opportunity> {
    return this.http.post<Opportunity>(`${this.apiUrl}/${organizationId}/opportunities`, formData);
  }

  updateOrganizationApplicationStatus(organizationId: number, applicationId: number, status: 'submitted' | 'reviewed' | 'accepted' | 'rejected'): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${organizationId}/applications/${applicationId}`, { status });
  }

  updateOrganizationOpportunityWithImage(organizationId: number, opportunityId: number, formData: FormData): Observable<Opportunity> {
    return this.http.put<Opportunity>(`${this.apiUrl}/${organizationId}/opportunities/${opportunityId}`, formData);
  }

  getOpportunityById(id: number): Observable<OpportunityDetail> {
    return this.http.get<OpportunityDetail>(`/api/opportunities/${id}`);
  }
}
