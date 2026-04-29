import { CommonModule } from '@angular/common';
import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrganizationProfileModalComponent } from '../../../components/organizations/organizations.component';
import { OrganizationsService } from '../../../services/organizations.service';

interface Organization {
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

@Component({
	selector: 'app-organizations',
	standalone: true,
	imports: [CommonModule, FormsModule, OrganizationProfileModalComponent],
	templateUrl: './organizations.component.html',
	styleUrls: ['./organizations.component.css']
})
export class OrganizationsComponent implements OnInit {
	private readonly organizationsService = inject(OrganizationsService);

	searchQuery = signal('');
	selectedCategory = signal('Todas las Categorías');
	selectedOrganization = signal<Organization | null>(null);
	readonly organizations = signal<Organization[]>([]);
	readonly loading = signal(false);
	readonly error = signal<string | null>(null);

	readonly categories = [
		'Todas las Categorías',
		'Food & Nutrition',
		'Environment',
		'Education',
		'Animal Welfare',
		'Healthcare',
		'Community Service'
	];

	readonly filteredOrganizations = computed(() => {
		const query = this.searchQuery().trim().toLowerCase();
		const category = this.selectedCategory();

		return this.organizations().filter((organization) => {
			const matchesCategory =
				category === 'Todas las Categorías' || organization.category === category;
			const matchesQuery =
				query.length === 0 ||
				organization.name.toLowerCase().includes(query) ||
				organization.description.toLowerCase().includes(query) ||
				organization.location.toLowerCase().includes(query);

			return matchesCategory && matchesQuery;
		});
	});

	readonly totalOpportunities = computed(() =>
		this.organizations().reduce((sum, organization) => sum + organization.opportunities, 0)
	);

	readonly totalVolunteers = computed(() =>
		this.organizations().reduce((sum, organization) => sum + organization.volunteers, 0)
	);

	ngOnInit(): void {
		this.loadOrganizations();
	}

	loadOrganizations(): void {
		this.loading.set(true);
		this.error.set(null);

		this.organizationsService.getOrganizations().subscribe({
			next: (data) => {
				this.organizations.set(data);
				this.loading.set(false);
			},
			error: (err) => {
				console.error('Error loading organizations:', err);
				this.error.set('Error al cargar organizaciones. Intenta de nuevo más tarde.');
				this.loading.set(false);
			}
		});
	}

	onCategoryChange(category: string): void {
		this.selectedCategory.set(category);
	}

	openProfileModal(organization: Organization): void {
		this.selectedOrganization.set(organization);
	}

	closeProfileModal(): void {
		this.selectedOrganization.set(null);
	}
}
