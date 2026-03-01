export type FormInteractionStatus = 'pending' | 'submitted' | 'expired';

export interface FormInteraction {
  id: string;
  sessionId: string;
  status: FormInteractionStatus;
  context: string;
  formSchema: Record<string, unknown>;
  response?: Record<string, unknown>;
  requestedAt: string;
  respondedAt?: string;
}
