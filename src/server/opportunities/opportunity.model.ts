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

export interface CreateOpportunityApplicationPayload {
  fullName: string;
  email: string;
  phone: string;
  relevantExperience: string;
  motivation: string;
  confirmAvailability: boolean;
  acceptTerms: boolean;
}

export interface CreateOpportunityPayload {
  title: string;
  category: string;
  imageUrl: string;
  opportunityDate: string;
  timeAndDuration: string;
  location: string;
  availabilityText: string;
  totalSpots: number;
  about: string;
  tags: string[];
  responsibilities: string[];
  requirements: string[];
}

export interface ApplicationRecord {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  status: string;
  createdAt: Date;
}