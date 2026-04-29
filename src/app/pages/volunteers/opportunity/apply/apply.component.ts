import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OpportunitiesService } from '../../../../services/opportunities.service';

@Component({
	selector: 'app-apply',
	standalone: true,
	imports: [CommonModule, FormsModule, RouterLink],
	templateUrl: './apply.component.html',
	styleUrls: ['./apply.component.css']
})
export class ApplyComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly opportunitiesService = inject(OpportunitiesService);
	private readonly platformId = inject(PLATFORM_ID) as Object;

	readonly opportunityId = Number(this.route.snapshot.paramMap.get('id')) || 1;
	readonly opportunityTitle = signal('');
	readonly submitting = signal(false);
	readonly submitSuccess = signal(false);
	readonly submitError = signal<string | null>(null);

	fullName = '';
	email = '';
	phone = '';
	relevantExperience = '';
	motivation = '';
	confirmAvailability = false;
	acceptTerms = false;
	submitAttempted = false;

	ngOnInit(): void {
		const storedEmail = this.getStoredEmail();
		const storedName = this.getStoredName();
		if (storedEmail) {
			this.email = storedEmail;
		}
		if (storedName) {
			this.fullName = storedName;
		}

		if (this.opportunityId > 0) {
			this.opportunitiesService.getOpportunityById(this.opportunityId).subscribe({
				next: (data) => {
					this.opportunityTitle.set(data.title);
				},
				error: (err) => {
					console.error('Error loading opportunity:', err);
				}
			});
		}
	}

	private getStoredEmail(): string | null {
		if (!isPlatformBrowser(this.platformId)) {
			return null;
		}

		const email = localStorage.getItem('staffy_user_email')?.trim().toLowerCase() || '';
		return email || null;
	}

	private getStoredName(): string | null {
		if (!isPlatformBrowser(this.platformId)) {
			return null;
		}

		const name = localStorage.getItem('staffy_user_name')?.trim() || '';
		return name || null;
	}

	submitApplication(form: NgForm): void {
		this.submitAttempted = true;

		if (form.invalid || !this.confirmAvailability || !this.acceptTerms) {
			return;
		}

		const emailToSend = this.getStoredEmail() || this.email;
		const fullNameToSend = this.getStoredName() || this.fullName;

		this.submitting.set(true);
		this.submitError.set(null);

		this.opportunitiesService.submitApplication(this.opportunityId, {
			fullName: fullNameToSend,
			email: emailToSend,
			phone: this.phone,
			relevantExperience: this.relevantExperience,
			motivation: this.motivation,
			confirmAvailability: this.confirmAvailability,
			acceptTerms: this.acceptTerms
		}).subscribe({
			next: (response) => {
				this.submitting.set(false);
				this.submitSuccess.set(true);
				setTimeout(() => {
					this.router.navigate(['/opportunities', this.opportunityId]);
				}, 2000);
			},
			error: (err) => {
				console.error('Error submitting application:', err);
				if (err?.status === 409) {
					this.submitError.set(err?.error?.message || 'No se pudo completar la postulación.');
				} else {
					this.submitError.set('Error al enviar la aplicación. Intenta de nuevo.');
				}
				this.submitting.set(false);
			}
		});
	}

	onPhoneInput(event: Event): void {
		const input = event.target as HTMLInputElement;
		const digitsOnly = input.value.replace(/\D/g, '').slice(0, 10);
		input.value = digitsOnly;
		this.phone = digitsOnly;
	}

	cancel(): void {
		this.router.navigate(['/opportunities', this.opportunityId]);
	}
}
