import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../services/session.service';
import { ApiService } from '../../services/api.service';
import { TimelineComponent } from '../timeline/timeline.component';
import { ReportsComponent } from '../reports/reports.component';
import { FormDisplayComponent } from '../forms/form-display.component';
import type { Configuration } from '../../models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TimelineComponent, ReportsComponent, FormDisplayComponent],
  template: `
    <div class="row mb-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Session Control</h5>
            @if (session.activeSession(); as active) {
              <span class="badge"
                [class.bg-success]="active.status === 'running'"
                [class.bg-secondary]="active.status === 'completed'"
                [class.bg-danger]="active.status === 'failed'">
                {{ active.status | uppercase }}
              </span>
            }
          </div>
          <div class="card-body">
            @if (!session.activeSession()) {
              <div class="row align-items-end">
                <div class="col-md-8">
                  <label class="form-label">Configuration</label>
                  <select class="form-select" [(ngModel)]="selectedConfigId">
                    <option value="">Select a configuration...</option>
                    @for (config of configurations(); track config.id) {
                      <option [value]="config.id">{{ config.name }} ({{ config.connectionType }})</option>
                    }
                  </select>
                </div>
                <div class="col-md-4">
                  <button class="btn btn-primary w-100"
                    (click)="startSession()"
                    [disabled]="!selectedConfigId || (session.loading$ | async)">
                    @if (session.loading$ | async) {
                      <span class="spinner-border spinner-border-sm me-1"></span>
                    }
                    Start Scan
                  </button>
                </div>
              </div>
            } @else {
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <span class="text-muted">Session:</span>
                  <code class="ms-2">{{ session.activeSession()!.id }}</code>
                </div>
                <div class="d-flex gap-2">
                  @if (session.isRunning()) {
                    <button class="btn btn-outline-danger btn-sm" (click)="stopSession()">
                      Stop Session
                    </button>
                  }
                  <button class="btn btn-outline-secondary btn-sm" (click)="clearSession()">
                    Close
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>

    @if (session.activeSession()) {
      <!-- Pending Forms -->
      @for (form of session.pendingForms(); track form.id) {
        @if (form.status === 'pending') {
          <div class="row mb-4">
            <div class="col-12">
              <app-form-display
                [formInteraction]="form"
                (formSubmitted)="onFormSubmitted($event)" />
            </div>
          </div>
        }
      }

      <div class="row">
        <!-- Timeline -->
        <div class="col-lg-7">
          <app-timeline [entries]="session.timeline()" />
        </div>
        <!-- Reports -->
        <div class="col-lg-5">
          <app-reports [reports]="session.reports()" />
        </div>
      </div>
    }
  `,
})
export class DashboardComponent implements OnInit {
  configurations = signal<Configuration[]>([]);
  selectedConfigId = '';

  constructor(
    readonly session: SessionService,
    private readonly api: ApiService,
  ) {}

  ngOnInit(): void {
    this.api.getConfigurations().subscribe((configs) => {
      this.configurations.set(configs);
    });
  }

  async startSession(): Promise<void> {
    if (!this.selectedConfigId) return;
    await this.session.startSession(this.selectedConfigId);
  }

  async stopSession(): Promise<void> {
    await this.session.stopSession();
  }

  clearSession(): void {
    this.session.clearSession();
  }

  async onFormSubmitted(event: { formId: string; response: Record<string, unknown> }): Promise<void> {
    await this.session.submitForm(event.formId, event.response);
  }
}
