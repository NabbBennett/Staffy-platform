import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface UpcomingOpportunityItem {
	title: string;
	date: string;
	status: 'Full' | 'Active';
	progress: string;
}

@Component({
	selector: 'app-upcoming-opportunities',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './upcomming-oportunities.component.html',
	styleUrls: ['./upcomming-oportunities.component.css']
})
export class UpcommingOportunitiesComponent {
	@Input({ required: true }) opportunities: UpcomingOpportunityItem[] = [];
	@Input() limit = 4;

	get visibleOpportunities(): UpcomingOpportunityItem[] {
		return this.opportunities.slice(0, this.limit);
	}
}
