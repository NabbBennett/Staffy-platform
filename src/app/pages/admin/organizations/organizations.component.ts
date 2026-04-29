import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, Organization } from '../../../services/admin.service';

@Component({
  selector: 'app-admin-organizations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './organizations.component.html',
  styleUrls: ['./organizations.component.css']
})
export class AdminOrganizationsComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly organizations = signal<Organization[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly selectedStatus = signal<'all' | 'active' | 'pending'>('all');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalOrganizations = signal(0);

  readonly selectedOrg = signal<Organization | null>(null);
  readonly showOrgDetails = signal(false);

  readonly filteredOrganizations = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    return this.organizations().filter(org =>
      org.name.toLowerCase().includes(query) ||
      org.email.toLowerCase().includes(query)
    );
  });

  readonly totalPages = computed(() =>
    Math.ceil(this.totalOrganizations() / this.pageSize())
  );

  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const maxPages = 5;
    
    // Calcular el rango de páginas a mostrar (2 antes, actual, 2 después)
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + maxPages - 1);
    
    // Ajustar el inicio si estamos al final y no tenemos suficientes páginas
    if (end - start + 1 < maxPages) {
      start = Math.max(1, end - maxPages + 1);
    }
    
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  readonly verifiedCount = computed(() => this.organizations().filter(o => o.verified).length);
  readonly pendingCount = computed(() => this.organizations().filter(o => o.status === 'pending').length);
  readonly activeCount = computed(() => this.organizations().filter(o => o.status === 'active').length);

  ngOnInit(): void {
    this.loadOrganizations();
  }

  loadOrganizations(): void {
    this.loading.set(true);
    this.error.set(null);

    const status = this.selectedStatus() === 'all' ? undefined : this.selectedStatus();

    this.adminService.getOrganizations(
      this.currentPage(),
      this.pageSize(),
      this.searchQuery(),
      status
    ).subscribe({
      next: (response) => {
        this.organizations.set(response.data);
        this.totalOrganizations.set(response.total);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading organizations:', err);
        this.error.set('Error al cargar las organizaciones. Intenta de nuevo.');
        this.loading.set(false);
      }
    });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadOrganizations();
  }

  onStatusChange(): void {
    this.currentPage.set(1);
    this.loadOrganizations();
  }

  viewOrgDetails(org: Organization): void {
    this.selectedOrg.set(org);
    this.showOrgDetails.set(true);
  }

  closeOrgDetails(): void {
    this.showOrgDetails.set(false);
    this.selectedOrg.set(null);
  }

  verifyOrganization(org: Organization): void {
    if (org.verified) {
      alert('Esta organización ya está verificada.');
      return;
    }

    if (!confirm(`¿Verificar a ${org.name}?`)) return;

    this.adminService.verifyOrganization(org.id).subscribe({
      next: (updatedOrg) => {
        this.organizations.update(orgs =>
          orgs.map(o => o.id === updatedOrg.id ? updatedOrg : o)
        );
        if (this.selectedOrg()?.id === org.id) {
          this.selectedOrg.set(updatedOrg);
        }
      },
      error: (err) => {
        console.error('Error verifying organization:', err);
        this.error.set('Error al verificar la organización.');
      }
    });
  }

  deleteOrganization(org: Organization): void {
    if (!confirm(`¿Eliminar organización ${org.name}? Esta acción no se puede deshacer.`)) return;

    this.adminService.deleteOrganization(org.id).subscribe({
      next: () => {
        this.organizations.update(orgs => orgs.filter(o => o.id !== org.id));
        this.totalOrganizations.update(total => total - 1);
        this.closeOrgDetails();
      },
      error: (err) => {
        console.error('Error deleting organization:', err);
        this.error.set('Error al eliminar la organización.');
      }
    });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadOrganizations();
    }
  }

  getStatusBadgeClass(status: string): string {
    return `status-badge ${status}`;
  }
}
