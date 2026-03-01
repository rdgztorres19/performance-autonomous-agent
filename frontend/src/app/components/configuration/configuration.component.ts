import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import type { Configuration, CreateConfigDto } from '../../models';

@Component({
  selector: 'app-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="row">
      <!-- Configuration List -->
      <div class="col-md-5">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Configurations</h5>
            <button class="btn btn-sm btn-primary" (click)="newConfig()">+ New</button>
          </div>
          <div class="list-group list-group-flush">
            @if (configs().length === 0) {
              <div class="list-group-item text-muted text-center py-4" style="background: transparent;">
                No configurations yet.
              </div>
            }
            @for (config of configs(); track config.id) {
              <button class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                [class.active]="selectedConfig()?.id === config.id"
                style="background: var(--pa-bg-card); color: var(--pa-text); border-color: var(--pa-border);"
                (click)="selectConfig(config)">
                <div>
                  <strong>{{ config.name }}</strong>
                  <br>
                  <small class="text-muted">{{ config.connectionType }} {{ config.sshHost ? '- ' + config.sshHost : '' }}</small>
                </div>
                <button class="btn btn-sm btn-outline-danger" (click)="deleteConfig(config.id, $event)">
                  &times;
                </button>
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Configuration Form -->
      <div class="col-md-7">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">{{ editing() ? 'Edit' : 'New' }} Configuration</h5>
          </div>
          <div class="card-body">
            <form (ngSubmit)="saveConfig()">
              <div class="mb-3">
                <label class="form-label">Name</label>
                <input type="text" class="form-control" [(ngModel)]="form.name" name="name" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Connection Type</label>
                <select class="form-select" [(ngModel)]="form.connectionType" name="connectionType">
                  <option value="local">Local</option>
                  <option value="ssh">SSH</option>
                </select>
              </div>

              @if (form.connectionType === 'ssh') {
                <div class="mb-3">
                  <label class="form-label">SSH Host</label>
                  <input type="text" class="form-control" [(ngModel)]="form.sshHost" name="sshHost" placeholder="192.168.1.100">
                </div>
                <div class="row mb-3">
                  <div class="col-md-4">
                    <label class="form-label">Port</label>
                    <input type="number" class="form-control" [(ngModel)]="form.sshPort" name="sshPort" placeholder="22">
                  </div>
                  <div class="col-md-8">
                    <label class="form-label">Username</label>
                    <input type="text" class="form-control" [(ngModel)]="form.sshUsername" name="sshUsername">
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label">Password</label>
                  <input type="password" class="form-control" [(ngModel)]="form.sshPassword" name="sshPassword"
                    [placeholder]="editing() && selectedConfig()?.sshPassword === '***configured***' ? '(unchanged — leave blank to keep)' : ''">
                </div>
                <div class="mb-3">
                  <label class="form-label">Private Key (optional)</label>
                  <textarea class="form-control" rows="3" [(ngModel)]="form.sshPrivateKey" name="sshPrivateKey"
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"></textarea>
                </div>
              }

              <hr style="border-color: var(--pa-border);">

              <div class="mb-3">
                <label class="form-label">OpenAI API Key</label>
                <input type="password" class="form-control" [(ngModel)]="form.openaiApiKey" name="openaiApiKey"
                  [placeholder]="editing() && selectedConfig()?.openaiApiKey === '***configured***' ? '(unchanged — leave blank to keep)' : 'sk-...'">
              </div>
              <div class="mb-3">
                <label class="form-label">OpenAI Model</label>
                <select class="form-select" [(ngModel)]="form.openaiModel" name="openaiModel">
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                </select>
              </div>

              <div class="d-flex gap-2">
                <button type="submit" class="btn btn-primary" [disabled]="!form.name">
                  {{ editing() ? 'Update' : 'Create' }}
                </button>
                @if (editing()) {
                  <button type="button" class="btn btn-outline-secondary" (click)="newConfig()">Cancel</button>
                }
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ConfigurationComponent implements OnInit {
  configs = signal<Configuration[]>([]);
  selectedConfig = signal<Configuration | null>(null);
  editing = signal(false);

  form: CreateConfigDto = this.getEmptyForm();

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.loadConfigs();
  }

  private loadConfigs(): void {
    this.api.getConfigurations().subscribe((configs) => {
      this.configs.set(configs);
    });
  }

  newConfig(): void {
    this.form = this.getEmptyForm();
    this.selectedConfig.set(null);
    this.editing.set(false);
  }

  selectConfig(config: Configuration): void {
    this.selectedConfig.set(config);
    this.editing.set(true);
    this.form = {
      name: config.name,
      connectionType: config.connectionType,
      sshHost: config.sshHost,
      sshPort: config.sshPort,
      sshUsername: config.sshUsername,
      sshPassword: '',
      sshPrivateKey: '',
      openaiApiKey: '',
      openaiModel: config.openaiModel,
    };
  }

  saveConfig(): void {
    if (this.editing() && this.selectedConfig()) {
      this.api.updateConfiguration(this.selectedConfig()!.id, this.form).subscribe(() => {
        this.loadConfigs();
        this.newConfig();
      });
    } else {
      this.api.createConfiguration(this.form).subscribe(() => {
        this.loadConfigs();
        this.newConfig();
      });
    }
  }

  deleteConfig(id: string, event: Event): void {
    event.stopPropagation();
    this.api.deleteConfiguration(id).subscribe(() => {
      this.loadConfigs();
      if (this.selectedConfig()?.id === id) {
        this.newConfig();
      }
    });
  }

  private getEmptyForm(): CreateConfigDto {
    return {
      name: '',
      connectionType: 'local',
      openaiModel: 'gpt-4o',
    };
  }
}
