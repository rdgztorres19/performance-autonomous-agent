import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Wifi } from 'lucide-react';
import { useCreateConfiguration, useUpdateConfiguration, useVerifyConnection } from '@/api/configurations';
import { toast } from 'sonner';
import type { Configuration } from '@/types';

const configSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  connectionType: z.enum(['local', 'ssh']),
  sshHost: z.string().optional(),
  sshPort: z.coerce.number().optional(),
  sshUsername: z.string().optional(),
  sshPassword: z.string().optional(),
  sshPrivateKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
  openaiModel: z.string().optional(),
});

type ConfigFormValues = z.infer<typeof configSchema>;

interface ConfigFormProps {
  config: Configuration | null;
  isNew: boolean;
  onSaved: () => void;
}

function buildDefaults(config: Configuration | null, isNew: boolean): ConfigFormValues {
  if (!isNew && config) {
    return {
      name: config.name,
      connectionType: config.connectionType as 'local' | 'ssh',
      sshHost: config.sshHost ?? '',
      sshPort: config.sshPort ?? 22,
      sshUsername: config.sshUsername ?? '',
      sshPassword: '',
      sshPrivateKey: '',
      openaiApiKey: '',
      openaiModel: config.openaiModel ?? 'gpt-4o',
    };
  }
  return {
    name: '',
    connectionType: 'local',
    sshHost: '',
    sshPort: 22,
    sshUsername: '',
    sshPassword: '',
    sshPrivateKey: '',
    openaiApiKey: '',
    openaiModel: 'gpt-4o',
  };
}

/**
 * Wrapper that forces a full remount when switching between configs,
 * ensuring Select components initialize with the correct values.
 */
export function ConfigForm({ config, isNew, onSaved }: ConfigFormProps) {
  return (
    <ConfigFormInner
      key={isNew ? '__new__' : config?.id ?? '__new__'}
      config={config}
      isNew={isNew}
      onSaved={onSaved}
    />
  );
}

function ConfigFormInner({ config, isNew, onSaved }: ConfigFormProps) {
  const createMutation = useCreateConfiguration();
  const updateMutation = useUpdateConfiguration();
  const verifyMutation = useVerifyConnection();

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: buildDefaults(config, isNew),
  });

  const connectionType = useWatch({ control, name: 'connectionType' });

  const onSubmit = async (data: ConfigFormValues) => {
    try {
      const dto = { ...data };
      if (!dto.sshPassword) delete dto.sshPassword;
      if (!dto.sshPrivateKey) delete dto.sshPrivateKey;
      if (!dto.openaiApiKey) delete dto.openaiApiKey;

      if (isNew) {
        await createMutation.mutateAsync(dto);
        toast.success('Configuration created successfully');
      } else if (config) {
        await updateMutation.mutateAsync({ id: config.id, dto });
        toast.success('Configuration updated successfully');
      }
      onSaved();
    } catch {
      toast.error('Failed to save configuration');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleTestConnection = async () => {
    const values = watch();
    if (values.connectionType === 'ssh' && (!values.sshHost?.trim() || !values.sshUsername?.trim())) {
      toast.error('Host and Username are required to test SSH connection');
      return;
    }
    try {
      const res = await verifyMutation.mutateAsync({
        id: config?.id,
        connectionType: values.connectionType,
        sshHost: values.sshHost || undefined,
        sshPort: values.sshPort,
        sshUsername: values.sshUsername || undefined,
        sshPassword: values.sshPassword || undefined,
        sshPrivateKey: values.sshPrivateKey || undefined,
      });
      res.success ? toast.success('Connection successful') : toast.error('Connection failed');
    } catch {
      toast.error('Connection test failed');
    }
  };

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={onSaved} className="text-muted-foreground">
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to Configurations
      </Button>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardHeader className="py-5">
            <CardTitle className="text-base font-semibold">
              {isNew ? 'New Configuration' : 'Edit Configuration'}
            </CardTitle>
          </CardHeader>
          <CardContent className="border-t border-border pt-5">
            <div className="grid gap-5 max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <Label className="md:pt-2.5 text-sm font-medium text-muted-foreground">Name</Label>
                <div className="md:col-span-2">
                  <Input {...register('name')} placeholder="e.g. Production Server" />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <Label className="md:pt-2.5 text-sm font-medium text-muted-foreground">Connection Type</Label>
                <div className="md:col-span-2">
                  <Controller
                    control={control}
                    name="connectionType"
                    render={({ field }) => (
                      <Select defaultValue={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select connection type..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="local">Local Machine</SelectItem>
                          <SelectItem value="ssh">Remote (SSH)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {connectionType === 'ssh' && (
          <Card>
            <CardHeader className="py-5">
              <CardTitle className="text-base font-semibold">SSH Connection</CardTitle>
            </CardHeader>
            <CardContent className="border-t border-border pt-5">
              <div className="grid gap-5 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <Label className="md:pt-2.5 text-sm font-medium text-muted-foreground">Host</Label>
                  <div className="md:col-span-2">
                    <Input {...register('sshHost')} placeholder="192.168.1.100 or hostname" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <Label className="md:pt-2.5 text-sm font-medium text-muted-foreground">Port</Label>
                  <div className="md:col-span-2">
                    <Input type="number" {...register('sshPort')} placeholder="22" className="max-w-32" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <Label className="md:pt-2.5 text-sm font-medium text-muted-foreground">Username</Label>
                  <div className="md:col-span-2">
                    <Input {...register('sshUsername')} placeholder="root" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <Label className="md:pt-2.5 text-sm font-medium text-muted-foreground">Password</Label>
                  <div className="md:col-span-2">
                    <Input
                      type="password"
                      {...register('sshPassword')}
                      placeholder={config?.sshPassword === '***configured***' ? '(leave blank to keep current)' : 'Enter password'}
                    />
                    {config?.sshPassword === '***configured***' && (
                      <p className="text-xs text-muted-foreground mt-1">Password is already configured. Leave blank to keep it.</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <Label className="md:pt-2.5 text-sm font-medium text-muted-foreground">Private Key</Label>
                  <div className="md:col-span-2">
                    <Textarea
                      {...register('sshPrivateKey')}
                      placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                      rows={4}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Optional. Paste your SSH private key for key-based authentication.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="py-5">
            <CardTitle className="text-base font-semibold">AI Settings</CardTitle>
          </CardHeader>
          <CardContent className="border-t border-border pt-5">
            <div className="grid gap-5 max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <Label className="md:pt-2.5 text-sm font-medium text-muted-foreground">OpenAI API Key</Label>
                <div className="md:col-span-2">
                  <Input
                    type="password"
                    {...register('openaiApiKey')}
                    placeholder={config?.openaiApiKey === '***configured***' ? '(leave blank to keep current)' : 'sk-...'}
                  />
                  {config?.openaiApiKey === '***configured***' && (
                    <p className="text-xs text-muted-foreground mt-1">API key is already configured. Leave blank to keep it.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <Label className="md:pt-2.5 text-sm font-medium text-muted-foreground">Model</Label>
                <div className="md:col-span-2">
                  <Controller
                    control={control}
                    name="openaiModel"
                    render={({ field }) => (
                      <Select defaultValue={field.value || 'gpt-4o'} onValueChange={field.onChange}>
                        <SelectTrigger className="max-w-xs">
                          <SelectValue placeholder="Select model..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                          <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                          <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isPending}>
            <Save className="mr-1.5 h-4 w-4" />
            {isPending ? 'Saving...' : isNew ? 'Create Configuration' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={verifyMutation.isPending || isPending}
          >
            <Wifi className="mr-1.5 h-4 w-4" />
            {verifyMutation.isPending ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button type="button" variant="outline" onClick={onSaved}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
