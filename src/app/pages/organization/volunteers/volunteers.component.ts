import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { OrganizationsService, Volunteer } from '../../../services/organizations.service';

@Component({
  selector: 'app-organization-volunteers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './volunteers.component.html',
  styleUrls: ['./volunteers.component.css']
})
export class VolunteersComponent implements OnInit {
  private readonly organizationsService = inject(OrganizationsService);
  private readonly isLoading = signal(true);
  private readonly volunteersError = signal('');

  readonly volunteers = signal<Volunteer[]>([]);
  readonly organizationId = signal<number | null>(null);
  readonly showModal = signal(false);
  readonly selectedVolunteer = signal<Volunteer | null>(null);
  readonly searchQuery = signal('');
  readonly statusFilter = signal('All Status');

  readonly filteredVolunteers = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const status = this.statusFilter();

    return this.volunteers().filter((volunteer) => {
      const matchesSearch =
        volunteer.name.toLowerCase().includes(query) ||
        volunteer.email.toLowerCase().includes(query);

      const matchesStatus =
        status === 'All Status' || volunteer.status === status.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  });

  readonly stats = computed(() => {
    const vols = this.volunteers();
    const activeCount = vols.filter((v) => v.status === 'active').length;
    const newCount = vols.filter((v) => v.status === 'new').length;
    const inactiveCount = vols.filter((v) => v.status === 'inactive').length;
    const totalHours = vols.reduce((sum, v) => sum + v.hours, 0);
    const avgRating = vols.length > 0
      ? (vols.reduce((sum, v) => sum + v.rating, 0) / vols.length).toFixed(1)
      : '0.0';

    return [
      {
        label: 'Voluntarios',
        value: vols.length.toString(),
        hint: `${activeCount} active`,
        tone: 'blue',
      },
      {
        label: 'Horas Servidas',
        value: totalHours.toString(),
        hint: 'Este año',
        tone: 'green',
      },
      {
        label: 'Promedio de Calificación',
        value: avgRating,
        hint: 'From reviews',
        tone: 'orange',
      },
      {
        label: 'Tasa de Finalización',
        value: activeCount > 0
          ? Math.round((activeCount / vols.length) * 100) + '%'
          : '0%',
        hint: 'Voluntarios activos',
        tone: 'purple',
      },
    ];
  });

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const storedEmail = localStorage.getItem('staffy_user_email')?.trim().toLowerCase() ?? '';

    if (!storedEmail) {
      this.volunteersError.set('No se encontró una sesión activa.');
      this.isLoading.set(false);
      return;
    }

    this.organizationsService.getOrganizationProfile(storedEmail).subscribe({
      next: (profile) => {
        const organizationId = profile.id;
        this.organizationId.set(organizationId);

        this.organizationsService.getOrganizationVolunteers(organizationId).subscribe({
          next: (volunteers) => {
            this.volunteers.set(volunteers);
            this.isLoading.set(false);
          },
          error: (error) => {
            console.error('Error loading volunteers:', error);
            this.volunteersError.set('Error al cargar voluntarios.');
            this.isLoading.set(false);
          },
        });
      },
      error: (error) => {
        console.error('Error loading organization profile:', error);
        this.volunteersError.set('Error al cargar perfil de organización.');
        this.isLoading.set(false);
      },
    });
  }

  onMarkComplete(volunteer: Volunteer): void {
    const orgId = this.organizationId();
    if (!orgId) {
      console.error('Organization id not set');
      return;
    }

    this.organizationsService.markVolunteerComplete(orgId, volunteer.id).subscribe({
      next: () => {
        const updated = this.volunteers().map((v) => {
          if (v.id === volunteer.id) {
            return { ...v, opportunities: v.opportunities + 1, status: 'active' } as Volunteer;
          }
          return v;
        });
        this.volunteers.set(updated as Volunteer[]);
      },
      error: (err) => console.error('Error marking volunteer complete', err),
    });
  }

  onRate(volunteer: Volunteer): void {
    const orgId = this.organizationId();
    if (!orgId) {
      console.error('Organization id not set');
      return;
    }

    const input = window.prompt('Ingresa la calificación (0-5) para ' + volunteer.name + ':', String(volunteer.rating ?? 0));
    if (input === null) {
      return;
    }
    const rating = Number(input);
    if (isNaN(rating) || rating < 0 || rating > 5) {
      alert('Calificación inválida. Debe ser un número entre 0 y 5.');
      return;
    }

    this.organizationsService.rateVolunteer(orgId, volunteer.id, rating).subscribe({
      next: () => {
        const updated = this.volunteers().map((v) => v.id === volunteer.id ? ({ ...v, rating } as Volunteer) : v);
        this.volunteers.set(updated as Volunteer[]);
      },
      error: (err) => console.error('Error rating volunteer', err),
    });
  }

  openModal(volunteer: Volunteer): void {
    console.log('openModal called for', volunteer?.email ?? volunteer?.name);
    this.selectedVolunteer.set(volunteer);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.selectedVolunteer.set(null);
    this.showModal.set(false);
  }

  onAccept(volunteer: Volunteer): void {
    const orgId = this.organizationId();
    if (!orgId) return;
    this.organizationsService.setVolunteerStatus(orgId, volunteer.id, 'active').subscribe({
      next: () => {
        const updated = this.volunteers().map((v) => v.id === volunteer.id ? ({ ...v, status: 'active' } as Volunteer) : v);
        this.volunteers.set(updated as Volunteer[]);
        this.closeModal();
      },
      error: (err) => console.error('Error accepting volunteer', err),
    });
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  onStatusFilterChange(status: string): void {
    this.statusFilter.set(status);
  }

  formatStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'active': 'Active',
      'new': 'New',
      'inactive': 'Inactive',
    };
    return statusMap[status.toLowerCase()] || status;
  }
}