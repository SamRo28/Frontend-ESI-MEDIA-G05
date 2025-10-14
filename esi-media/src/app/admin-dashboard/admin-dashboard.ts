import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css'],
  standalone: true,
  imports: [CommonModule]
})
export class AdminDashboardComponent {
  activeTab = 'inicio';

  constructor(private router: Router) {}

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  navigateToHome() {
    this.router.navigate(['/home']);
  }
}