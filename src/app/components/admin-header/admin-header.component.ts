import { Component, Inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-header.component.html',
  styleUrl: './admin-header.component.css'
})
export class AdminHeaderComponent implements OnInit {
  isMenuOpen = signal(false);
  isLoggedIn = signal(false);
  userRole = signal('');
  userEmail = signal('');

  constructor(
    private readonly router: Router,
    @Inject(PLATFORM_ID) private readonly platformId: object,
    private readonly http: HttpClient,
  ) {
    this.initializeSessionState();
    console.log('AdminHeaderComponent created', { role: this.userRole() });
  }

  ngOnInit(): void {
    console.log('AdminHeaderComponent ngOnInit');
    this.syncSessionStateFromServer();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        console.log('Navigation event, syncing session');
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
    }

    this.initializeSessionState();
    this.closeMenu();
    this.router.navigate(['/']);
  }

  private initializeSessionState() {
    if (!isPlatformBrowser(this.platformId)) {
      this.isLoggedIn.set(false);
      this.userRole.set('');
      this.userEmail.set('');
      return;
    }

    const session = localStorage.getItem('staffy_session');
    const role = localStorage.getItem('staffy_role');
    const email = localStorage.getItem('staffy_email') || '';

    this.isLoggedIn.set(!!session);
    this.userRole.set(role || '');
    this.userEmail.set(email);
    
    console.log('AdminHeaderComponent initialized', { isLoggedIn: !!session, role, email });
  }

  private syncSessionStateFromServer() {
    if (!isPlatformBrowser(this.platformId)) return;

    const userId = localStorage.getItem('staffy_user_id');
    if (!userId) {
      console.log('No userId found, skipping sync');
      this.initializeSessionState();
      return;
    }

    console.log('Syncing admin session from server with userId:', userId);
    
    this.http
      .get<{ id: number; fullName: string; email: string; role: string }>('/api/auth/me', {
        headers: { 'x-staffy-user-id': userId }
      })
      .subscribe({
        next: (user) => {
          console.log('Admin session synced:', user);
          localStorage.setItem('staffy_role', user.role);
          localStorage.setItem('staffy_email', user.email);
          this.initializeSessionState();
        },
        error: (err) => {
          console.error('Error syncing admin session:', err);
          this.initializeSessionState();
        }
      });
  }
}

