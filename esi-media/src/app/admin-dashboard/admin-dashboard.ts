import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css'],
  standalone: true,
  imports: [CommonModule]
})
export class AdminDashboardComponent {
  activeTab = 'inicio';

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }
}