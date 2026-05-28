"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAssignmentStore } from "../store/useAssignmentStore";
import {
  Home,
  Users,
  FileText,
  Book,
  Library,
  Settings,
  Bell,
  ChevronDown,
  ArrowLeft,
  LayoutGrid,
  Plus,
  Sparkles,
  Search,
  Filter,
  MoreVertical,
  Loader2,
  UploadCloud,
  X,
  Mic,
  MicOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const USER_ID = "6a1698cdb2b362a0ebad5a2f";
const API_BASE = "http://localhost:3001/api/assignments";

export default function Page() {
  const router = useRouter();
  const {
    activeTab,
    setActiveTab,
    isCreateModalOpen,
    setCreateModalOpen,
    assignments,
    setAssignments,
    addAssignment,
    setAssignment,
  } = useAssignmentStore();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDropdownCardId, setActiveDropdownCardId] = useState<
    string | null
  >(null);

  // ── CREATE FORM STATE ──
  const [dueDate, setDueDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedMaterial, setUploadedMaterial] = useState<{
    fileName: string;
    fileUrl: string;
  } | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [questionConfigs, setQuestionConfigs] = useState([
    { type: "Multiple Choice Questions", count: 4, marks: 1 },
    { type: "Short Questions", count: 3, marks: 2 },
    { type: "Diagram/Graph-Based Questions", count: 5, marks: 5 },
    { type: "Numerical Problems", count: 5, marks: 5 },
  ]);

  // ── MIC STATE — recognition stored in ref so stop() works ──
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // ── GENERATION OVERLAY STATE ──
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [generationStatus, setGenerationStatus] = useState<string>("queued");
  const [generationError, setGenerationError] = useState<string | null>(null);

  // ── FIX: reset modal state on mount so page refresh never drops into create form ──
  useEffect(() => {
    setCreateModalOpen(false);
  }, []);

  // ── FETCH ASSIGNMENTS ──
  const fetchAssignments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/user/${USER_ID}?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.data?.assignments || []);
      }
    } catch (err) {
      console.error("Error fetching assignments:", err);
    } finally {
      setIsLoading(false);
    }
  }, [setAssignments]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // ── GLOBAL CLICK: close card dropdowns AND user dropdown ──
  useEffect(() => {
    const handler = () => {
      setActiveDropdownCardId(null);
      setIsDropdownOpen(false);
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const handleDeleteAssignment = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAssignments(assignments.filter((a) => (a._id || a.id) !== id));
      }
    } catch (err) {
      console.error("Error deleting assignment:", err);
    } finally {
      setActiveDropdownCardId(null);
    }
  };

  const formatDate = (dateStr: any) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return `${String(d.getDate()).padStart(2, "0")}-${String(
        d.getMonth() + 1
      ).padStart(2, "0")}-${d.getFullYear()}`;
    } catch {
      return String(dateStr);
    }
  };

  const navItems = [
    { id: "Home", label: "Home", icon: Home },
    { id: "My Groups", label: "My Groups", icon: Users },
    { id: "Assignments", label: "Assignments", icon: FileText },
    { id: "AI Teacher's Toolkit", label: "AI Teacher's Toolkit", icon: Book },
    { id: "My Library", label: "My Library", icon: Library },
  ];

  const completedAssignments = assignments.filter(
    (a) => a.status === "completed"
  );
  const searchedAssignments = completedAssignments.filter((a) =>
    a.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── QUESTION CONFIG HANDLERS ──
  const handleUpdateCount = (index: number, delta: number) => {
    const updated = [...questionConfigs];
    updated[index].count = Math.max(1, updated[index].count + delta);
    setQuestionConfigs(updated);
  };
  const handleUpdateMarks = (index: number, delta: number) => {
    const updated = [...questionConfigs];
    updated[index].marks = Math.max(1, updated[index].marks + delta);
    setQuestionConfigs(updated);
  };
  const handleDeleteRow = (index: number) =>
    setQuestionConfigs(questionConfigs.filter((_, i) => i !== index));
  const handleAddRow = () =>
    setQuestionConfigs([
      ...questionConfigs,
      { type: "Multiple Choice Questions", count: 1, marks: 1 },
    ]);
  const handleRowTypeChange = (index: number, newType: string) => {
    const updated = [...questionConfigs];
    updated[index].type = newType;
    setQuestionConfigs(updated);
  };

  const totalQuestionsCount = questionConfigs.reduce(
    (s, i) => s + i.count,
    0
  );
  const totalMarksCount = questionConfigs.reduce(
    (s, i) => s + i.count * i.marks,
    0
  );

  // ── FILE HANDLERS ──
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0]);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  };
  const removeSelectedFile = () => {
    setSelectedFile(null);
    setUploadedMaterial(null);
  };

  // ── SPEECH RECOGNITION (FIXED) ──
  // - Stores recognition in ref so stop() actually works
  // - Ignores non-fatal errors (no-speech, aborted)
  // - Uses continuous:true so it keeps listening until you click stop
  const toggleSpeechRecognition = () => {
    // Stop if already listening
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Voice input is not supported in this browser. Please use Chrome or Edge."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognition.onerror = (e: any) => {
      // non-fatal: browser timed out waiting for speech, or we called .stop()
      const nonFatal = ["no-speech", "aborted"];
      if (nonFatal.includes(e.error)) return;
      console.error("Speech recognition error:", e.error);
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as any[])
        .map((r: any) => r[0].transcript)
        .join(" ")
        .trim();
      if (transcript) {
        setInstructions((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      recognitionRef.current = null;
      setIsListening(false);
    }
  };

  // ── SUBMIT ──
  const handleGenerateAssignment = async () => {
    if (!dueDate) {
      alert("Due Date is required.");
      return;
    }
    if (questionConfigs.length === 0) {
      alert("Please configure at least one question type.");
      return;
    }

    let currentUploadedMaterial = uploadedMaterial;

    try {
      setIsGenerating(true);
      setGenerationStatus("queued");
      setGenerationProgress(5);
      setGenerationLogs([
        "Initiating assignment creation...",
        "Validating input parameters...",
      ]);
      setGenerationError(null);

      if (selectedFile && !uploadedMaterial) {
        setIsUploadingFile(true);
        setGenerationLogs((p) => [
          ...p,
          `Uploading "${selectedFile.name}" to Cloudinary...`,
        ]);
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadRes = await fetch("http://localhost:3001/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload material file.");
        const materialData = (await uploadRes.json()).data || {};
        currentUploadedMaterial = {
          fileName: materialData.fileName,
          fileUrl: materialData.fileUrl,
        };
        setUploadedMaterial(currentUploadedMaterial);
        setIsUploadingFile(false);
        setGenerationLogs((p) => [
          ...p,
          "File hosted successfully on Cloudinary!",
        ]);
      }

      setGenerationProgress(20);
      setGenerationLogs((p) => [
        ...p,
        "Submitting to Mongoose and BullMQ queues...",
      ]);

      const computedTitle = selectedFile
        ? selectedFile.name.replace(/\.[^/.]+$/, "")
        : instructions.trim().slice(0, 24) || "VedaAI Assignment";

      const payload = {
        title: computedTitle,
        createdBy: USER_ID,
        dueDate: new Date(dueDate).toISOString(),
        instructions,
        uploadedMaterial: currentUploadedMaterial || undefined,
        questionConfigs: questionConfigs.map((c) => ({
          type: c.type,
          count: Number(c.count),
          marks: Number(c.marks),
        })),
        totalQuestions: totalQuestionsCount,
        totalMarks: totalMarksCount,
      };

      const createRes = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!createRes.ok) throw new Error("Failed to register assignment.");

      const assignment = (await createRes.json()).data || {};
      router.push(`/assignments/${assignment._id}/generating`);
      setCreateModalOpen(false);
    } catch (err: any) {
      console.error("Assignment generation failed:", err);
      setIsUploadingFile(false);
      setGenerationStatus("failed");
      setGenerationError(err.message || "An unexpected error occurred.");
      setIsGenerating(false);
    }
  };

  const closeGenerationOverlay = () => {
    setIsGenerating(false);
    setCreateModalOpen(false);
    setDueDate("");
    setInstructions("");
    setSelectedFile(null);
    setUploadedMaterial(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-[#e2e3e4] p-4 gap-6 font-sans overflow-hidden">
      {/* ══════════════════════ SIDEBAR ══════════════════════ */}
      <aside className="w-82 bg-white rounded-3xl shadow-2xl border border-zinc-100 flex flex-col justify-between p-6 shrink-0 select-none">
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <div className="flex items-center -ml-5 -mt-6">
            <img
              src="/logo 2.png"
              alt="VedaAI Logo"
              className="mt-6 w-24 h-22 object-contain transform hover:rotate-6 transition-all duration-300"
            />
            <span
              className="-ml-4 text-3xl font-bold tracking-tight text-zinc-900"
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              VedaAI
            </span>
          </div>

          {/* CTA */}
          <div className="w-full rounded-full p-[3.5px] bg-gradient-to-t from-[#C0350A] to-[#FF7950] shadow-sm hover:shadow-md transition-all duration-200">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="w-full bg-[#1E1E1E] text-white py-3 px-5 rounded-full font-medium flex items-center justify-center gap-2.5 hover:bg-[#252525] active:scale-98 transition-all duration-200 group relative overflow-hidden cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-white fill-white group-hover:animate-pulse" />
              <span className="text-[18px]">Create Assignment</span>
              <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </button>
          </div>

          {/* Nav */}
          <nav className="mt-8 flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id && !isCreateModalOpen;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCreateModalOpen(false);
                    setActiveTab(item.id);
                  }}
                  className={`w-full flex items-center gap-4 py-3 px-4 rounded-xl text-left text-[16px] font-medium transition-all duration-200 cursor-pointer ${isActive
                      ? "bg-[#EFEFEF] text-zinc-900 font-semibold"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
                    }`}
                >
                  <Icon
                    className={`w-5 h-5 ${isActive ? "text-zinc-900 scale-110" : "text-zinc-400"
                      }`}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.id === "Assignments" &&
                    completedAssignments.length > 0 && (
                      <span className="bg-[#e04f2f] text-white text-[12px] font-bold px-2 py-0.5 rounded-full shrink-0 min-w-[22px] text-center">
                        {completedAssignments.length}
                      </span>
                    )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => {
              setCreateModalOpen(false);
              setActiveTab("Settings");
            }}
            className="flex items-center gap-4 py-2.5 px-4 rounded-xl text-[17px] font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 transition-all duration-200 text-left w-full cursor-pointer"
          >
            <Settings className="w-7 h-7 text-zinc-400" />
            Settings
          </button>
          <div className="bg-[#EFEFEF] p-4 rounded-2xl flex items-center gap-3.5 border border-zinc-100/50">
            <div className="w-14 h-14 rounded-full bg-[#fcd34d] overflow-hidden flex items-center justify-center border-2 border-white shrink-0">
              <img
                src="https://api.dicebear.com/7.x/adventurer/svg?seed=john"
                alt="School logo"
                className="w-9 h-9"
              />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-[15px] font-bold text-zinc-800 truncate leading-tight">
                Delhi Public School
              </span>
              <span className="text-[14px] text-zinc-500 truncate leading-none mt-0.5">
                Bokaro Steel City
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ══════════════════════ MAIN ══════════════════════ */}
      <main className="flex-1 flex flex-col gap-6 relative h-[calc(100vh-2rem)] overflow-y-auto pr-2">
        {/* Header */}
        <header className="bg-white rounded-2xl border border-zinc-100/50 p-2 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="p-2 hover:bg-zinc-50 rounded-lg active:scale-95 transition-all text-zinc-600 cursor-pointer"
            >
              <ArrowLeft className="w-8 h-8" />
            </button>
            <div className="h-5 w-[1px] bg-zinc-200" />
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4.5 h-4.5 text-zinc-400" />
              <span className="text-[18px] font-semibold text-zinc-400 select-none">
                {isCreateModalOpen ? "Create Assignment" : "Assignment"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <button className="relative p-2 hover:bg-zinc-50 rounded-full text-zinc-600 active:scale-95 transition-all cursor-pointer">
              <Bell className="w-7 h-7" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#e04f2f] rounded-full ring-2 ring-white" />
            </button>

            {/* User dropdown — stopPropagation so global click doesn't immediately close it */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDropdownOpen((v) => !v);
                }}
                className="flex items-center gap-3 hover:bg-zinc-50 py-1.5 px-3 rounded-full transition-all duration-200 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-[#f87171] overflow-hidden flex items-center justify-center border border-zinc-200">
                  <img
                    src="https://api.dicebear.com/7.x/adventurer/svg?seed=john"
                    alt="User"
                    className="w-10 h-10"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[18px] font-semibold text-zinc-700 select-none">
                    James Bond
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""
                      }`}
                  />
                </div>
              </button>

              {isDropdownOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 mt-2.5 w-48 bg-white border border-zinc-100 rounded-xl shadow-lg py-1.5 z-50"
                >
                  <button className="w-full text-left px-4 py-2 text-[13px] text-zinc-700 hover:bg-zinc-50 cursor-pointer">
                    My Profile
                  </button>
                  <button className="w-full text-left px-4 py-2 text-[13px] text-zinc-700 hover:bg-zinc-50 cursor-pointer">
                    Security
                  </button>
                  <div className="h-[1px] bg-zinc-100 my-1" />
                  <button className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 cursor-pointer">
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ══ PANEL ══ */}
        {isCreateModalOpen ? (
          /* ════════════════ CREATE FORM ════════════════ */
          <section className="flex-1 flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-300 select-none px-2 pb-16">
            {/* Generation overlay */}
            {isGenerating && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div className="bg-[#1E1E1E] text-zinc-300 w-full max-w-xl rounded-3xl border border-zinc-800 shadow-2xl p-6 flex flex-col gap-5">
                  <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2.5">
                      {generationStatus === "completed" ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      ) : generationStatus === "failed" ? (
                        <AlertCircle className="w-6 h-6 text-red-500" />
                      ) : (
                        <Loader2 className="w-6 h-6 text-[#FF7950] animate-spin" />
                      )}
                      <span
                        className="text-[17px] font-bold text-white"
                        style={{
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                        }}
                      >
                        {generationStatus === "completed"
                          ? "Paper Extracted Successfully!"
                          : generationStatus === "failed"
                            ? "Generation Failed"
                            : "Extracting Assignment..."}
                      </span>
                    </div>
                    <span className="text-zinc-500 font-mono text-[14px]">
                      {generationProgress}%
                    </span>
                  </div>

                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#FF7950] to-[#C0350A] h-full transition-all duration-300 rounded-full"
                      style={{ width: `${generationProgress}%` }}
                    />
                  </div>

                  <div className="bg-[#121212] rounded-xl p-4 font-mono text-[12.5px] leading-relaxed max-h-56 overflow-y-auto flex flex-col gap-1.5 border border-zinc-800/50">
                    {generationLogs.map((log, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-zinc-600 shrink-0">&gt;</span>
                        <span
                          className={
                            log.includes("Cloudinary")
                              ? "text-cyan-400"
                              : log.includes("BullMQ")
                                ? "text-purple-400"
                                : log.includes("Error")
                                  ? "text-red-400"
                                  : "text-zinc-300"
                          }
                        >
                          {log}
                        </span>
                      </div>
                    ))}
                    {generationStatus === "completed" && (
                      <div className="text-green-400 font-bold mt-2">
                        &gt; Job Complete! Assignment saved.
                      </div>
                    )}
                    {generationError && (
                      <div className="text-red-400 font-bold mt-2">
                        &gt; Error: {generationError}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                    {generationStatus === "completed" && (
                      <button
                        onClick={closeGenerationOverlay}
                        className="bg-white hover:bg-zinc-100 text-black px-6 py-2.5 rounded-full font-bold text-[14px] cursor-pointer shadow-md active:scale-95 transition-all"
                      >
                        Go to Dashboard
                      </button>
                    )}
                    {generationStatus === "failed" && (
                      <button
                        onClick={() => setIsGenerating(false)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2.5 rounded-full font-bold text-[14px] cursor-pointer active:scale-95 transition-all"
                      >
                        Edit Configuration
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Narrow container ── */}
            <div className="w-full max-w-6xl flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <h1
                  className="text-[28px] font-bold text-zinc-900 tracking-tight"
                  style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
                >
                  Create Assignment
                </h1>
                <p className="text-[18px] text-zinc-500">
                  Set up a new assignment for your students
                </p>
              </div>

              <div className="w-full bg-zinc-300 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#1E1E1E] w-[45%] h-full rounded-full" />
              </div>

              {/* ── GRAY OUTER CARD (matches Figma) ── */}
              <div className="bg-[#F3F4F6] rounded-3xl border border-zinc-200 p-6 flex flex-col gap-6">
                <div className="flex flex-col border-b border-zinc-300/50 pb-4">
                  <h2
                    className="text-[21px] font-bold text-zinc-800"
                    style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
                  >
                    Assignment Details
                  </h2>
                  <p className="text-[16px] text-zinc-400">
                    Basic information about your assignment
                  </p>
                </div>

                {/* Upload — WHITE card */}
                <div className="flex flex-col gap-2">
                  <label className="text-[14.5px] font-bold text-zinc-700">
                    Upload Reference Material
                  </label>
                  {selectedFile ? (
                    <div className="flex items-center justify-between p-5 bg-white border border-zinc-200 rounded-2xl shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-zinc-600" />
                        </div>
                        <div className="flex flex-col leading-tight">
                          <span className="text-[14.5px] font-semibold text-zinc-800 max-w-xs truncate">
                            {selectedFile.name}
                          </span>
                          <span className="text-[12.5px] text-zinc-400 mt-0.5">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={removeSelectedFile}
                        className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 cursor-pointer transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white border-2 border-dashed border-zinc-300 hover:border-zinc-400 transition-colors rounded-2xl p-14  flex flex-col items-center justify-center text-center cursor-pointer group shadow-xs"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*,application/pdf,text/plain"
                        className="hidden"
                      />
                      <UploadCloud className="w-10 h-10 text-zinc-400 mb-3 group-hover:-translate-y-0.5 transition-transform duration-200" />
                      <span className="text-[15px] font-semibold text-zinc-700">
                        Choose a file or drag & drop it here
                      </span>
                      <span className="text-[13px] text-zinc-400 mt-1">
                        JPEG, PNG, upto 10MB
                      </span>
                      <button
                        type="button"
                        className="mt-4 px-5 py-2 bg-white border border-zinc-200 rounded-full text-[13.5px] font-semibold text-zinc-600 hover:bg-zinc-50 shadow-xs cursor-pointer"
                      >
                        Browse Files
                      </button>
                    </div>
                  )}
                  <span className="text-[12.5px] text-zinc-400">
                    Upload images of your preferred document/image
                  </span>
                </div>

                {/* Due Date — WHITE input */}
                <div className="flex flex-col gap-2">
                  <label className="text-[16px] font-bold text-zinc-700"
                  style={{fontFamily:"Bricolage Grotesque"}}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-55 border border-zinc-200 rounded-xl text-[15px] focus:outline-none focus:border-zinc-300 transition-all text-zinc-700 cursor-pointer shadow-xs"
                  />
                </div>

                {/* Question Types */}
                <div className="flex flex-col gap-3">
                  <label className="text-[16px] font-bold text-zinc-700"
                  style={{
                    fontFamily: "Bricolage Grotesque"
                  }}>
                    Question Types & Criteria
                  </label>

                  {/* Column headers */}
                  <div className="grid grid-cols-12 gap-3 pb-2  border-zinc-300/50 text-[13px] font-bold text-zinc-500 select-none">
                    <div className="col-span-6">Question Type</div>
                    <div className="col-span-3 text-center">
                      No. of Questions
                    </div>
                    <div className="col-span-2 text-center">Marks</div>
                    <div className="col-span-1" />
                  </div>

                  {/* Rows — each row is a WHITE card */}
                  <div className="flex flex-col gap-2.5">
                    {questionConfigs.map((row, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-3 items-center bg- rounded-2xl px-3 py-2.5  border-zinc-200 shadow-xs"
                      >
                        {/* Dropdown + X */}
                        <div className="col-span-6 flex items-center gap-1.5">
                          <div className="flex-1 relative">
                            <select
                              value={row.type}
                              onChange={(e) =>
                                handleRowTypeChange(idx, e.target.value)
                              }
                              className="w-full pl-3 pr-8 py-3 bg-white  border-zinc-200 rounded-xl text-[16px] font-medium text-zinc-700 focus:outline-none cursor-pointer appearance-none"
                              style={{fontFamily: "Bricolage Grotesque"}}
                            >
                              <option value="Multiple Choice Questions">
                                Multiple Choice Questions
                              </option>
                              <option value="Short Questions">
                                Short Questions
                              </option>
                              <option value="Diagram/Graph-Based Questions">
                                Diagram/Graph-Based Questions
                              </option>
                              <option value="Numerical Problems">
                                Numerical Problems
                              </option>
                              <option value="True/False Questions">
                                True/False Questions
                              </option>
                              <option value="Long Answer Questions">
                                Long Answer Questions
                              </option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-800 pointer-events-none" />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(idx)}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 hover:text-red-500 text-zinc-800 cursor-pointer transition-all shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Count pill */}
                        <div className="col-span-3 flex justify-center">
                          <div className="flex items-center bg-white border border-zinc-200 rounded-full px-1 py-2 gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateCount(idx, -1)}
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-white  border-zinc-200 text-zinc-300 font-bold hover:bg-zinc-100 active:scale-90 cursor-pointer shadow-xs transition-all"
                            >
                              −
                            </button>
                            <span className="w-9 text-center text-[14px] font-bold text-zinc-800 select-none">
                              {row.count}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCount(idx, 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-white  border-zinc-200 text-zinc-300 font-bold hover:bg-zinc-100 active:scale-90 cursor-pointer shadow-xs transition-all"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Marks pill */}
                        <div className="col-span-2 flex justify-center">
                          <div className="flex items-center bg-white border border-zinc-200 rounded-full px-1 py-2 gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateMarks(idx, -1)}
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-white  border-zinc-200 text-zinc-300 font-bold hover:bg-zinc-100 active:scale-90 cursor-pointer shadow-xs transition-all"
                            >
                              −
                            </button>
                            <span className="w-8 text-center text-[14px] font-bold text-zinc-800 select-none">
                              {row.marks}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateMarks(idx, 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-white  border-zinc-200 text-zinc-300 font-bold hover:bg-zinc-100 active:scale-90 cursor-pointer shadow-xs transition-all"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="col-span-1" />
                      </div>
                    ))}
                  </div>

                  {/* Add row + totals */}
                  <div className="flex items-center justify-between mt-1 pt-3  border-zinc-300/50">
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="flex items-center gap-2 px-4 py-2 bg-[#1E1E1E] rounded-full text-white text-[13.5px] font-bold hover:bg-[#333] active:scale-95 cursor-pointer transition-all shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      Add Question Type
                    </button>
                    <div className="flex flex-col items-end text-[15px] text-zinc-800 font-semibold leading-snug"
                    style={{fontFamily:"Bricolage Grotesque"}}>
                      <span>
                        Total Questions :{" "}
                        <strong className="text-zinc-800">
                          {totalQuestionsCount}
                        </strong>
                      </span>
                      <span>
                        Total Marks :{" "}
                        <strong className="text-zinc-800">
                          {totalMarksCount}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Info + Mic — WHITE textarea */}
                <div className="flex flex-col gap-2">
                  <label className="text-[16px] font-bold text-zinc-700"
                  style={{fontFamily:"Bricolage Grotesque"}}>
                    Additional Information{" "}
                    <span className=" font-bold text-zinc-700">
                      (For better output)
                    </span>
                  </label>
                  <div className="relative">
                    <textarea
                      rows={4}
                      placeholder="e.g. Generate CBSE analytical science questions. Use mid-level difficulty."
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      className="w-full pl-4 pr-14 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-[15px] focus:outline-none focus:border-zinc-300 transition-all placeholder-zinc-400 resize-none shadow-xs"
                    />
                    {/* ── FIXED MIC — no animate-ping, uses ring instead ── */}
                    <button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      className={`absolute right-3.5 bottom-3.5 w-9 h-9 flex items-center justify-center rounded-full cursor-pointer active:scale-95 transition-all duration-200 shadow-md ${isListening
                          ? "bg-[#e04f2f] ring-4 ring-[#e04f2f]/30"
                          : "bg-white text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                        }`}
                      title={
                        isListening
                          ? "Listening… click to stop"
                          : "Start Voice Dictation"
                      }
                    >
                      {isListening ? (
                        <MicOff className="w-4 h-4 text-white" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {/* Listening indicator — subtle status line */}
                  {isListening && (
                    <p className="text-[12.5px] text-[#e04f2f] flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-[#e04f2f] inline-block animate-pulse" />
                      Listening… speak now. Click the mic to stop.
                    </p>
                  )}
                </div>
              </div>
              {/* end gray card */}

              {/* Footer */}
              <div className="flex justify-between items-center mt-2 pb-6">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="flex items-center gap-1.5 px-6 py-3 bg-white border border-zinc-200 rounded-full text-[15px] font-bold text-zinc-600 hover:bg-zinc-50 shadow-xs cursor-pointer active:scale-98 transition-all"
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  onClick={handleGenerateAssignment}
                  className="flex items-center gap-1.5 px-8 py-3 bg-[#1E1E1E] text-white rounded-full text-[15px] font-bold hover:bg-[#252525] shadow-md cursor-pointer active:scale-98 transition-all"
                >
                  Next →
                </button>
              </div>
            </div>
          </section>
        ) : (
          /* ════════════════ DASHBOARD ════════════════ */
          <section className="flex-1 flex flex-col p-2 animate-in fade-in duration-300 relative">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <span className="relative flex h-3.5 w-3.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#10B981] border-2 border-white" />
              </span>
              <div className="flex flex-col leading-tight">
                <h1 className="text-[28px] font-bold text-zinc-900 tracking-tight">
                  Assignments
                </h1>
                <p className="text-[15px] text-zinc-500 mt-0.5">
                  Manage and create assignments for your classes.
                </p>
              </div>
            </div>

            {/* Search bar */}
            <div className="flex items-center justify-between gap-4 bg-white p-3 mb-8 rounded-2xl select-none">
              <div className="flex items-center gap-2 py-2 px-4 bg-white border border-zinc-200/80 rounded-full text-[15px] font-semibold text-zinc-500 cursor-default">
                <Filter className="w-5 h-5 text-zinc-400" />
                <span>Filter By</span>
              </div>
              <div className="relative w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search Assignment"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full font-semibold pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-full text-[15px] text-zinc-700 placeholder-zinc-400 focus:outline-none focus:border-zinc-300 transition-all"
                />
              </div>
            </div>

            {/* Cards — pure scroll, NO pagination */}
            {searchedAssignments.length === 0 ? (
              <div className="w-full bg-white rounded-3xl border border-zinc-100 p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[300px]">
                <div className="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-zinc-400" />
                </div>
                <h3
                  className="text-[20px] font-bold text-zinc-800 mb-1.5"
                  style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
                >
                  {searchQuery ? "This doesn't exist." : "No assignments yet."}
                </h3>
                <p className="text-[14.5px] text-zinc-400 max-w-sm leading-relaxed">
                  {searchQuery
                    ? `No completed assignments match "${searchQuery}".`
                    : "Create your first assignment to get started."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6 pb-36">
                {searchedAssignments.map((a: any) => {
                  const cardId = a._id || a.id;
                  const isMenuOpen = activeDropdownCardId === cardId;
                  return (
                    <div
                      key={cardId}
                      className="bg-white rounded-3xl border border-zinc-100 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-300 relative"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <h3
                          className="text-[24px] font-bold text-zinc-900 leading-snug tracking-tight select-none"
                          style={{
                            fontFamily: '"Bricolage Grotesque", sans-serif',
                          }}
                        >
                          {a.title}
                        </h3>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownCardId(
                                isMenuOpen ? null : cardId
                              );
                            }}
                            className="p-1.5 hover:bg-zinc-50 rounded-lg text-zinc-400 hover:text-zinc-600 transition-all cursor-pointer"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          {isMenuOpen && (
                            <div className="absolute right-0 mt-1 w-40 bg-white border border-zinc-100 rounded-xl shadow-lg py-1.5 z-50">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const res = await fetch(`${API_BASE}/${cardId}`);
                                    if (res.ok) {
                                      const payload = await res.json();
                                      // set the fetched assignment in the global store
                                      setAssignment(payload.data || payload || null);
                                    } else {
                                      console.error("Failed to fetch assignment:", res.status);
                                      setAssignment(null);
                                    }
                                  } catch (err) {
                                    console.error("Error fetching assignment:", err);
                                    setAssignment(null);
                                  }
                                  router.push(`/assignments/${cardId}/generating`);
                                  setActiveDropdownCardId(null);
                                }}
                                className="w-full text-left px-4 py-2.5 text-[14px] font-semibold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                              >
                                View Assignment
                              </button>
                              <div className="h-[1px] bg-zinc-100 my-1" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAssignment(cardId);
                                }}
                                className="w-full text-left px-4 py-2.5 text-[14px] font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-6 pt-6 border-t border-zinc-100 text-[16px] font-bold text-zinc-900"
                        style={{
                          fontFamily: '"Bricolage Grotesque", sans-serif',
                        }}
                      >
                        <span>
                          Assigned on :{" "}
                          <strong className="text-zinc-500 font-semibold">
                            {formatDate(a.createdAt)}
                          </strong>
                        </span>
                        <span>
                          Due :{" "}
                          <strong className="text-zinc-400 font-semibold">
                            {formatDate(a.dueDate)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Glassmorphic bottom fade ── */}
            <div
              className="fixed pointer-events-none z-30"
              style={{
                // aligns to right edge of main, accounting for sidebar + gap
                bottom: 0,
                left: "calc(1rem + 20.5rem + 1.5rem)",
                right: "1rem",
                height: "8rem",
                background:
                  "linear-gradient(to top, rgba(243,244,246,1) 0%, rgba(243,244,246,0.8) 50%, transparent 100%)",
                backdropFilter: "blur(2px)",
                WebkitBackdropFilter: "blur(2px)",
                maskImage:
                  "linear-gradient(to top, black 30%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to top, black 30%, transparent 100%)",
              }}
            />

            {/* Floating Create button */}
            <div className="fixed bottom-8 left-[58%] -translate-x-1/2 z-40">
              <button
                onClick={() => setCreateModalOpen(true)}
                className="bg-[#121212] hover:bg-[#252525] text-white py-3.5 px-8 rounded-full font-bold flex items-center gap-2.5 shadow-2xl hover:shadow-3xl active:scale-95 hover:-translate-y-0.5 transition-all duration-200 text-[15px] select-none border border-white/10 cursor-pointer"
              >
                <Plus className="w-5 h-5 text-white" />
                Create Assignment
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}