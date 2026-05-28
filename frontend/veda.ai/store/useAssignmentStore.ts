import { create } from "zustand";

export interface Question {
  question: string;
  options?: string[] | null;
  answer?: string;
  marks?: number;
  difficulty?: string;
}

export interface Section {
  title: string;
  instruction: string;
  questions: Question[];
}

export interface Assignment {
  id?: string;
  _id?: string;
  title: string;
  dueDate: string;
  instructions: string;
  totalQuestions: number;
  totalMarks: number;
  status: string;
  progress: number;
  createdAt?: string;
  uploadedMaterial?: {
    fileName?: string;
    fileUrl?: string;
    extractedText?: string;
  };
}

export interface GeneratedPaper {
  id?: string;
  _id?: string;
  assignmentId: string;
  sections: Section[];
  metadata?: {
    model: string;
    generatedAt: string;
  };
}

interface AssignmentStore {
  // Navigation & Core States
  activeTab: string;
  assignments: Assignment[];
  isCreateModalOpen: boolean;
  
  // Real-time generation states
  assignment: Assignment | null;
  generatedPaper: GeneratedPaper | null;
  progress: number;
  logs: string[];
  sections: Section[];
  status: "queued" | "generating" | "completed" | "failed" | "idle";
  
  // Core Setters
  setActiveTab: (tab: string) => void;
  setCreateModalOpen: (open: boolean) => void;
  setAssignments: (assignments: Assignment[]) => void;
  addAssignment: (assignment: Assignment) => void;

  // Real-time Actions
  setAssignment: (assignment: Assignment | null) => void;
  setGeneratedPaper: (paper: GeneratedPaper | null) => void;
  addLog: (log: string) => void;
  setProgress: (progress: number) => void;
  addSection: (section: { title: string; instruction: string }) => void;
  addQuestion: (payload: { sectionTitle: string; question: Question }) => void;
  completeGeneration: (paper: GeneratedPaper) => void;
  resetGeneration: () => void;
}

export const useAssignmentStore = create<AssignmentStore>((set) => ({
  // Defaults
  activeTab: "Assignments",
  assignments: [],
  isCreateModalOpen: false,
  
  assignment: null,
  generatedPaper: null,
  progress: 0,
  logs: [],
  sections: [],
  status: "idle",

  // Core Setters
  setActiveTab: (tab) => set({ activeTab: tab }),
  setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
  setAssignments: (assignments) => set({ assignments }),
  addAssignment: (assignment) =>
    set((state) => ({ assignments: [assignment, ...state.assignments] })),

  // Real-time Handlers
  setAssignment: (assignment) => set({ assignment }),
  setGeneratedPaper: (generatedPaper) => set({ generatedPaper }),
  addLog: (log) => set((state) => ({ logs: [...state.logs, log] })),
  setProgress: (progress) => set({ progress }),
  
  addSection: (section) =>
    set((state) => {
      const exists = state.sections.some((s) => s.title === section.title);
      if (exists) return {};
      const newSection: Section = { ...section, questions: [] };
      return {
        sections: [...state.sections, newSection],
      };
    }),

  addQuestion: (payload) =>
    set((state) => {
      const updatedSections = state.sections.map((sec) => {
        if (sec.title === payload.sectionTitle) {
          const exists = sec.questions.some(
            (q) => q.question === payload.question.question
          );
          if (exists) return sec;
          return {
            ...sec,
            questions: [...sec.questions, payload.question],
          };
        }
        return sec;
      });
      return { sections: updatedSections };
    }),

  completeGeneration: (paper) =>
    set((state) => {
      const updatedCompleted = state.assignment
        ? [
            { ...state.assignment, status: "completed", progress: 100 },
            ...state.assignments.filter((a) => (a._id || a.id) !== state.assignment?._id),
          ]
        : state.assignments;
      return {
        status: "completed",
        progress: 100,
        generatedPaper: paper,
        sections: paper.sections || [],
        assignments: updatedCompleted,
      };
    }),

  resetGeneration: () =>
    set({
      assignment: null,
      generatedPaper: null,
      progress: 0,
      logs: [],
      sections: [],
      status: "idle",
    }),
}));
