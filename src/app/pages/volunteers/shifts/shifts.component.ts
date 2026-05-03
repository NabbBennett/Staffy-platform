import { Component, signal, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface VolunteerConfirmation {
  id: number;
  user_email: string;
  opportunity_id: number;
  organization_id: number;
  status: 'pendiente' | 'confirmado' | 'accepted' | 'completado' | 'cancelado';
  confirmed_at: string | null;
  completed_at: string | null;
  hours_worked: number | null;
  volunteer_rating: number | null;
  organization_feedback: string | null;
  volunteer_feedback: string | null;
  created_at: string;
  updated_at: string;
  title: string;
  organization_name: string;
  opportunity_date: string;
  location: string;
}

interface RecentApplication {
  id: number;
  opportunity_id: number;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  title: string;
  organization_name: string;
}

@Component({
  selector: 'app-shifts',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, HttpClientModule],
  templateUrl: './shifts.component.html',
  styleUrls: ['./shifts.component.css']
})
export class ShiftsComponent implements OnInit {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID) as Object;

  searchQuery = signal('');
  selectedCategory = signal<string | null>(null);
  activeTab = signal<'upcoming' | 'completed'>('upcoming');
  hoursProgress = signal(73);
  isLoading = signal(true);
  error = signal<string | null>(null);

  confirmations = signal<VolunteerConfirmation[]>([]);
  recentApplications = signal<RecentApplication[]>([]);

  ngOnInit(): void {
    this.loadConfirmations();
    this.loadRecentApplications();
  }

  private getUserEmail(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const userEmail = localStorage.getItem('staffy_user_email')?.trim().toLowerCase() || '';
    return userEmail || null;
  }

  loadConfirmations(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const userEmail = this.getUserEmail();

    if (!userEmail) {
      this.error.set('No se encontró el correo del usuario. Por favor inicia sesión.');
      this.isLoading.set(false);
      return;
    }

    this.http.get<VolunteerConfirmation[]>(`/api/opportunities/confirmations?email=${encodeURIComponent(userEmail)}`)
      .subscribe({
        next: (data) => {
          this.confirmations.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error loading confirmations:', err);
          this.error.set('Error al cargar las confirmaciones de voluntariado.');
          this.isLoading.set(false);
        }
      });
  }

  loadRecentApplications(): void {
    const userEmail = this.getUserEmail();

    if (!userEmail) {
      return;
    }

    this.http.get<RecentApplication[]>(`/api/opportunities/applications/user/${encodeURIComponent(userEmail)}`)
      .subscribe({
        next: (data) => {
          this.recentApplications.set(data);
        },
        error: (err) => {
          console.error('Error loading recent applications:', err);
        }
      });
  }

  get acceptedApplications(): RecentApplication[] {
    return this.recentApplications().filter(application => application.status === 'accepted');
  }

  get upcomingConfirmations(): VolunteerConfirmation[] {
    return this.confirmations().filter(
      c => c.status === 'pendiente' || c.status === 'confirmado' || c.status === 'accepted'
    );
  }

  get completedConfirmations(): VolunteerConfirmation[] {
    return this.confirmations().filter(c => c.status === 'completado');
  }

  get totalHours(): number {
    return this.completedConfirmations.reduce((sum, conf) => sum + (conf.hours_worked || 0), 0);
  }

  get hoursThisMonth(): number {
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();

    return this.completedConfirmations
      .filter(conf => {
        if (!conf.completed_at) return false;
        const completedDate = new Date(conf.completed_at);
        return completedDate.getMonth() === thisMonth && completedDate.getFullYear() === thisYear;
      })
      .reduce((sum, conf) => sum + (conf.hours_worked || 0), 0);
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(
      category === this.selectedCategory() ? null : category
    );
  }

  selectTab(tab: 'upcoming' | 'completed'): void {
    this.activeTab.set(tab);
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'submitted': return 'Pendiente';
      case 'confirmado': return 'Confirmado';
      case 'accepted': return 'Aceptado';
      case 'completado': return 'Completado';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'submitted': return 'status-pending';
      case 'confirmado': return 'status-confirmed';
      case 'accepted': return 'status-confirmed';
      case 'completado': return 'status-completed';
      case 'cancelado': return 'status-cancelled';
      default: return '';
    }
  }

  formatApplicationStatus(status: string): string {
    switch (status) {
      case 'submitted': return 'Pendiente';
      case 'reviewed': return 'En revisión';
      case 'accepted': return 'Aceptada';
      case 'rejected': return 'Rechazada';
      default: return status;
    }
  }

  getApplicationStatusClass(status: string): string {
    switch (status) {
      case 'submitted': return 'status-pending';
      case 'reviewed': return 'status-review';
      case 'accepted': return 'approved';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  }

  getCurrentConfirmations(): VolunteerConfirmation[] {
    return this.activeTab() === 'upcoming' ? this.upcomingConfirmations : this.completedConfirmations;
  }
}

