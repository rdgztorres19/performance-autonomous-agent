import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ConfigurationService, CreateConfigDto, UpdateConfigDto } from '../../config/configuration.service.js';
import { ConnectionVerificationService } from '../../config/connection-verification.service.js';
import type { VerifyInput } from '../../config/connection-verification.service.js';

@Controller('api/config')
export class ConfigurationController {
  constructor(
    private readonly configService: ConfigurationService,
    private readonly verificationService: ConnectionVerificationService,
  ) {}

  @Post('verify')
  async verifyConnection(@Body() dto: VerifyInput & { id?: string }) {
    let input: VerifyInput = { ...dto };
    if (dto.id && dto.connectionType !== 'local') {
      try {
        const stored = await this.configService.getConfigForVerify(dto.id);
        if (!dto.sshPassword?.trim() && stored.sshPassword) {
          input = { ...input, sshPassword: stored.sshPassword };
        }
        if (!dto.sshPrivateKey?.trim() && stored.sshPrivateKey) {
          input = { ...input, sshPrivateKey: stored.sshPrivateKey };
        }
      } catch {
        /* config not found, use form data as-is */
      }
    }
    const ok = await this.verificationService.verify(input);
    return { success: ok, connectionStatus: ok ? 'online' : 'offline' };
  }

  @Post(':id/verify')
  async verifyById(@Param('id') id: string) {
    const config = await this.configService.findById(id);
    const ok = await this.verificationService.verify(config);
    await this.configService.updateConnectionStatus(id, ok ? 'online' : 'offline');
    return { success: ok, connectionStatus: ok ? 'online' : 'offline' };
  }

  @Get()
  async findAll() {
    const configs = await this.configService.findAll();
    return configs.map((c) => this.configService.toSafeResponse(c));
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const config = await this.configService.findById(id);
    return this.configService.toSafeResponse(config);
  }

  @Post()
  async create(@Body() dto: CreateConfigDto) {
    const config = await this.configService.create(dto);
    return this.configService.toSafeResponse(config);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateConfigDto) {
    const config = await this.configService.update(id, dto);
    return this.configService.toSafeResponse(config);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.configService.delete(id);
    return { success: true };
  }
}
