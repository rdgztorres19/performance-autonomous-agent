import { Component, Input, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import type { TimelineEntry } from '../../models';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Timeline</h5>
        <span class="badge bg-secondary">{{ entries.length }}</span>
      </div>
      <div class="card-body" style="max-height: 600px; overflow-y: auto;" #scrollContainer>
        @if (entries.length === 0) {
          <p class="text-muted text-center py-4">No timeline entries yet. Start a session to begin.</p>
        }
        @for (entry of entries; track entry.id) {
          <div class="timeline-entry" [ngClass]="getTypeClass(entry.type)">
            <div class="d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <span class="badge me-2" [ngClass]="getTypeBadgeClass(entry.type)">
                  {{ getTypeLabel(entry.type) }}
                </span>
                <span>{{ entry.description }}</span>
              </div>
              <small class="text-muted ms-2 text-nowrap">
                {{ entry.timestamp | date:'HH:mm:ss' }}
              </small>
            </div>
            @if (entry.reasoning) {
              <div class="mt-1 small fst-italic text-muted">{{ entry.reasoning }}</div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class TimelineComponent implements AfterViewChecked {
  @Input() entries: TimelineEntry[] = [];
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef<HTMLDivElement>;

  private previousLength = 0;

  ngAfterViewChecked(): void {
    if (this.entries.length !== this.previousLength && this.scrollContainer) {
      this.previousLength = this.entries.length;
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  getTypeClass(type: string): string {
    const map: Record<string, string> = {
      error: 'type-error',
      problem_detected: 'type-problem',
      agent_decision: 'type-decision',
      tool_execution: 'type-tool',
      user_interaction: 'type-user',
    };
    return map[type] ?? '';
  }

  getTypeBadgeClass(type: string): string {
    const map: Record<string, string> = {
      error: 'bg-danger',
      problem_detected: 'bg-warning text-dark',
      agent_decision: 'bg-primary',
      tool_execution: 'bg-success',
      user_interaction: 'bg-info',
      info: 'bg-secondary',
    };
    return map[type] ?? 'bg-secondary';
  }

  getTypeLabel(type: string): string {
    const map: Record<string, string> = {
      error: 'Error',
      problem_detected: 'Problem',
      agent_decision: 'Decision',
      tool_execution: 'Tool',
      user_interaction: 'User',
      info: 'Info',
    };
    return map[type] ?? type;
  }
}
