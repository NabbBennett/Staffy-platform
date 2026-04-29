import { CommonModule } from '@angular/common';
import { Component, signal, inject, OnInit, computed, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { OpportunitiesService, OpportunityDetail } from '../../../../services/opportunities.service';

@Component({
	selector: 'app-oportunity-card',
	standalone: true,
	imports: [CommonModule, RouterLink],
	templateUrl: './oportunity-card.component.html',
	styleUrls: ['./oportunity-card.component.css']
})
export class OportunityCardComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly opportunitiesService = inject(OpportunitiesService);
	private readonly imageBaseUrl = this.resolveImageBaseUrl();
	private readonly destroyRef = inject(DestroyRef);

	readonly opportunity = signal<OpportunityDetail | null>(null);
	readonly loading = signal(false);
	readonly error = signal<string | null>(null);
	readonly isFull = computed(() => {
		const item = this.opportunity();
		return !item || item.registered >= item.totalSpots;
	});
	readonly spotsLeft = computed(() => {
		const item = this.opportunity();
		if (!item) return 0;
		return Math.max(item.totalSpots - item.registered, 0);
	});

	readonly progressWidth = computed(() => {
		const item = this.opportunity();
		if (!item) return '0%';
		if (item.totalSpots <= 0) return '0%';
		const percentage = Math.min(100, Math.round((item.registered / item.totalSpots) * 100));
		return `${percentage}%`;
	});

	ngOnInit(): void {
		// Cargar al inicializar
		const id = Number(this.route.snapshot.paramMap.get('id'));
		if (id > 0) {
			this.loadOpportunity(id);
		}

		// Recarga cuando vuelves a la ruta
		this.router.events
			.pipe(
				filter((event) => event instanceof NavigationEnd),
				takeUntilDestroyed(this.destroyRef)
			)
			.subscribe(() => {
				const currentId = Number(this.route.snapshot.paramMap.get('id'));
				if (currentId > 0) {
					this.loadOpportunity(currentId);
				}
			});
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

	private loadOpportunity(id: number): void {
		this.loading.set(true);
		this.error.set(null);

		this.opportunitiesService.getOpportunityById(id).subscribe({
			next: (data) => {
				this.opportunity.set(data);
				this.loading.set(false);
			},
			error: (err) => {
				console.error('Error loading opportunity:', err);
				this.error.set('Error al cargar la oportunidad. Intenta de nuevo más tarde.');
				this.loading.set(false);
			}
		});
	}
}
