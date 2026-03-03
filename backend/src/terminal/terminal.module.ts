import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { TerminalSessionService } from './terminal-session.service.js';
import { TerminalAutocompleteService } from './terminal-autocomplete.service.js';
import { TerminalGateway } from './terminal.gateway.js';

@Module({
  imports: [DatabaseModule],
  providers: [TerminalSessionService, TerminalAutocompleteService, TerminalGateway],
})
export class TerminalModule {}
