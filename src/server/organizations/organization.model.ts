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
  status: 'active' | 'inactive' | 'pending';
  email: string;
  phone: string;
  website: string;
  created_at?: Date;
}

export interface OrganizationProfile extends Organization {
  emailNotifications: boolean;
  publicProfile: boolean;
  autoApproveApplications: boolean;
  showVolunteerCount: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateOrganizationProfilePayload {
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

export interface OrganizationFilters {
  search?: string;
  category?: string;
}