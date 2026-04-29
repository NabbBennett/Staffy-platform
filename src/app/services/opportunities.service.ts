import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface OpportunitySummary {
  id: number;
  organization_id: number;
  title: string;
  category: string;
  image_url: string;
  organization_name: string;
  organization_logo?: string | null;
  opportunity_date: string;
  location: string;
  registered: number;
  total_spots: number;
}

export interface OpportunityDetail {
  id: number;
  organization_id: number;
  title: string;
  organization: string;
  organization_logo?: string | null;
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
}

export interface ApplicationPayload {
  fullName: string;
  email: string;
  phone: string;
  relevantExperience: string;
  motivation: string;
  confirmAvailability: boolean;
  acceptTerms: boolean;
}

export interface ApplicationResponse {
  id: number;
  opportunityId: number;
  status: string;
  message: string;
}

export interface RecentApplication {
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

@Injectable({
  providedIn: 'root'
})
export class OpportunitiesService {
  private apiUrl = '/api/opportunities';

  constructor(private http: HttpClient) { }

  getOpportunities(): Observable<OpportunitySummary[]> {
    return this.http.get<OpportunitySummary[]>(this.apiUrl);
  }

  getOpportunityById(id: number): Observable<OpportunityDetail> {
    return this.http.get<OpportunityDetail>(`${this.apiUrl}/${id}`);
  }

  submitApplication(opportunityId: number, payload: ApplicationPayload): Observable<ApplicationResponse> {
    return this.http.post<ApplicationResponse>(
      `${this.apiUrl}/${opportunityId}/applications`,
      payload
    );
  }

  getUserApplications(userEmail: string): Observable<RecentApplication[]> {
    return this.http.get<RecentApplication[]>(
      `${this.apiUrl}/applications/user/${encodeURIComponent(userEmail)}`
    );
  }
}
