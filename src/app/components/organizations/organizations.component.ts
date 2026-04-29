import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

interface OrganizationProfile {
	id: number;
	initials: string;
	name: string;
	category: string;
	description: string;
	location: string;
	opportunities: number;
	volunteers: number;
	rating: number;
	verified: boolean;
	email: string;
	phone: string;
	website: string;
}

@Component({
	selector: 'app-organization-profile-modal',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './organizations.component.html',
	styleUrls: ['./organizations.component.css']
})
export class OrganizationProfileModalComponent {
	@Input({ required: true }) organization!: OrganizationProfile;
	@Output() close = new EventEmitter<void>();

	requestClose(): void {
		this.close.emit();
	}

	@HostListener('document:keydown.escape')
	onEscape(): void {
		this.requestClose();
	}
}
