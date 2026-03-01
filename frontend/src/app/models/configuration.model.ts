export interface Configuration {
  id: string;
  name: string;
  connectionType: 'local' | 'ssh';
  sshHost?: string;
  sshPort?: number;
  sshUsername?: string;
  sshPassword?: string;
  sshPrivateKey?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConfigDto {
  name: string;
  connectionType: 'local' | 'ssh';
  sshHost?: string;
  sshPort?: number;
  sshUsername?: string;
  sshPassword?: string;
  sshPrivateKey?: string;
  openaiApiKey?: string;
  openaiModel?: string;
}

export type UpdateConfigDto = Partial<CreateConfigDto>;
