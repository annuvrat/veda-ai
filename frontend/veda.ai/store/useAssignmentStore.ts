import { create } from "zustand";

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  instructions: string;
  totalQuestions: number;
  totalMarks: number;
  status: string;
  progress: number;
  createdAt: string;
}

interface AssignmentStore {
  activeTab: string;
  assignments: Assignment[];
  isCreateModalOpen: boolean;
  setActiveTab: (tab: string) => void;
  setCreateModalOpen: (open: boolean) => void;
  addAssignment: (assignment: Assignment) => void;
  setAssignments: (assignments: Assignment[]) => void;
}

export const useAssignmentStore = create<AssignmentStore>((set) => ({
  activeTab: "Assignments",
  assignments: [],
  isCreateModalOpen: false,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
  addAssignment: (assignment) =>
    set((state) => ({ assignments: [assignment, ...state.assignments] })),
  setAssignments: (assignments) => set({ assignments }),
}));
