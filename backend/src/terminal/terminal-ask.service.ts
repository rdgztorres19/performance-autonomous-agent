import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatOpenAI } from '@langchain/openai';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { Configuration } from '../database/entities/index.js';

const MAX_CONTEXT_LENGTH = 6000;

const SYSTEM_PROMPT = `You are a helpful assistant that explains terminal output. The user has selected text from a terminal session and is asking a question about it.

The context may include multiple sections (e.g. "--- New selection (output/selection) ---") when the user adds new terminal output to the conversation. Use this for step-by-step guidance: they may have run a command you suggested and are now asking about the result.

When giving recommendations or fixes:
- Always include the exact command SYNTAX the user can copy-paste (e.g., \`command --flag arg\`)
- Provide CONCRETE EXAMPLES based on the selected context (paths, names, values from the selection)
- If the selection shows an error or file/process names, use those in your examples

Structure your answer clearly:
- Brief explanation
- Recommended commands with syntax
- One or more examples tailored to the selected context

Respond in the same language as the user's question.`;

@Injectable()
export class TerminalAskService {
  constructor(
    @InjectRepository(Configuration)
    private readonly configRepo: Repository<Configuration>,
  ) {}

  async ask(
    configurationId: string,
    selectedText: string,
    question: string,
    conversationHistory?: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<{ answer: string } | { error: string }> {
    const config = await this.configRepo.findOneByOrFail({ id: configurationId });
    if (!config.openaiApiKey?.trim()) {
      return { error: 'Configure OpenAI API key in the configuration to use this feature.' };
    }

    const trimmedQuestion = question?.trim() ?? '';
    if (trimmedQuestion.length < 1) {
      return { error: 'Please enter a question.' };
    }

    const trimmed = selectedText?.trim() ?? '';
    const truncatedContext =
      trimmed.length > MAX_CONTEXT_LENGTH
        ? trimmed.slice(-MAX_CONTEXT_LENGTH)
        : trimmed;
    if (truncatedContext.length === 0) {
      return { error: 'No context selected.' };
    }

    const llm = new ChatOpenAI({
      apiKey: config.openaiApiKey,
      model: config.openaiModel ?? 'gpt-4o-mini',
      temperature: 0.3,
    });

    const baseContext = `Selected terminal output:\n\`\`\`\n${truncatedContext}\n\`\`\``;
    const hasHistory = Array.isArray(conversationHistory) && conversationHistory.length > 0;

    const historyMessages: BaseMessage[] = (conversationHistory ?? []).flatMap((m) =>
      m.role === 'user'
        ? ([new HumanMessage(m.content)] as BaseMessage[])
        : ([new AIMessage(m.content)] as BaseMessage[]),
    );

    const messages: BaseMessage[] = [
      new SystemMessage(SYSTEM_PROMPT),
      ...historyMessages,
      new HumanMessage(
        hasHistory ? trimmedQuestion : `${baseContext}\n\nUser question: ${trimmedQuestion}`,
      ),
    ];

    try {
      const response = await llm.invoke(messages);

      const answer =
        typeof response.content === 'string'
          ? response.content
          : String(response.content ?? '');
      return { answer };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: msg };
    }
  }
}
