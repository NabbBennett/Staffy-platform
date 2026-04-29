import { Component, Inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { AdminHeaderComponent } from './components/admin-header/admin-header.component';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, HeaderComponent, AdminHeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('Staffy-Plataform');
  protected readonly userRole = signal('');

  constructor(
    private readonly router: Router,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {
    this.loadRoleFromStorage();
    console.log('App component created, role:', this.userRole());
  }

  ngOnInit(): void {
    console.log('App ngOnInit, initial role:', this.userRole());
    
    // Listen to navigation changes to update role
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        console.log('Navigation event in app, reloading role');
        this.loadRoleFromStorage();
        console.log('Updated role:', this.userRole());
      });

    // Initial load
    this.loadRoleFromStorage();
  }

  private loadRoleFromStorage() {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('Not browser, setting role to empty');
      this.userRole.set('');
      return;
    }

    const role = localStorage.getItem('staffy_role') || '';
    console.log('Loaded role from storage:', role);
    this.userRole.set(role);
  }
}

