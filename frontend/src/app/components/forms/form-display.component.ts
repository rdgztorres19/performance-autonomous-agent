import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { FormlyModule, FormlyFieldConfig } from '@ngx-formly/core';
import { FormlyBootstrapModule } from '@ngx-formly/bootstrap';
import type { FormInteraction } from '../../models';

@Component({
  selector: 'app-form-display',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormlyModule, FormlyBootstrapModule],
  template: `
    <div class="card border-info">
      <div class="card-header bg-info bg-opacity-25 d-flex justify-content-between align-items-center">
        <div>
          <span class="badge bg-info me-2">Agent Request</span>
          <strong>Additional Information Needed</strong>
        </div>
        @if (formInteraction.status === 'submitted') {
          <span class="badge bg-success">Submitted</span>
        }
      </div>
      <div class="card-body">
        <p class="text-muted mb-3">{{ formInteraction.context }}</p>

        @if (formInteraction.status === 'pending') {
          <form [formGroup]="formGroup" (ngSubmit)="onSubmit()">
            <formly-form
              [form]="formGroup"
              [fields]="fields"
              [model]="model">
            </formly-form>
            <button type="submit" class="btn btn-primary mt-3"
              [disabled]="!formGroup.valid || submitted">
              {{ submitted ? 'Submitted' : 'Submit Response' }}
            </button>
          </form>
        } @else {
          <div class="alert alert-success py-2 mb-0">
            Response has been submitted to the agent.
          </div>
        }
      </div>
    </div>
  `,
})
export class FormDisplayComponent implements OnChanges {
  @Input() formInteraction!: FormInteraction;
  @Output() formSubmitted = new EventEmitter<{ formId: string; response: Record<string, unknown> }>();

  formGroup = new FormGroup({});
  fields: FormlyFieldConfig[] = [];
  model: Record<string, unknown> = {};
  submitted = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['formInteraction']) {
      this.parseFormSchema();
    }
  }

  private parseFormSchema(): void {
    const schema = this.formInteraction.formSchema;
    this.fields = this.convertSchemaToFormly(schema);
    this.model = {};
    this.formGroup = new FormGroup({});
    this.submitted = false;
  }

  private convertSchemaToFormly(schema: Record<string, unknown>): FormlyFieldConfig[] {
    // The AI generates a Formly-compatible schema. It may come as:
    // { fields: [...] } or as a direct array or as a JSON schema-like object
    if (Array.isArray(schema['fields'])) {
      return schema['fields'] as FormlyFieldConfig[];
    }

    if (Array.isArray(schema)) {
      return schema as FormlyFieldConfig[];
    }

    // Fallback: try to interpret as a simple key-value definition
    const fields: FormlyFieldConfig[] = [];
    for (const [key, value] of Object.entries(schema)) {
      if (key === 'fields' || key === 'title' || key === 'description') continue;

      const fieldDef = value as Record<string, unknown> | undefined;
      if (!fieldDef || typeof fieldDef !== 'object') continue;

      fields.push({
        key,
        type: this.mapFieldType(fieldDef['type'] as string),
        props: {
          label: (fieldDef['label'] as string) ?? key,
          placeholder: (fieldDef['placeholder'] as string) ?? '',
          required: (fieldDef['required'] as boolean) ?? false,
          description: fieldDef['description'] as string,
          options: fieldDef['options'] as Array<{ label: string; value: string }>,
        },
      });
    }

    return fields;
  }

  private mapFieldType(type?: string): string {
    const map: Record<string, string> = {
      text: 'input',
      string: 'input',
      number: 'input',
      email: 'input',
      password: 'input',
      textarea: 'textarea',
      select: 'select',
      checkbox: 'checkbox',
      radio: 'radio',
    };
    return map[type ?? 'text'] ?? 'input';
  }

  onSubmit(): void {
    if (this.formGroup.valid) {
      this.submitted = true;
      this.formSubmitted.emit({
        formId: this.formInteraction.id,
        response: { ...this.model },
      });
    }
  }
}
