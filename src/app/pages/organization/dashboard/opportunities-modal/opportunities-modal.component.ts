import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Opportunity } from '../../../../services/organizations.service';

@Component({
	selector: 'app-opportunities-modal',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './opportunities-modal.component.html',
	styleUrls: ['./opportunities-modal.component.css']
})
export class OpportunitiesModalComponent {
	@Input() opportunities: Opportunity[] = [];
	@Input() itemsPerPage = 10;
	@Output() closed = new EventEmitter<void>();
	@Output() opportunityDeleted = new EventEmitter<number>();

	private readonly router = inject(Router);
	private readonly imageBaseUrl = this.resolveImageBaseUrl();

	currentPage = signal(1);
	isDeleting = signal<number | null>(null);

	get paginatedOpportunities() {
		const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
		const endIndex = startIndex + this.itemsPerPage;
		return this.opportunities.slice(startIndex, endIndex);
	}

	get totalPages() {
		return Math.ceil(this.opportunities.length / this.itemsPerPage);
	}

	closeModal() {
		this.closed.emit();
	}

	nextPage() {
		if (this.currentPage() < this.totalPages) {
			this.currentPage.update(page => page + 1);
		}
	}

	previousPage() {
		if (this.currentPage() > 1) {
			this.currentPage.update(page => page - 1);
		}
	}

	formatDate(dateString: string): string {
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('es-ES', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return dateString;
		}
	}

	getStatusText(opportunity: Opportunity): string {
		const available = opportunity.total_spots - opportunity.registered;
		if (available <= 0) return 'Completo';
		if (available <= 2) return 'Casi lleno';
		return 'Disponible';
	}

	getStatusClass(opportunity: Opportunity): string {
		const available = opportunity.total_spots - opportunity.registered;
		if (available <= 0) return 'full';
		if (available <= 2) return 'almost-full';
		return 'available';
	}

	deleteOpportunity(opportunityId: number, event: Event) {
		event.stopPropagation();

		if (confirm('¿Estás seguro de que quieres eliminar esta oportunidad? Esta acción no se puede deshacer.')) {
			this.isDeleting.set(opportunityId);
			// For now, just emit the event. The parent component will handle the actual deletion
			this.opportunityDeleted.emit(opportunityId);
		}
	}

	editOpportunity(opportunityId: number, event: Event) {
		event.stopPropagation();
		this.router.navigate(['/organization/new-opportunity'], { queryParams: { edit: opportunityId } });
		this.closed.emit();
	}

	stopPropagation(event: Event) {
		event.stopPropagation();
	}

	getImageUrl(imageUrl: string): string {
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

