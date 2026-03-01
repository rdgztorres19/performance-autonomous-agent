export type FormInteractionStatus = 'pending' | 'submitted' | 'expired';

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldProps {
  label: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
  options?: FormFieldOption[];
}

export interface FormField {
  key: string;
  type: 'input' | 'textarea' | 'select' | 'checkbox' | 'number';
  props: FormFieldProps;
}

export interface FormSchema {
  fields: FormField[];
}

export interface FormInteraction {
  id: string;
  sessionId: string;
  status: FormInteractionStatus;
  context: string;
  formSchema: FormSchema;
  response?: Record<string, unknown>;
  requestedAt: string;
  respondedAt?: string;
}
