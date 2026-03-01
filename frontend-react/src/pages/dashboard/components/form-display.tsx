import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { MessageSquare, Send, XCircle } from 'lucide-react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useSessionStore } from '@/hooks/use-session-store';
import { useStopSession } from '@/api/sessions';
import type { FormInteraction, FormField } from '@/types';

interface FormDialogProps {
  formInteraction: FormInteraction;
}

export function FormDialog({ formInteraction }: FormDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm();
  const ws = useWebSocket();
  const markFormSubmitted = useSessionStore((s) => s.markFormSubmitted);
  const activeSession = useSessionStore((s) => s.activeSession);
  const updateSessionStatus = useSessionStore((s) => s.updateSessionStatus);
  const clearSession = useSessionStore((s) => s.clearSession);
  const stopMutation = useStopSession();

  const fields: FormField[] = Array.isArray(formInteraction.formSchema?.fields)
    ? formInteraction.formSchema.fields
    : [];

  const isOpen = formInteraction.status === 'pending';

  const onSubmit = async (data: Record<string, unknown>) => {
    await ws.submitForm(formInteraction.id, data);
    markFormSubmitted(formInteraction.id);
  };

  const handleCancel = async () => {
    if (activeSession) {
      try {
        await stopMutation.mutateAsync(activeSession.id);
        updateSessionStatus('completed');
        ws.leaveSession(activeSession.id);
      } catch {
        /* session may already be stopped */
      }
      clearSession();
      ws.disconnect();
    }
    markFormSubmitted(formInteraction.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[560px] [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">
                Agent Requires Your Input
              </DialogTitle>
              <DialogDescription className="text-2sm mt-0.5">
                Please provide the requested information to continue the diagnostic scan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-foreground mb-5 leading-relaxed">
            {formInteraction.context}
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
            id="agent-form"
          >
            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key} className="text-sm font-medium">
                  {field.props.label}
                  {field.props.required && (
                    <span className="text-destructive ms-1">*</span>
                  )}
                </Label>
                {field.props.description && (
                  <p className="text-2sm text-muted-foreground -mt-0.5">
                    {field.props.description}
                  </p>
                )}
                {renderField(field, register, setValue, watch)}
              </div>
            ))}
          </form>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting || stopMutation.isPending}
          >
            <XCircle className="h-4 w-4 me-1.5" />
            Cancel & Stop Session
          </Button>
          <Button
            type="submit"
            form="agent-form"
            disabled={isSubmitting}
          >
            <Send className="h-4 w-4 me-1.5" />
            {isSubmitting ? 'Submitting...' : 'Submit Response'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function renderField(
  field: FormField,
  register: ReturnType<typeof useForm>['register'],
  setValue: ReturnType<typeof useForm>['setValue'],
  watch: ReturnType<typeof useForm>['watch'],
) {
  switch (field.type) {
    case 'textarea':
      return (
        <Textarea
          id={field.key}
          placeholder={field.props.placeholder}
          rows={4}
          {...register(field.key, { required: field.props.required })}
        />
      );
    case 'select':
      return (
        <Select
          onValueChange={(v) => setValue(field.key, v)}
          value={watch(field.key) as string}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {field.props.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'checkbox':
      return (
        <div className="flex items-center gap-2.5">
          <Checkbox
            id={field.key}
            onCheckedChange={(checked) => setValue(field.key, checked)}
          />
          <Label htmlFor={field.key} className="text-sm font-normal">
            {field.props.label}
          </Label>
        </div>
      );
    case 'number':
      return (
        <Input
          id={field.key}
          type="number"
          placeholder={field.props.placeholder}
          {...register(field.key, {
            required: field.props.required,
            valueAsNumber: true,
          })}
        />
      );
    default:
      return (
        <Input
          id={field.key}
          placeholder={field.props.placeholder}
          {...register(field.key, { required: field.props.required })}
        />
      );
  }
}
