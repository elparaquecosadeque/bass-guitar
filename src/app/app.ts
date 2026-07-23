import { Component, effect, signal } from '@angular/core';
import { BassNotesPage } from '@gblp/bass-notes';

type Theme = 'dark' | 'light';

@Component({
  selector: 'app-root',
  imports: [BassNotesPage],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly theme = signal<Theme>(
    localStorage.getItem('bass-guitar-theme') === 'light' ? 'light' : 'dark',
  );

  constructor() {
    effect(() => localStorage.setItem('bass-guitar-theme', this.theme()));
  }

  toggleTheme(): void {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }
}
