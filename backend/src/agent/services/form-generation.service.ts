import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { FormInteraction, FormInteractionStatus } from '../../database/entities/index.js';
import { FORM_GENERATION_PROMPT } from '../prompts/system-prompt.js';
import { Subject, Observable } from 'rxjs';

export interface FormRequestEvent {
  sessionId: string;
  formInteraction: FormInteraction;
}

@Injectable()
export class FormGenerationService {
  private readonly formSubject = new Subject<FormRequestEvent>();

  constructor(
    @InjectRepository(FormInteraction)
    private readonly formRepo: Repository<FormInteraction>,
  ) {}

  get formRequests$(): Observable<FormRequestEvent> {
    return this.formSubject.asObservable();
  }

  async generateForm(
    llm: ChatOpenAI,
    sessionId: string,
    context: string,
  ): Promise<FormInteraction> {
    const response = await llm.invoke([
      new SystemMessage(FORM_GENERATION_PROMPT),
      new HumanMessage(context),
    ]);

    let formSchema: Record<string, unknown>;
    try {
      const content = typeof response.content === 'string' ? response.content : '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      formSchema = jsonMatch ? JSON.parse(jsonMatch[0]) : { fields: [] };
    } catch {
      formSchema = { fields: [] };
    }

    const formInteraction = this.formRepo.create({
      sessionId,
      context,
      formSchema,
      status: FormInteractionStatus.PENDING,
    });

    const saved = await this.formRepo.save(formInteraction);
    this.formSubject.next({ sessionId, formInteraction: saved });

    return saved;
  }

  async submitResponse(
    formId: string,
    response: Record<string, unknown>,
  ): Promise<FormInteraction> {
    const form = await this.formRepo.findOneByOrFail({ id: formId });
    form.status = FormInteractionStatus.SUBMITTED;
    form.response = response;
    form.respondedAt = new Date();
    return this.formRepo.save(form);
  }

  async getPendingForms(sessionId: string): Promise<FormInteraction[]> {
    return this.formRepo.find({
      where: { sessionId, status: FormInteractionStatus.PENDING },
    });
  }

  async getBySession(sessionId: string): Promise<FormInteraction[]> {
    return this.formRepo.find({
      where: { sessionId },
      order: { requestedAt: 'ASC' },
    });
  }
}
