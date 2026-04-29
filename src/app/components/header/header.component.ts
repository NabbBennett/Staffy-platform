import { Component, Inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  isMenuOpen = signal(false);
  isLoggedIn = signal(false);
  userRole = signal('');

  constructor(
    private readonly router: Router,
    @Inject(PLATFORM_ID) private readonly platformId: object,
    private readonly http: HttpClient,
  ) {
    this.initializeSessionState();
  }

  ngOnInit(): void {
    this.syncSessionStateFromServer();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.initializeSessionState();
        this.syncSessionStateFromServer();
      });
  }

  toggleMenu() {
    this.isMenuOpen.update(value => !value);
  }

  closeMenu() {
    this.isMenuOpen.set(false);
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('staffy_session');
      localStorage.removeItem('staffy_role');
      localStorage.removeItem('staffy_user_id');
      localStorage.removeItem('staffy_email');
    }

    this.initializeSessionState();
    this.closeMenu();
    this.router.navigate(['/']);
  }

  isOrganizationRole(): boolean {
    const role = this.userRole();
    return role === 'empresa' || role === 'admin';
  }

  isVolunteerRole(): boolean {
    return this.userRole() === 'voluntario';
  }

  isAdminRole(): boolean {
    return this.userRole() === 'admin';
  }

  getProfileLink(): string {
    return this.userRole() === 'empresa' ? '/organization/profile' : '/profile';
  }

  private initializeSessionState() {
    if (!isPlatformBrowser(this.platformId)) {
      this.isLoggedIn.set(false);
      this.userRole.set('');
      return;
    }

    const session = localStorage.getItem('staffy_session');
    const role = localStorage.getItem('staffy_role');

    this.isLoggedIn.set(session === 'active');
    this.userRole.set((role || '').trim().toLowerCase());
  }

  private syncSessionStateFromServer() {
    if (!isPlatformBrowser(this.platformId)) return;

    const userId = localStorage.getItem('staffy_user_id');
    if (!userId) {
      this.initializeSessionState();
      return;
    }

    this.http
      .get<{ id: number; fullName: string; email: string; role: string }>('/api/auth/me', {
        headers: { 'x-staffy-user-id': userId }
      })
      .subscribe({
        next: (user) => {
          localStorage.setItem('staffy_role', user.role);
          this.initializeSessionState();
        },
        error: (err) => {
          console.error('Error syncing session:', err);
          this.initializeSessionState();
        }
      });
  }
}
