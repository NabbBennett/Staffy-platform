import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  OrganizationProfile,
  OrganizationsService,
  UpdateOrganizationProfilePayload,
} from '../../../services/organizations.service';

type EditableSettingKey =
  | 'emailNotifications'
  | 'publicProfile'
  | 'autoApproveApplications'
  | 'showVolunteerCount';

interface OrganizationSettingView {
  key: EditableSettingKey;
  title: string;
  description: string;
}

interface OrganizationProfileForm {
  initials: string;
  name: string;
  category: string;
  description: string;
  location: string;
  phone: string;
  website: string;
  emailNotifications: boolean;
  publicProfile: boolean;
  autoApproveApplications: boolean;
  showVolunteerCount: boolean;
}

const CATEGORY_OPTIONS = [
  { value: 'Food & Nutrition', label: 'Alimentación y nutrición' },
  { value: 'Education', label: 'Educación' },
  { value: 'Healthcare', label: 'Salud' },
  { value: 'Environment', label: 'Medio ambiente' },
  { value: 'Animal Welfare', label: 'Bienestar animal' },
  { value: 'Community Service', label: 'Servicio comunitario' },
];

@Component({
  selector: 'app-organization-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class OrganizationProfileComponent implements OnInit {
  private readonly organizationsService = inject(OrganizationsService);

  readonly profileError = signal('');
  readonly profileSuccess = signal('');
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isEditing = signal(false);
  readonly organizationProfile = signal<OrganizationProfile | null>(null);

  readonly categoryOptions = CATEGORY_OPTIONS;

  readonly stats = computed(() => {
    const profile = this.organizationProfile();

    if (!profile) {
      return [];
    }

    return [
      {
        label: 'Voluntarios totales',
        value: profile.volunteers.toLocaleString('es-ES'),
        tone: 'blue',
      },
      {
        label: 'Oportunidades activas',
        value: profile.opportunities.toLocaleString('es-ES'),
        tone: 'purple',
      },
      {
        label: 'Calificación',
        value: profile.rating.toFixed(1),
        tone: 'green',
      },
    ];
  });

  form: OrganizationProfileForm = {
    initials: 'OR',
    name: '',
    category: 'Food & Nutrition',
    description: '',
    location: '',
    phone: '',
    website: '',
    emailNotifications: true,
    publicProfile: true,
    autoApproveApplications: false,
    showVolunteerCount: true,
  };

  private readonly settingViews: OrganizationSettingView[] = [
    {
      key: 'emailNotifications',
      title: 'Notificaciones por correo',
      description: 'Recibe avisos sobre aplicaciones y voluntarios',
    },
    {
      key: 'publicProfile',
      title: 'Perfil público',
      description: 'Haz visible tu organización para los voluntarios',
    },
    {
      key: 'autoApproveApplications',
      title: 'Aprobación automática',
      description: 'Aprueba automáticamente las solicitudes de voluntariado',
    },
    {
      key: 'showVolunteerCount',
      title: 'Mostrar total de voluntarios',
      description: 'Muestra el conteo de voluntarios en el perfil público',
    },
  ];

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const storedEmail = localStorage.getItem('staffy_user_email')?.trim().toLowerCase() ?? '';

    if (!storedEmail) {
      this.profileError.set('No se encontró una sesión activa. Inicia sesión nuevamente.');
      this.isLoading.set(false);
      return;
    }

    this.organizationsService.getOrganizationProfile(storedEmail).subscribe({
      next: (profile) => {
        this.organizationProfile.set(profile);
        this.fillForm(profile);
        this.profileError.set('');
        this.profileSuccess.set('');
        this.isLoading.set(false);
      },
      error: (error) => {
        const message = error?.error?.message || 'No pudimos cargar el perfil de organización.';
        this.profileError.set(message);
        this.isLoading.set(false);
      },
    });
  }

  toggleEditMode(): void {
    if (this.isEditing()) {
      this.cancelEdit();
      return;
    }

    const profile = this.organizationProfile();

    if (profile) {
      this.fillForm(profile);
    }

    this.profileError.set('');
    this.profileSuccess.set('');
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    const profile = this.organizationProfile();

    if (profile) {
      this.fillForm(profile);
    }

    this.isEditing.set(false);
    this.profileError.set('');
    this.profileSuccess.set('');
  }

  saveProfile(): void {
    const profile = this.organizationProfile();

    if (!profile) {
      return;
    }

    this.isSaving.set(true);
    this.profileError.set('');
    this.profileSuccess.set('');

    const payload: UpdateOrganizationProfilePayload = {
      email: profile.email,
      initials: this.form.initials.trim(),
      name: this.form.name.trim(),
      category: this.form.category.trim(),
      description: this.form.description.trim(),
      location: this.form.location.trim(),
      phone: this.form.phone.trim(),
      website: this.form.website.trim(),
      emailNotifications: this.form.emailNotifications,
      publicProfile: this.form.publicProfile,
      autoApproveApplications: this.form.autoApproveApplications,
      showVolunteerCount: this.form.showVolunteerCount,
    };

    this.organizationsService.updateOrganizationProfile(payload).subscribe({
      next: (updatedProfile) => {
        this.organizationProfile.set(updatedProfile);
        this.fillForm(updatedProfile);
        this.isEditing.set(false);
        this.profileSuccess.set('Perfil de organización actualizado correctamente.');
        this.isSaving.set(false);
      },
      error: (error) => {
        const message = error?.error?.message || 'No pudimos guardar los cambios del perfil.';
        this.profileError.set(message);
        this.isSaving.set(false);
      },
    });
  }

  toggleSetting(settingKey: EditableSettingKey): void {
    this.form = {
      ...this.form,
      [settingKey]: !this.form[settingKey],
    } as OrganizationProfileForm;
  }

  getCategoryLabel(category: string): string {
    return this.categoryOptions.find((option) => option.value === category)?.label ?? category;
  }

  getEstablishedYear(profile: OrganizationProfile): string {
    const date = new Date(profile.createdAt);

    if (Number.isNaN(date.getTime())) {
      return '2026';
    }

    return date.getFullYear().toString();
  }

  getSettingValue(profile: OrganizationProfile, key: EditableSettingKey): boolean {
    return profile[key];
  }

  viewSettings(profile: OrganizationProfile): OrganizationSettingView[] {
    return this.settingViews;
  }

  private fillForm(profile: OrganizationProfile): void {
    this.form = {
      initials: profile.initials,
      name: profile.name,
      category: profile.category,
      description: profile.description,
      location: profile.location,
      phone: profile.phone,
      website: profile.website,
      emailNotifications: profile.emailNotifications,
      publicProfile: profile.publicProfile,
      autoApproveApplications: profile.autoApproveApplications,
      showVolunteerCount: profile.showVolunteerCount,
    };
  }
}