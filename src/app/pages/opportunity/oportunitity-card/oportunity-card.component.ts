import { CommonModule } from '@angular/common';
import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OpportunitiesService, OpportunityDetail } from '../../../services/opportunities.service';

@Component({
	selector: 'app-oportunity-card',
	standalone: true,
	imports: [CommonModule, RouterLink],
	templateUrl: './oportunity-card.component.html',
	styleUrls: ['./oportunity-card.component.css']
})
export class OportunityCardComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly opportunitiesService = inject(OpportunitiesService);
	private readonly imageBaseUrl = this.resolveImageBaseUrl();

	readonly opportunity = signal<OpportunityDetail | null>(null);
	readonly loading = signal(false);
	readonly error = signal<string | null>(null);

	readonly progressWidth = computed(() => {
		const item = this.opportunity();
		if (!item) return '0%';
		return `${Math.round((item.registered / item.totalSpots) * 100)}%`;
	});

	ngOnInit(): void {
		const id = Number(this.route.snapshot.paramMap.get('id'));
		if (id > 0) {
			this.loadOpportunity(id);
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
