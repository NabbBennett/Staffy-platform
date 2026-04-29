import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, User } from '../../../services/admin.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class AdminUsersComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly users = signal<User[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly selectedStatus = signal<'all' | 'active' | 'inactive' | 'suspended'>('all');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalUsers = signal(0);

  readonly selectedUser = signal<User | null>(null);
  readonly showUserDetails = signal(false);

  readonly filteredUsers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.selectedStatus();

    return this.users().filter(u =>
      (status === 'all' || u.status === status) &&
      (u.email.toLowerCase().includes(query) || u.full_name.toLowerCase().includes(query))
    );
  });

  readonly totalPages = computed(() =>
    Math.ceil(this.totalUsers() / this.pageSize())
  );

  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const maxPages = 5;
    
    // Calcular el rango de páginas a mostrar (2 antes, actual, 2 después)
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + maxPages - 1);
    
    // Ajustar el inicio si estamos al final y no tenemos suficientes páginas
    if (end - start + 1 < maxPages) {
      start = Math.max(1, end - maxPages + 1);
    }
    
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminService.getUsers(this.currentPage(), this.pageSize(), this.searchQuery()).subscribe({
      next: (response) => {
        this.users.set(response.data);
        this.totalUsers.set(response.total);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.error.set('Error al cargar los usuarios. Intenta de nuevo.');
        this.loading.set(false);
      }
    });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadUsers();
  }

  onStatusChange(): void {
    this.currentPage.set(1);
    this.loadUsers();
  }

  viewUserDetails(user: User): void {
    this.selectedUser.set(user);
    this.showUserDetails.set(true);
  }

  closeUserDetails(): void {
    this.showUserDetails.set(false);
    this.selectedUser.set(null);
  }

  changeUserStatus(user: User, newStatus: 'active' | 'inactive' | 'suspended'): void {
    if (!confirm(`¿Cambiar estado a "${newStatus}"?`)) return;

    this.adminService.updateUserStatus(user.id, newStatus).subscribe({
      next: (updatedUser) => {
        this.users.update(users =>
          users.map(u => u.id === updatedUser.id ? updatedUser : u)
        );
        if (this.selectedUser()?.id === user.id) {
          this.selectedUser.set(updatedUser);
        }
      },
      error: (err) => {
        console.error('Error updating user status:', err);
        this.error.set('Error al actualizar el estado del usuario.');
      }
    });
  }

  changeUserRole(user: User, newRole: string): void {
    if (!confirm(`¿Cambiar rol a "${newRole}"?`)) return;

    this.adminService.updateUserRole(user.id, newRole).subscribe({
      next: (updatedUser) => {
        this.users.update(users =>
          users.map(u => u.id === updatedUser.id ? updatedUser : u)
        );
        if (this.selectedUser()?.id === user.id) {
          this.selectedUser.set(updatedUser);
        }
      },
      error: (err) => {
        console.error('Error updating user role:', err);
        this.error.set('Error al actualizar el rol del usuario.');
      }
    });
  }

  deleteUser(user: User): void {
    if (!confirm(`¿Eliminar usuario ${user.full_name}? Esta acción no se puede deshacer.`)) return;

    this.adminService.deleteUser(user.id).subscribe({
      next: () => {
        this.users.update(users => users.filter(u => u.id !== user.id));
        this.totalUsers.update(total => total - 1);
        this.closeUserDetails();
      },
      error: (err) => {
        console.error('Error deleting user:', err);
        this.error.set('Error al eliminar el usuario.');
      }
    });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadUsers();
    }
  }

  getStatusBadgeClass(status: string): string {
    return `status-badge ${status}`;
  }
}
