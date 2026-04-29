import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output, computed, signal } from '@angular/core';
import { Application } from '../../../../services/organizations.service';

@Component({
	selector: 'app-applications-modal',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './applications-modal.component.html',
	styleUrls: ['./applications-modal.component.css']
})
export class ApplicationsModalComponent {
	@Input({ required: true }) applications: Application[] = [];
	@Input() itemsPerPage = 4;
	@Output() closed = new EventEmitter<void>();
	@Output() action = new EventEmitter<{ applicationId: number; status: 'accepted' | 'rejected' }>();

	currentPage = signal(1);

	readonly paginatedApplications = computed(() => {
		const startIndex = (this.currentPage() - 1) * this.itemsPerPage;
		return this.applications.slice(startIndex, startIndex + this.itemsPerPage);
	});

	readonly totalPages = computed(() =>
		Math.max(1, Math.ceil(this.applications.length / this.itemsPerPage)),
	);

	closeModal(): void {
		this.closed.emit();
	}

	previousPage(): void {
		this.goToPage(this.currentPage() - 1);
	}

	nextPage(): void {
		this.goToPage(this.currentPage() + 1);
	}

	goToPage(page: number): void {
		const boundedPage = Math.min(Math.max(page, 1), this.totalPages());
		this.currentPage.set(boundedPage);
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

	@HostListener('document:keydown.escape')
	onEscape(): void {
		this.closeModal();
	}

	emitAction(applicationId: number, status: 'accepted' | 'rejected'): void {
		this.action.emit({ applicationId, status });
	}
}

export interface ApplicationItem extends Application {}