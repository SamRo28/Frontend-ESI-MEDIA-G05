import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InactivityWarningComponent } from './shared/inactivity-warning/inactivity-warning.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, InactivityWarningComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  standalone: true
})
export class App {
  protected readonly title = signal('esi-media');
}