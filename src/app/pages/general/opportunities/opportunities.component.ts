import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OpportunitiesService } from '../../../services/opportunities.service';

interface Opportunity {
  id: number;
  organization_id: number;
  title: string;
  category: string;
  organization_name: string;
  organization_logo?: string | null;
  image_url?: string;
  description?: string;
  location?: string;
  start_date?: string;
  duration?: string;
  spots_available?: number;
  is_urgent?: boolean;
  tags?: string[];
}

interface OpportunityCategory {
  value: string;
  label: string;
}

@Component({
  selector: 'app-opportunities',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './opportunities.component.html',
  styleUrls: ['./opportunities.component.css']
})


export class OpportunitiesComponent implements OnInit {
  private readonly opportunitiesService = inject(OpportunitiesService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly imageBaseUrl = this.resolveImageBaseUrl();

  readonly opportunities = signal<Opportunity[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly selectedCategory = signal('all');
  readonly selectedOrganizationId = signal<number | null>(null);
  readonly currentPage = signal(1);
  readonly itemsPerPage = 6;

  readonly categories: OpportunityCategory[] = [
    { value: 'all', label: 'Todas las categorías' },
    { value: 'Food & Nutrition', label: 'Alimentación y nutrición' },
    { value: 'Education', label: 'Educación' },
    { value: 'Healthcare', label: 'Salud' },
    { value: 'Environment', label: 'Medio ambiente' },
    { value: 'Animal Welfare', label: 'Bienestar animal' },
    { value: 'Community Service', label: 'Servicio comunitario' }
  ];

  readonly filteredOpportunities = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const category = this.selectedCategory();
    const organizationId = this.selectedOrganizationId();

    return this.opportunities().filter((opp) => {
      const matchesCategory =
        category === 'all' ||
        opp.category.toLowerCase() === category.toLowerCase();

      const matchesOrganization =
        organizationId === null || opp.organization_id === organizationId;

      const matchesQuery =
        query.length === 0 ||
        opp.title.toLowerCase().includes(query) ||
        opp.organization_name.toLowerCase().includes(query) ||
        opp.location?.toLowerCase().includes(query) ||
        opp.category.toLowerCase().includes(query);

      return matchesCategory && matchesOrganization && matchesQuery;
    });
  });

  readonly totalPages = computed(() =>
    Math.ceil(this.filteredOpportunities().length / this.itemsPerPage)
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

  readonly paginatedOpportunities = computed(() => {
    const filtered = this.filteredOpportunities();
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  });

  ngOnInit(): void {
    this.syncOrganizationFilterFromRoute(this.route.snapshot.queryParamMap.get('organizationId'));

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.syncOrganizationFilterFromRoute(params.get('organizationId'));
    });

    this.loadOpportunities();
  }

  loadOpportunities(): void {
    this.loading.set(true);
    this.error.set(null);

    this.opportunitiesService.getOpportunities().subscribe({
      next: (data) => {
        const opportunities = (data as any[]).map((opp) => ({
          id: opp.id,
          organization_id: opp.organization_id,
          title: opp.title,
          category: opp.category ?? '',
          organization_name: opp.organization_name,
          image_url: opp.image_url,
          description: opp.description,
          location: opp.location,
          start_date: opp.opportunity_date || opp.start_date,
          duration: opp.duration,
          spots_available: opp.spots_available,
          is_urgent: opp.is_urgent,
          tags: opp.tags
        }));
        this.opportunities.set(opportunities);
        this.currentPage.set(1);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading opportunities:', err);
        this.error.set('Error al cargar oportunidades. Intenta de nuevo más tarde.');
        this.loading.set(false);
      }
    });
  }

  onCategoryChange(category: string): void {
    this.selectedCategory.set(category);
    this.currentPage.set(1);
  }

  private syncOrganizationFilterFromRoute(organizationIdParam: string | null): void {
    const parsedId = organizationIdParam ? Number(organizationIdParam) : null;
    const normalizedId = parsedId && Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;

    this.selectedOrganizationId.set(normalizedId);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  getImageUrl(imageUrl: string | undefined | null): string | null {
    if (!imageUrl) {
      return null;
    }

    const normalizedUrl = imageUrl.trim().replace(/\\/g, '/');

    if (normalizedUrl.startsWith('data:image')) {
      return normalizedUrl;
    }

    if (/^https?:\/\//i.test(normalizedUrl)) {
      return normalizedUrl;
    }

    const relativePath = normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`;
    return `${this.imageBaseUrl}${relativePath}`;
  }

  private resolveImageBaseUrl(): string {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }

    return 'http://localhost:4200';
  }
}


