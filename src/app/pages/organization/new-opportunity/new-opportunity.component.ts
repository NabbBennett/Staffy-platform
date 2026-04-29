import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
	OrganizationsService,
	OpportunityDetail,
	} from '../../../services/organizations.service';

type StepId = 1 | 2 | 3 | 4;

interface OpportunityFormState {
	title: string;
	category: string;
	description: string;
	urgent: boolean;
	date: string;
	startTime: string;
	duration: string;
	locationName: string;
	fullAddress: string;
	spots: number;
	requirements: string[];
	responsibilities: string[];
	skills: string[];
	about: string;
}

const CATEGORY_OPTIONS = [
	{ value: 'Food & Nutrition', label: 'Alimentación y nutrición' },
	{ value: 'Education', label: 'Educación' },
	{ value: 'Healthcare', label: 'Salud' },
	{ value: 'Environment', label: 'Medio ambiente' },
	{ value: 'Animal Welfare', label: 'Bienestar animal' },
	{ value: 'Community Service', label: 'Servicio comunitario' },
	{ value: 'Other', label: 'Otro' },
];

@Component({
	selector: 'app-new-opportunity',
	standalone: true,
	imports: [CommonModule, FormsModule, RouterLink],
	templateUrl: './new-opportunity.component.html',
	styleUrls: ['./new-opportunity.component.css']
})
export class NewOpportunityComponent implements OnInit {
	private readonly organizationsService = inject(OrganizationsService);
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);

	readonly categoryOptions = CATEGORY_OPTIONS;
	readonly currentStep = signal<StepId>(1);
	readonly isSubmitting = signal(false);
	readonly isPublished = signal(false);
	readonly selectedImage = signal<File | null>(null);
	readonly existingImageUrl = signal<string>('');
	readonly organizationName = signal('Tu organización');
	readonly organizationId = signal<number | null>(null);
	readonly editingOpportunityId = signal<number | null>(null);
	readonly formError = signal('');
	readonly formSuccess = signal('');

	readonly newTag = signal('');
	readonly newRequirement = signal('');
	readonly newResponsibility = signal('');
	readonly newSkill = signal('');

	readonly form = signal<OpportunityFormState>({
		title: '',
		category: 'Food & Nutrition',
		description: '',
		urgent: false,
		date: '',
		startTime: '',
		duration: '',
		locationName: '',
		fullAddress: '',
		spots: 1,
		requirements: [],
		responsibilities: [],
		skills: [],
		about: '',
	});

	readonly completion = computed(() => {
		const form = this.form();
		const total = 4;
		let completed = 0;

		if (form.title.trim() && form.category.trim() && form.description.trim()) completed++;
		if (form.date && form.startTime && form.duration.trim() && form.locationName.trim() && form.fullAddress.trim() && form.spots > 0) completed++;
		if (form.responsibilities.length > 0 && form.requirements.length > 0) completed++;
		if (form.description.trim()) completed++;

		return Math.round((completed / total) * 100);
	});

	readonly selectedCategoryLabel = computed(() => {
		return this.categoryOptions.find((option) => option.value === this.form().category)?.label ?? this.form().category;
	});

	readonly previewImageUrl = computed(() => {
		const file = this.selectedImage();
		if (file) return URL.createObjectURL(file);
		if (this.existingImageUrl()) return this.resolveImageUrl(this.existingImageUrl());
		return '';
	});

	readonly isEditing = computed(() => this.editingOpportunityId() !== null);

	constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

	ngOnInit(): void {
		if (!isPlatformBrowser(this.platformId)) {
			return;
		}

		const storedEmail = localStorage.getItem('staffy_user_email')?.trim().toLowerCase() ?? '';
		const editId = Number(this.route.snapshot.queryParamMap.get('edit'));
		if (Number.isInteger(editId) && editId > 0) {
			this.editingOpportunityId.set(editId);
		}

		if (!storedEmail) {
			this.formError.set('No se encontró una sesión activa. Vuelve a iniciar sesión.');
			return;
		}

		this.organizationsService.getOrganizationProfile(storedEmail).subscribe({
			next: (profile) => {
				this.organizationId.set(profile.id);
				this.organizationName.set(profile.name);
				this.tryLoadOpportunityForEdit();
			},
			error: () => {
				this.formError.set('No pudimos cargar los datos de tu organización.');
			},
		});
	}

	private tryLoadOpportunityForEdit(): void {
		const opportunityId = this.editingOpportunityId();
		if (!opportunityId) {
			return;
		}

		this.organizationsService.getOpportunityById(opportunityId).subscribe({
			next: (opportunity) => {
				console.log('[NewOpportunity] loaded opportunity for edit', opportunity);
				this.fillFormFromOpportunity(opportunity);
			},
			error: (error) => {
				console.error('Error loading opportunity for edit:', error);
				this.formError.set('No pudimos cargar la oportunidad para editarla.');
			},
		});
	}

	private fillFormFromOpportunity(opportunity: OpportunityDetail): void {
		this.form.set({
			title: opportunity.title ?? '',
			category: opportunity.category ?? 'Food & Nutrition',
			description: opportunity.about ?? '',
			urgent: false,
			date: this.normalizeDateForInput(opportunity.date),
			startTime: this.extractStartTime(opportunity.timeAndDuration),
			duration: this.extractDuration(opportunity.timeAndDuration),
			locationName: this.extractLocationName(opportunity.location),
			fullAddress: this.extractFullAddress(opportunity.location),
			spots: opportunity.totalSpots ?? 1,
			requirements: opportunity.requirements ?? [],
			responsibilities: opportunity.responsibilities ?? [],
			skills: opportunity.tags ?? [],
			about: opportunity.about ?? '',
		});

		this.existingImageUrl.set(opportunity.image ?? '');
	}

	private normalizeDateForInput(value: string): string {
		if (!value) return '';
		if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
			return value.slice(0, 10);
		}

		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
	}

	private extractStartTime(value: string): string {
		if (!value) return '';
		const match = value.match(/(\d{1,2}:\d{2}\s?[AP]M|\d{2}:\d{2})/i);
		return match?.[0]?.replace(/\s+/g, ' ') ?? '';
	}

	private extractDuration(value: string): string {
		if (!value) return '';
		const parts = value.split('·');
		return parts.length > 1 ? parts[1].trim() : value.trim();
	}

	private extractLocationName(value: string): string {
		if (!value) return '';
		const parts = value.split('—');
		return parts[0]?.trim() ?? value.trim();
	}

	private extractFullAddress(value: string): string {
		if (!value) return '';
		const parts = value.split('—');
		return parts.length > 1 ? parts.slice(1).join('—').trim() : value.trim();
	}

	private resolveImageUrl(imageUrl: string): string {
		if (!imageUrl) {
			return '';
		}

		if (imageUrl.startsWith('http')) {
			return imageUrl;
		}

		return imageUrl;
	}

	goToStep(step: StepId): void {
		this.currentStep.set(step);
	}

	goNext(): void {
		if (this.currentStep() < 4) {
			this.currentStep.set((this.currentStep() + 1) as StepId);
		}
	}

	goBack(): void {
		if (this.currentStep() > 1) {
			this.currentStep.set((this.currentStep() - 1) as StepId);
		}
	}

	updateField<K extends keyof OpportunityFormState>(field: K, value: OpportunityFormState[K]): void {
		this.form.update((current) => ({
			...current,
			[field]: value,
		}));
	}

	selectImage(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0] ?? null;

		if (!file) {
			this.selectedImage.set(null);
			return;
		}

		if (!file.type.startsWith('image/')) {
			this.formError.set('Selecciona una imagen válida.');
			input.value = '';
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			this.formError.set('La imagen no debe superar los 5MB.');
			input.value = '';
			return;
		}

		this.formError.set('');
		this.selectedImage.set(file);
	}

	addRequirement(): void {
		const value = this.newRequirement().trim();
		if (!value) return;

		this.form.update((current) => ({
			...current,
			requirements: [...current.requirements, value],
		}));
		this.newRequirement.set('');
	}

	addResponsibility(): void {
		const value = this.newResponsibility().trim();
		if (!value) return;

		this.form.update((current) => ({
			...current,
			responsibilities: [...current.responsibilities, value],
		}));
		this.newResponsibility.set('');
	}

	addSkill(): void {
		const value = this.newSkill().trim();
		if (!value) return;

		this.form.update((current) => ({
			...current,
			skills: [...current.skills, value],
		}));
		this.newSkill.set('');
	}

	removeItem(list: 'requirements' | 'responsibilities' | 'skills', index: number): void {
		this.form.update((current) => ({
			...current,
			[list]: current[list].filter((_, itemIndex) => itemIndex !== index),
		}));
	}

	async publishOpportunity(): Promise<void> {
		if (this.isSubmitting()) return;

		const organizationId = this.organizationId();
		const form = this.form();
		const selectedImage = this.selectedImage();

		if (!organizationId) {
			this.formError.set('No se pudo identificar tu organización.');
			return;
		}

		if (!form.title.trim() || !form.category.trim() || !form.date || !form.startTime || !form.duration.trim() || !form.locationName.trim() || !form.fullAddress.trim() || form.spots < 1 || !form.description.trim()) {
			this.formError.set('Completa los campos obligatorios antes de publicar.');
			return;
		}

		if (!selectedImage) {
			if (!this.isEditing() || !this.existingImageUrl()) {
				this.formError.set('Debes subir una imagen de portada antes de publicar.');
				return;
			}
		}

		this.isSubmitting.set(true);
		this.formError.set('');

		const payload = new FormData();
		payload.append('title', form.title.trim());
		payload.append('category', form.category.trim());
		payload.append('opportunity_date', form.date);
		payload.append('time_and_duration', `${form.startTime} · ${form.duration.trim()}`);
		payload.append('location', `${form.locationName.trim()} — ${form.fullAddress.trim()}`);
		payload.append('availability_text', `${form.spots} cupos disponibles`);
		payload.append('total_spots', String(form.spots));
		payload.append('about', form.description.trim());
		payload.append('requirements', JSON.stringify(form.requirements));
		payload.append('responsibilities', JSON.stringify(form.responsibilities));
		payload.append('skills', JSON.stringify(form.skills));

		if (selectedImage) {
			payload.append('image', selectedImage);
		}

		console.log('[NewOpportunity] sending payload', {
			mode: this.isEditing() ? 'edit' : 'create',
			organizationId,
			title: form.title,
			category: form.category,
			requirements: form.requirements,
			responsibilities: form.responsibilities,
			skills: form.skills,
			selectedImage: selectedImage ? {
				name: selectedImage.name,
				type: selectedImage.type,
				size: selectedImage.size,
			} : null,
		});

		const request$ = this.isEditing() && this.editingOpportunityId()
			? this.organizationsService.updateOrganizationOpportunityWithImage(organizationId, this.editingOpportunityId()!, payload)
			: this.organizationsService.createOrganizationOpportunityWithImage(organizationId, payload);

		request$.subscribe({
			next: () => {
				this.isPublished.set(true);
				this.formSuccess.set(this.isEditing() ? 'Oportunidad actualizada correctamente.' : 'Oportunidad publicada correctamente.');
				this.isSubmitting.set(false);
			},
			error: (error) => {
				console.error('Error creating opportunity:', error);
				this.formError.set('No pudimos publicar la oportunidad. Intenta nuevamente.');
				this.isSubmitting.set(false);
			}
		});
	}

	goToDashboard(): void {
		this.router.navigate(['/organization/dashboard']);
	}

	resetForm(): void {
		this.currentStep.set(1);
		this.isPublished.set(false);
		this.selectedImage.set(null);
		this.formError.set('');
		this.formSuccess.set('');
		this.editingOpportunityId.set(null);
		this.form.set({
			title: '',
			category: 'Food & Nutrition',
			description: '',
			urgent: false,
			date: '',
			startTime: '',
			duration: '',
			locationName: '',
			fullAddress: '',
			spots: 1,
			requirements: [],
			responsibilities: [],
			skills: [],
			about: '',
		});
	}

	protected readonly steps = [
		{ id: 1 as StepId, title: 'Información básica', description: 'Título, categoría y descripción' },
		{ id: 2 as StepId, title: 'Detalles del evento', description: 'Fecha, horario, ubicación y cupos' },
		{ id: 3 as StepId, title: 'Requisitos', description: 'Responsabilidades, requisitos y habilidades' },
		{ id: 4 as StepId, title: 'Revisar y publicar', description: 'Revisa todo antes de publicar' },
	];
}
