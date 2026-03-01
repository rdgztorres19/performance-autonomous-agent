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
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateConfigDto = Omit<Configuration, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>;
export type UpdateConfigDto = Partial<CreateConfigDto>;
