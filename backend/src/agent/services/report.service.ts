import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProblemReport, ProblemCategory, ProblemSeverity } from '../../database/entities/index.js';
import { Subject, Observable } from 'rxjs';

export interface ReportEvent {
  sessionId: string;
  report: ProblemReport;
}

export interface CreateReportDto {
  sessionId: string;
  category: ProblemCategory;
  severity: ProblemSeverity;
  title: string;
  description: string;
  explanation: string;
  metrics: Record<string, unknown>;
  recommendations?: string[];
}

@Injectable()
export class ReportService {
  private readonly reportSubject = new Subject<ReportEvent>();

  constructor(
    @InjectRepository(ProblemReport)
    private readonly reportRepo: Repository<ProblemReport>,
  ) {}

  get events$(): Observable<ReportEvent> {
    return this.reportSubject.asObservable();
  }

  async createReport(dto: CreateReportDto): Promise<ProblemReport> {
    const report = this.reportRepo.create({
      sessionId: dto.sessionId,
      category: dto.category,
      severity: dto.severity,
      title: dto.title,
      description: dto.description,
      explanation: dto.explanation,
      metrics: dto.metrics,
      recommendations: dto.recommendations,
    });

    const saved = await this.reportRepo.save(report);

    this.reportSubject.next({ sessionId: dto.sessionId, report: saved });

    return saved;
  }

  async getBySession(sessionId: string): Promise<ProblemReport[]> {
    return this.reportRepo.find({
      where: { sessionId },
      order: { detectedAt: 'ASC' },
    });
  }

  async getBySeverity(sessionId: string, severity: ProblemSeverity): Promise<ProblemReport[]> {
    return this.reportRepo.find({
      where: { sessionId, severity },
      order: { detectedAt: 'ASC' },
    });
  }

  async getByCategory(sessionId: string, category: ProblemCategory): Promise<ProblemReport[]> {
    return this.reportRepo.find({
      where: { sessionId, category },
      order: { detectedAt: 'ASC' },
    });
  }
}
