import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import type {
  Configuration,
  CreateConfigDto,
  UpdateConfigDto,
  Session,
  TimelineEntry,
  ProblemReport,
  FormInteraction,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  // Configuration
  getConfigurations(): Observable<Configuration[]> {
    return this.http.get<Configuration[]>(`${this.baseUrl}/config`);
  }

  getConfiguration(id: string): Observable<Configuration> {
    return this.http.get<Configuration>(`${this.baseUrl}/config/${id}`);
  }

  createConfiguration(dto: CreateConfigDto): Observable<Configuration> {
    return this.http.post<Configuration>(`${this.baseUrl}/config`, dto);
  }

  updateConfiguration(id: string, dto: UpdateConfigDto): Observable<Configuration> {
    return this.http.put<Configuration>(`${this.baseUrl}/config/${id}`, dto);
  }

  deleteConfiguration(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/config/${id}`);
  }

  // Sessions
  startSession(configurationId: string): Observable<Session> {
    return this.http.post<Session>(`${this.baseUrl}/sessions`, { configurationId });
  }

  getSession(id: string): Observable<Session> {
    return this.http.get<Session>(`${this.baseUrl}/sessions/${id}`);
  }

  stopSession(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/sessions/${id}/stop`, {});
  }

  getTimeline(sessionId: string): Observable<TimelineEntry[]> {
    return this.http.get<TimelineEntry[]>(`${this.baseUrl}/sessions/${sessionId}/timeline`);
  }

  getReports(sessionId: string): Observable<ProblemReport[]> {
    return this.http.get<ProblemReport[]>(`${this.baseUrl}/sessions/${sessionId}/reports`);
  }

  getForms(sessionId: string): Observable<FormInteraction[]> {
    return this.http.get<FormInteraction[]>(`${this.baseUrl}/sessions/${sessionId}/forms`);
  }
}
