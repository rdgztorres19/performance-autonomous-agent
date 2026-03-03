import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Configuration } from '../database/entities/index.js';

const MAX_SUGGESTIONS = 5;

const PROMPT = `You are a shell command assistant. The user may type either:
1. A partial shell command (e.g. "docker ru", "git che") - suggest completions
2. A natural language description (e.g. "command to open bash in docker container", "list files by size") - suggest full shell commands that accomplish the goal

Rules:
- Return ONLY a JSON array of strings, e.g. ["suggestion1", "suggestion2"]
- Maximum ${MAX_SUGGESTIONS} suggestions
- For partial commands: suggest complete continuations, file paths, or arguments
- For natural language: suggest ready-to-run commands (e.g. for "open bash in docker container" -> ["docker exec -it <container_id> bash", "docker run -it <image> bash"])
- No explanations, only the JSON array
- If the line is empty or too short, return []
- Commands must be copy-paste ready; use placeholders like <container_id> or <image> when needed`;

@Injectable()
export class TerminalAutocompleteService {
  constructor(
    @InjectRepository(Configuration)
    private readonly configRepo: Repository<Configuration>,
  ) {}

  async suggest(
    configurationId: string,
    line: string,
    _cursorIndex?: number,
    context?: string,
  ): Promise<string[]> {
    const config = await this.configRepo.findOneByOrFail({ id: configurationId });
    if (!config.openaiApiKey?.trim()) {
      return [];
    }

    const trimmed = line?.trim() ?? '';
    if (trimmed.length < 2) {
      return [];
    }

    const llm = new ChatOpenAI({
      apiKey: config.openaiApiKey,
      model: config.openaiModel ?? 'gpt-4o-mini',
      temperature: 0,
    });

    const userMessage = context
      ? `Context (last lines from terminal):\n${context}\n\nPartial command: "${trimmed}"\n\nSuggest completions as JSON array:`
      : `Partial command: "${trimmed}"\n\nSuggest completions as JSON array:`;

    const response = await llm.invoke([
      new SystemMessage(PROMPT),
      new HumanMessage(userMessage),
    ]);

    const content = typeof response.content === 'string' ? response.content : String(response.content ?? '');
    try {
      const match = content.match(/\[[\s\S]*?\]/);
      if (!match) return [];
      const arr = JSON.parse(match[0]) as unknown;
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((x): x is string => typeof x === 'string')
        .slice(0, MAX_SUGGESTIONS);
    } catch {
      return [];
    }
  }
}
