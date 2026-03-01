import { create } from 'zustand';
import type { Session, TimelineEntry, ProblemReport, FormInteraction } from '../types';

interface SessionState {
  activeSession: Session | null;
  timeline: TimelineEntry[];
  reports: ProblemReport[];
  pendingForms: FormInteraction[];

  setActiveSession: (session: Session | null) => void;
  updateSessionStatus: (status: Session['status']) => void;
  appendTimeline: (entry: TimelineEntry) => void;
  appendReport: (report: ProblemReport) => void;
  appendForm: (form: FormInteraction) => void;
  markFormSubmitted: (formId: string) => void;
  setTimeline: (entries: TimelineEntry[]) => void;
  setReports: (reports: ProblemReport[]) => void;
  setForms: (forms: FormInteraction[]) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSession: null,
  timeline: [],
  reports: [],
  pendingForms: [],

  setActiveSession: (session) => set({ activeSession: session }),
  updateSessionStatus: (status) =>
    set((state) => ({
      activeSession: state.activeSession ? { ...state.activeSession, status } : null,
    })),
  appendTimeline: (entry) =>
    set((state) => ({ timeline: [...state.timeline, entry] })),
  appendReport: (report) =>
    set((state) => ({ reports: [...state.reports, report] })),
  appendForm: (form) =>
    set((state) => ({ pendingForms: [...state.pendingForms, form] })),
  markFormSubmitted: (formId) =>
    set((state) => ({
      pendingForms: state.pendingForms.map((f) =>
        f.id === formId ? { ...f, status: 'submitted' as const } : f,
      ),
    })),
  setTimeline: (entries) => set({ timeline: entries }),
  setReports: (reports) => set({ reports }),
  setForms: (forms) => set({ pendingForms: forms }),
  clearSession: () =>
    set({ activeSession: null, timeline: [], reports: [], pendingForms: [] }),
}));
