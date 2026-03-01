import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { WebSocketService } from '../../services/websocket.service';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark border-bottom" style="border-color: var(--pa-border) !important;">
      <div class="container-fluid">
        <a class="navbar-brand fw-bold" routerLink="/">
          <span style="color: var(--pa-primary-light);">Performance</span> Agent
        </a>
        <div class="d-flex align-items-center gap-3">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-link">Dashboard</a>
          <a routerLink="/configuration" routerLinkActive="active" class="nav-link">Configuration</a>
          <span class="d-flex align-items-center gap-1 small text-muted">
            <span class="connection-indicator"
              [class.connected]="(ws.status$ | async) === 'connected'"
              [class.disconnected]="(ws.status$ | async) === 'disconnected'"
              [class.connecting]="(ws.status$ | async) === 'connecting'">
            </span>
            {{ ws.status$ | async }}
          </span>
        </div>
      </div>
    </nav>
    <div class="container-fluid py-4">
      <router-outlet />
    </div>
  `,
})
export class LayoutComponent {
  constructor(readonly ws: WebSocketService) {}
}
