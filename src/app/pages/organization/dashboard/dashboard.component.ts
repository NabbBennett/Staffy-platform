import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApplicationsModalComponent, ApplicationItem } from './applications-modal/applications-modal.component';
import { OpportunitiesModalComponent } from './opportunities-modal/opportunities-modal.component';
import { OrganizationsService, DashboardStats, OpportunityItem, Application, Opportunity } from '../../../services/organizations.service';

@Component({
	selector: 'app-organization-dashboard',
	standalone: true,
	imports: [CommonModule, ApplicationsModalComponent, OpportunitiesModalComponent],
	templateUrl: './dashboard.component.html',
	styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
	private readonly organizationsService = inject(OrganizationsService);
	private readonly router = inject(Router);
	private readonly isLoading = signal(true);
	private readonly dashboardError = signal('');

	isApplicationsModalOpen = signal(false);
	isOpportunitiesModalOpen = signal(false);
	// modal removed: navigation to the new-opportunity page is used instead

	readonly dashboardStats = signal<DashboardStats | null>(null);
	readonly upcomingOpportunities = signal<OpportunityItem[]>([]);
	readonly recentApplications = signal<Application[]>([]);
	readonly organizationApplications = signal<Application[]>([]);
	readonly allOpportunities = signal<Opportunity[]>([]);

	readonly organizationId = signal<number | null>(null);

	readonly stats = computed(() => {
		const stats = this.dashboardStats();
		if (!stats) {
			return [
				{ label: 'Voluntarios Totales', value: 0, trend: '+0%', tone: 'blue' },
				{ label: 'Oportunidades Activas', value: 0, trend: '+0', tone: 'green' },
				{ label: 'Horas Totales Servidas', value: '0', trend: '+0%', tone: 'purple' },
				{ label: 'Tasa de Aprobación', value: '0%', trend: '+0%', tone: 'orange' },
			];
		}

		const approvalRate = stats.total_applications > 0 
			? Math.round((stats.approved_applications / stats.total_applications) * 100)
			: 0;

		return [
			{ label: 'Voluntarios Totales', value: stats.total_volunteers, trend: '+0%', tone: 'blue' },
			{ label: 'Oportunidades Activas', value: stats.active_opportunities, trend: '+0', tone: 'green' },
			{ label: 'Horas Totales Servidas', value: stats.total_hours_served.toLocaleString('es-ES'), trend: '+0%', tone: 'purple' },
			{ label: 'Tasa de Aprobación', value: approvalRate + '%', trend: '+0%', tone: 'orange' },
		];
	});

	get visibleUpcomingOpportunities() {
		return this.upcomingOpportunities().slice(0, 4);
	}

	get visibleRecentApplications() {
		return this.recentApplications().slice(0, 3);
	}

	constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

	ngOnInit(): void {
		if (!isPlatformBrowser(this.platformId)) {
			return;
		}

		const storedEmail = localStorage.getItem('staffy_user_email')?.trim().toLowerCase() ?? '';

		if (!storedEmail) {
			this.dashboardError.set('No se encontró una sesión activa.');
			this.isLoading.set(false);
			return;
		}

		// Get organization ID from the organization profile (or get it from the first organization)
		// For now, we'll use a hardcoded ID or fetch from the user's organization
		// This is a simplified approach - in production, you'd want to track the user's organization ID
		this.organizationsService.getOrganizationProfile(storedEmail).subscribe({
			next: (profile) => {
				// For now, we'll use the organization ID from the profile
				// In a real scenario, you might store this in localStorage or get it from the profile response
				// For this demo, we'll assume the first organization (ID 1) or derive it from profile
				const organizationId = profile.id ?? null;
				this.organizationId.set(organizationId);

				if (!organizationId) {
					this.dashboardError.set('No se pudo determinar la organización.');
					this.isLoading.set(false);
					return;
				}

				this.organizationsService.getDashboardData(organizationId).subscribe({
					next: (data) => {
						this.dashboardStats.set(data.stats);
						this.upcomingOpportunities.set(data.recentOpportunities);
						this.recentApplications.set(data.recentApplications);
						this.isLoading.set(false);
					},
					error: (error) => {
						console.error('Error loading dashboard data:', error);
						this.dashboardError.set('Error al cargar datos del dashboard.');
						this.isLoading.set(false);
					}
				});
			},
			error: (error) => {
				console.error('Error loading organization profile:', error);
				this.dashboardError.set('Error al cargar perfil de organización.');
				this.isLoading.set(false);
			}
		});
	}

	openApplicationsModal(): void {
		const organizationId = this.organizationId();
		if (!organizationId) {
			alert('No se pudo determinar la organización.');
			return;
		}

		this.organizationsService.getOrganizationApplications(organizationId).subscribe({
			next: (applications) => {
				this.organizationApplications.set(applications);
				this.isApplicationsModalOpen.set(true);
			},
			error: (error) => {
				console.error('Error loading organization applications:', error);
				alert('Error al cargar aplicaciones de la organización.');
			}
		});
	}

	closeApplicationsModal(): void {
		this.isApplicationsModalOpen.set(false);
	}

	onApplicationAction(event: { applicationId: number; status: 'accepted' | 'rejected' }): void {
		const organizationId = this.organizationId();
		if (!organizationId) {
			alert('No se pudo determinar la organización.');
			return;
		}

		this.organizationsService.updateOrganizationApplicationStatus(organizationId, event.applicationId, event.status)
			.subscribe({
				next: () => {
					this.loadDashboardData();
				},
				error: (error) => {
					console.error('Error updating application status:', error);
					alert('Error al actualizar el estado de la aplicación.');
				}
			});
	}

	formatStatus(status: string): string {
		const statusMap: { [key: string]: string } = {
			'submitted': 'Pending',
			'reviewed': 'Pending',
			'accepted': 'Approved',
			'rejected': 'Rejected',
		};
		return statusMap[status.toLowerCase()] || status;
	}

	getStatusClass(status: string): string {
		const classMap: { [key: string]: string } = {
			'submitted': 'pending',
			'reviewed': 'pending',
			'accepted': 'approved',
			'rejected': 'rejected',
		};
		return classMap[status.toLowerCase()] || '';
	}

	// Opportunities modal methods
	openOpportunitiesModal(): void {
		// Load all opportunities
		const organizationId = this.organizationId();
		if (!organizationId) {
			alert('No se pudo determinar la organización.');
			return;
		}
		this.organizationsService.getOrganizationOpportunities(organizationId).subscribe({
			next: (opportunities) => {
				this.allOpportunities.set(opportunities);
				this.isOpportunitiesModalOpen.set(true);
			},
			error: (error) => {
				console.error('Error loading opportunities:', error);
				alert('Error al cargar oportunidades.');
			}
		});
	}

	closeOpportunitiesModal(): void {
		this.isOpportunitiesModalOpen.set(false);
	}

	onOpportunityDeleted(opportunityId: number): void {
		if (confirm('¿Estás seguro de que quieres eliminar esta oportunidad?')) {
			const organizationId = this.organizationId();
			if (!organizationId) {
				alert('No se pudo determinar la organización.');
				return;
			}
			this.organizationsService.deleteOrganizationOpportunity(organizationId, opportunityId).subscribe({
				next: () => {
					// Remove from local array
					this.allOpportunities.update(opps => opps.filter(opp => opp.id !== opportunityId));
					// Refresh dashboard data
					this.loadDashboardData();
				},
				error: (error) => {
					console.error('Error deleting opportunity:', error);
					alert('Error al eliminar la oportunidad.');
				}
			});
		}
	}

	// Create opportunity modal methods
	openCreateOpportunityModal(): void {
		this.router.navigate(['/organization/new-opportunity']);
	}

	// modal removed: no close method required

	onOpportunityCreated(): void {
		// Refresh dashboard data after a creation flow
		this.loadDashboardData();
	}

	private loadDashboardData(): void {
		const organizationId = this.organizationId();
		if (!organizationId) {
			console.warn('No organizationId available when loading dashboard data.');
			return;
		}
		this.organizationsService.getDashboardData(organizationId).subscribe({
			next: (data) => {
				this.dashboardStats.set(data.stats);
				this.upcomingOpportunities.set(data.recentOpportunities);
				this.recentApplications.set(data.recentApplications);
			},
			error: (error) => {
				console.error('Error refreshing dashboard data:', error);
			}
		});
	}
}
