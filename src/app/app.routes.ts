import { Routes } from '@angular/router';
import { SignInComponent } from './pages/auth/sign-in/sign-in.component';
import { SignUpComponent } from './pages/auth/sign-up/sign-up.component';
import { ProfileComponent } from './pages/general/profile/profile.component';
import { ShiftsComponent } from './pages/volunteers/shifts/shifts.component';
import { OrganizationsComponent } from './pages/general/organizations/organizations.component';
import { OpportunitiesComponent } from './pages/general/opportunities/opportunities.component';
import { OportunityCardComponent } from './pages/volunteers/opportunity/oportunitity-card/oportunity-card.component';
import { ApplyComponent } from './pages/volunteers/opportunity/apply/apply.component';
import { OrganizationProfileComponent } from './pages/organization/profile/profile.component';
import { VolunteersComponent } from './pages/organization/volunteers/volunteers.component';
import { DashboardComponent } from './pages/organization/dashboard/dashboard.component';
import { NewOpportunityComponent } from './pages/organization/new-opportunity/new-opportunity.component';
import { AdminUsersComponent } from './pages/admin/users/users.component';
import { AdminOrganizationsComponent } from './pages/admin/organizations/organizations.component';
import { AdminReportsComponent } from './pages/admin/reports/reports.component';

export const routes: Routes = [
  { path: '', component: OpportunitiesComponent },
  { path: 'sign-in', component: SignInComponent },
  { path: 'sign-up', component: SignUpComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'shifts', component: ShiftsComponent },
  { path: 'opportunities/:id/apply', component: ApplyComponent },
  { path: 'opportunities/:id', component: OportunityCardComponent },
  { path: 'opportunities', pathMatch: 'full', component: OpportunitiesComponent },
  { path: 'organization/dashboard', component: DashboardComponent },
  { path: 'organization/profile', component: OrganizationProfileComponent },
  { path: 'organization/volunteers', component: VolunteersComponent },
  { path: 'organization/new-opportunity', component: NewOpportunityComponent },
  { path: 'organizations', component: OrganizationsComponent },
  { path: 'admin/users', component: AdminUsersComponent,  },
  { path: 'admin/organizations', component: AdminOrganizationsComponent },
  { path: 'admin/reports', component: AdminReportsComponent },
  { path: '**', redirectTo: '' }
];
