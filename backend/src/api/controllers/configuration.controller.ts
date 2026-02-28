import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ConfigurationService, CreateConfigDto, UpdateConfigDto } from '../../config/configuration.service.js';

@Controller('api/config')
export class ConfigurationController {
  constructor(private readonly configService: ConfigurationService) {}

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
