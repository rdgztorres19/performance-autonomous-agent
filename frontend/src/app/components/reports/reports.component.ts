import { Component, Input } from '@angular/core';
import { CommonModule, DatePipe, JsonPipe } from '@angular/common';
import type { ProblemReport } from '../../models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, DatePipe, JsonPipe],
  template: `
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Problem Reports</h5>
        <span class="badge bg-secondary">{{ reports.length }}</span>
      </div>
      <div class="card-body" style="max-height: 600px; overflow-y: auto;">
        @if (reports.length === 0) {
          <p class="text-muted text-center py-4">No problems detected yet.</p>
        }
        @for (report of reports; track report.id) {
          <div class="card mb-3">
            <div class="card-header d-flex justify-content-between align-items-center py-2">
              <div>
                <span class="badge me-2"
                  [class.badge-severity-critical]="report.severity === 'critical'"
                  [class.badge-severity-warning]="report.severity === 'warning'"
                  [class.badge-severity-info]="report.severity === 'info'">
                  {{ report.severity | uppercase }}
                </span>
                <span class="badge bg-secondary">{{ report.category }}</span>
              </div>
              <small class="text-muted">{{ report.detectedAt | date:'HH:mm:ss' }}</small>
            </div>
            <div class="card-body py-2">
              <h6 class="card-title">{{ report.title }}</h6>
              <p class="card-text small">{{ report.description }}</p>

              @if (report.explanation) {
                <div class="alert alert-secondary py-1 px-2 small mb-2">
                  <strong>Why:</strong> {{ report.explanation }}
                </div>
              }

              @if (report.recommendations && report.recommendations.length > 0) {
                <div class="small">
                  <strong>Recommendations:</strong>
                  <ul class="mb-0 ps-3">
                    @for (rec of report.recommendations; track rec) {
                      <li>{{ rec }}</li>
                    }
                  </ul>
                </div>
              }

              <details class="mt-2">
                <summary class="small text-muted" style="cursor: pointer;">View Metrics</summary>
                <pre class="small mt-1 p-2 rounded" style="background: var(--pa-bg-dark); max-height: 200px; overflow: auto;">{{ report.metrics | json }}</pre>
              </details>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class ReportsComponent {
  @Input() reports: ProblemReport[] = [];
}
