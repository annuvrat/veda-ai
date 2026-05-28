"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Trash2,
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
  } = useAssignmentStore();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDropdownCardId, setActiveDropdownCardId] = useState<string | null>(null);

  // Client-side pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // -------------------- CREATE ASSIGNMENT FORM STATE --------------------
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [instructions, setInstructions] = useState("");
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedMaterial, setUploadedMaterial] = useState<{ fileName: string; fileUrl: string } | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Question Configs State
  const [questionConfigs, setQuestionConfigs] = useState([
    { type: "Multiple Choice Questions", count: 4, marks: 1 },
    { type: "Short Questions", count: 3, marks: 2 },
    { type: "Diagram/Graph-Based Questions", count: 5, marks: 5 },
    { type: "Numerical Problems", count: 5, marks: 5 },
  ]);

  // Voice Recognition State
  const [isListening, setIsListening] = useState(false);

  // Real-Time Queue Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [generationStatus, setGenerationStatus] = useState<string>("queued");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [createdAssignmentId, setCreatedAssignmentId] = useState<string | null>(null);

  // -------------------- FETCH ASSIGNMENTS ON MOUNT --------------------
  const fetchAssignments = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/user/${USER_ID}?limit=100`);
      if (res.ok) {
        const data = await res.json();
        const payload = data.data || {};
        setAssignments(payload.assignments || []);
      }
    } catch (err) {
      console.error("Error fetching assignments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  // Handle global click to dismiss dropdowns
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveDropdownCardId(null);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
    };
  }, []);

  // Handle dynamic assignment deletion
  const handleDeleteAssignment = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAssignments(assignments.filter((a) => (a._id || a.id) !== id));
      }
    } catch (err) {
      console.error("Error deleting assignment:", err);
    } finally {
      setActiveDropdownCardId(null);
    }
  };

  // Helper to format date into DD-MM-YYYY format matching Figma exactly
  const formatDate = (dateStr: any) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (e) {
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

  // 1. FILTERING: Only show completed assignments in main dashboard
  const completedAssignments = assignments.filter((a) => a.status === "completed");

  // 2. SEARCHING: Client-side search for instant responses
  const searchedAssignments = completedAssignments.filter((a) =>
    a.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 3. PAGINATION: Slice cards dynamically client-side (6 per page)
  const CARDS_PER_PAGE = 6;
  const totalPages = Math.ceil(searchedAssignments.length / CARDS_PER_PAGE);
  const paginatedAssignments = searchedAssignments.slice(
    (currentPage - 1) * CARDS_PER_PAGE,
    currentPage * CARDS_PER_PAGE
  );

  // Reset to page 1 if search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // -------------------- QUESTION TYPES DYNAMIC ACTIONS --------------------
  const handleUpdateCount = (index: number, change: number) => {
    const updated = [...questionConfigs];
    updated[index].count = Math.max(1, updated[index].count + change);
    setQuestionConfigs(updated);
  };

  const handleUpdateMarks = (index: number, change: number) => {
    const updated = [...questionConfigs];
    updated[index].marks = Math.max(1, updated[index].marks + change);
    setQuestionConfigs(updated);
  };

  const handleDeleteRow = (index: number) => {
    setQuestionConfigs(questionConfigs.filter((_, idx) => idx !== index));
  };

  const handleAddRow = () => {
    setQuestionConfigs([
      ...questionConfigs,
      { type: "Multiple Choice Questions", count: 1, marks: 1 },
    ]);
  };

  const handleRowTypeChange = (index: number, newType: string) => {
    const updated = [...questionConfigs];
    updated[index].type = newType;
    setQuestionConfigs(updated);
  };

  // Calculations for summary card
  const totalQuestionsCount = questionConfigs.reduce((sum, item) => sum + item.count, 0);
  const totalMarksCount = questionConfigs.reduce((sum, item) => sum + (item.count * item.marks), 0);

  // -------------------- FILE DRAG & DROP AND SELECTION --------------------
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setUploadedMaterial(null);
  };

  // -------------------- SPEECH RECOGNITION (DICTATION) --------------------
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Web Speech API is not supported in this browser. Please use Chrome or Safari.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInstructions((prev) => (prev ? prev + " " + transcript : transcript));
    };

    recognition.start();
  };

  // -------------------- DYNAMIC POLLING QUEUE ENGINE --------------------
  const pollAssignmentProgress = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/assignments/${id}`);
        if (res.ok) {
          const data = await res.json();
          const assignment = data.data || {};
          
          setGenerationProgress(assignment.progress || 0);
          setGenerationLogs(assignment.generationLogs || []);
          setGenerationStatus(assignment.status || "queued");
          
          if (assignment.status === "completed") {
            clearInterval(interval);
            // Fetch updated list and exit generation overlay safely
            fetchAssignments();
            addAssignment(assignment);
          } else if (assignment.status === "failed") {
            clearInterval(interval);
            setGenerationError(assignment.errorMessage || "An unexpected error occurred during paper extraction.");
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 1500);

    return interval;
  };

  // -------------------- SUBMIT FLOW (UPLOAD & BullMQ QUEUE) --------------------
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
      setGenerationLogs(["Initiating assignment creation...", "Validating input parameters..."]);
      setGenerationError(null);

      // Step 1: Upload file if selected and not yet uploaded
      if (selectedFile && !uploadedMaterial) {
        setIsUploadingFile(true);
        setGenerationLogs((prev) => [...prev, `Uploading static material "${selectedFile.name}" to Cloudinary...`]);
        
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await fetch("http://localhost:3001/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload material file. Cloudinary fallback failed.");
        }

        const uploadData = await uploadRes.json();
        const materialData = uploadData.data || {};
        currentUploadedMaterial = {
          fileName: materialData.fileName,
          fileUrl: materialData.fileUrl,
        };
        setUploadedMaterial(currentUploadedMaterial);
        setIsUploadingFile(false);
        setGenerationLogs((prev) => [...prev, "File successfully hosted and indexed on Cloudinary!"]);
      }

      setGenerationProgress(20);
      setGenerationLogs((prev) => [...prev, "Submitting assignment parameters to Mongoose and BullMQ queues..."]);

      // Compute dynamic title as requested: no title input in payload figma mockup
      const computedTitle = selectedFile
        ? selectedFile.name.replace(/\.[^/.]+$/, "")
        : instructions.trim().slice(0, 24) || "VedaAI Assignment";

      // Step 2: Create Assignment entry in DB and push to Queue
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

      const createRes = await fetch("http://localhost:3001/api/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) {
        throw new Error("Failed to register assignment payload.");
      }

      const createData = await createRes.json();
      const assignment = createData.data || {};
      setCreatedAssignmentId(assignment._id);

      // Redirect immediately to the dynamic websocket generation route
      router.push(`/assignments/${assignment._id}/generating`);
      setCreateModalOpen(false);
    } catch (err: any) {
      console.error("Assignment generation failed:", err);
      setIsUploadingFile(false);
      setGenerationStatus("failed");
      setGenerationError(err.message || "An unexpected error occurred during submission.");
      setIsGenerating(false);
    }
  };

  const closeGenerationOverlay = () => {
    setIsGenerating(false);
    setCreateModalOpen(false);
    setTitle("");
    setDueDate("");
    setInstructions("");
    setSelectedFile(null);
    setUploadedMaterial(null);
  };

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] p-4 gap-6 font-sans overflow-hidden">
      {/* -------------------- LEFT SIDEBAR -------------------- */}
      <aside className="w-82 bg-white rounded-3xl shadow-2xl border border-zinc-100 flex flex-col justify-between p-6 shrink-0 select-none">
        <div className="flex flex-col gap-8">
          {/* Logo Section */}
          <div className="flex items-center -ml-5 -mt-6">
            <img
              src="/logo 2.png"
              alt="VedaAI Logo"
              className="mt-6 w-24 h-22 object-contain transform hover:rotate-6 transition-all duration-300"
            />
            <span
              className=" -ml-4 text-3xl font-bold tracking-tight text-zinc-900"
              style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
            >
              VedaAI
            </span>
          </div>

          {/* Create Assignment Button wrapper with vertical color gradient outline */}
          <div className="w-full rounded-full p-[3.5px] bg-gradient-to-t from-[#C0350A] to-[#FF7950] shadow-sm hover:shadow-md transition-all duration-200">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="w-full bg-[#1E1E1E] text-white py-3 px-5 rounded-full font-medium flex items-center justify-center gap-2.5 hover:bg-[#252525] active:scale-98 transition-all duration-200 group relative overflow-hidden cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-white fill-white group-hover:animate-pulse" />
              <span className="text-[18px]">Create Assignment</span>
              <span className="absolute inset-0 w-full h-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
            </button>
          </div>

          {/* Navigation Links */}
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
                  className={`w-full flex items-center gap-4 py-3 px-4 rounded-xl text-left text-[16px] font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-[#EFEFEF] text-zinc-900 shadow-2xs font-semibold"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? "text-zinc-900 scale-110" : "text-zinc-400"
                    }`}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.id === "Assignments" && completedAssignments.length > 0 && (
                    <span className="bg-[#e04f2f] text-white text-[12px] font-bold px-2 py-0.5 rounded-full shrink-0 min-w-[22px] text-center shadow-xs">
                      {completedAssignments.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Configuration Block */}
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

          <div className="bg-[#EFEFEF] p-4 rounded-2xl flex items-center gap-3.5 border border-zinc-100/50 hover:shadow-xs transition-shadow duration-200">
            <div className="w-14 h-14 rounded-full bg-[#fcd34d] overflow-hidden flex items-center justify-center border-2 border-white shadow-xs shrink-0">
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

      {/* -------------------- MAIN CONTENT AREA -------------------- */}
      <main className="flex-1 flex flex-col gap-6 relative h-[calc(100vh-2rem)] overflow-y-auto pr-2 pb-24">
        {/* Top Header Bar */}
        <header className="bg-white rounded-2xl border border-zinc-100/50 p-4 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="p-2 hover:bg-zinc-50 rounded-lg active:scale-95 transition-all text-zinc-600 cursor-pointer"
            >
              <ArrowLeft className="w-8 h-8" />
            </button>
            <div className="h-5 w-[1px] bg-zinc-200"></div>
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
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#e04f2f] rounded-full ring-2 ring-white"></span>
            </button>

            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 hover:bg-zinc-50 py-1.5 px-3 rounded-full transition-all duration-200 text-left active:scale-98 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-[#f87171] overflow-hidden flex items-center justify-center border border-zinc-200 shadow-xs">
                  <img
                    src="https://api.dicebear.com/7.x/adventurer/svg?seed=john"
                    alt="User profile"
                    className="w-10 h-10"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[18px] font-semibold text-zinc-700 select-none">
                    James Bond
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2.5 w-48 bg-white border border-zinc-100 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button className="w-full text-left px-4 py-2 text-[13px] text-zinc-700 hover:bg-zinc-50 cursor-pointer">
                    My Profile
                  </button>
                  <button className="w-full text-left px-4 py-2 text-[13px] text-zinc-700 hover:bg-zinc-50 cursor-pointer">
                    Security
                  </button>
                  <div className="h-[1px] bg-zinc-100 my-1"></div>
                  <button className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 cursor-pointer">
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* -------------------- DYNAMIC PANEL CONDITIONAL RENDERING -------------------- */}
        {isCreateModalOpen ? (
          /* ==================== CREATE ASSIGNMENT FORM (FIGMA) ==================== */
          <section className="flex-1 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 relative select-none">
            
            {/* Real-time terminal progress overlay when generating */}
            {isGenerating && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div className="bg-[#1E1E1E] text-zinc-300 w-full max-w-xl rounded-3xl border border-zinc-800 shadow-2xl p-6 flex flex-col gap-5 relative overflow-hidden">
                  
                  {/* Progress Header */}
                  <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2.5">
                      {generationStatus === "completed" ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500 fill-green-500/20" />
                      ) : generationStatus === "failed" ? (
                        <AlertCircle className="w-6 h-6 text-red-500" />
                      ) : (
                        <Loader2 className="w-6 h-6 text-[#FF7950] animate-spin" />
                      )}
                      <span className="text-[17px] font-bold text-white tracking-wide" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                        {generationStatus === "completed" ? "Paper Extracted Successfully!" : generationStatus === "failed" ? "Generation Failed" : "Extracting Assignment..."}
                      </span>
                    </div>
                    <span className="text-zinc-500 font-mono text-[14px]">
                      {generationProgress}%
                    </span>
                  </div>

                  {/* Sleek Progress Track */}
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#FF7950] to-[#C0350A] h-full transition-all duration-300 rounded-full"
                      style={{ width: `${generationProgress}%` }}
                    ></div>
                  </div>

                  {/* Logs Terminal */}
                  <div className="bg-[#121212] rounded-xl p-4 font-mono text-[12.5px] leading-relaxed max-h-56 overflow-y-auto flex flex-col gap-1.5 border border-zinc-800/50">
                    {generationLogs.map((log, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-zinc-600 shrink-0 select-none">&gt;</span>
                        <span className={log.includes("Cloudinary") ? "text-cyan-400" : log.includes("BullMQ") ? "text-purple-400" : log.includes("Error") ? "text-red-400" : "text-zinc-300"}>
                          {log}
                        </span>
                      </div>
                    ))}
                    {generationStatus === "completed" && (
                      <div className="text-green-400 font-bold mt-2 animate-pulse">&gt; Job Complete! Finalized assignment details saved.</div>
                    )}
                    {generationError && (
                      <div className="text-red-400 font-bold mt-2">&gt; Job Error: {generationError}</div>
                    )}
                  </div>

                  {/* Overlay Bottom Buttons */}
                  <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                    {generationStatus === "completed" && (
                      <button
                        onClick={closeGenerationOverlay}
                        className="bg-white hover:bg-zinc-100 text-black px-6 py-2.5 rounded-full font-bold text-[14px] cursor-pointer shadow-md transition-all active:scale-95"
                      >
                        Go to Dashboard
                      </button>
                    )}
                    {generationStatus === "failed" && (
                      <button
                        onClick={() => setIsGenerating(false)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2.5 rounded-full font-bold text-[14px] cursor-pointer transition-all active:scale-95"
                      >
                        Edit Configuration
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Stepper Progress Indicator */}
            <div className="flex flex-col gap-1 leading-tight">
              <h1 className="text-[28px] font-bold text-zinc-900 tracking-tight" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                Create Assignment
              </h1>
              <p className="text-[15px] text-zinc-500">Set up a new assignment for your students</p>
            </div>

            {/* Gray progress indicator bar */}
            <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#1E1E1E] w-[45%] h-full rounded-full"></div>
            </div>

            {/* Main Form Details Card */}
            <div className="bg-white rounded-3xl border border-zinc-100 shadow-xs p-8 flex flex-col gap-6">
              
              {/* Header Title inside card */}
              <div className="flex flex-col border-b border-zinc-100 pb-4">
                <h2 className="text-[20px] font-bold text-zinc-800" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                  Assignment Details
                </h2>
                <p className="text-[13.5px] text-zinc-400">Basic information about your assignment</p>
              </div>



              {/* Upload Material selector Zone */}
              <div className="flex flex-col gap-2">
                <label className="text-[14.5px] font-bold text-zinc-700">Upload Reference Material</label>
                
                {selectedFile ? (
                  /* SELECTED FILE PANEL */
                  <div className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-200 rounded-2xl animate-in fade-in duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-zinc-200/50 flex items-center justify-center text-zinc-500">
                        <FileText className="w-6 h-6 text-zinc-600" />
                      </div>
                      <div className="flex flex-col leading-tight">
                        <span className="text-[14.5px] font-semibold text-zinc-800 max-w-sm truncate">{selectedFile.name}</span>
                        <span className="text-[12.5px] text-zinc-400 mt-0.5">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    </div>
                    <button
                      onClick={removeSelectedFile}
                      className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-400 hover:text-zinc-600 cursor-pointer transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  /* DROP/DRAG UPLOAD ZONE */
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-zinc-200 hover:border-zinc-300 transition-colors bg-zinc-50/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer relative group"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,application/pdf,text/plain"
                      className="hidden"
                    />
                    <UploadCloud className="w-10 h-10 text-zinc-400 mb-3 group-hover:-translate-y-0.5 transition-transform duration-200" />
                    <span className="text-[15.5px] font-semibold text-zinc-700">Choose a file or drag & drop it here</span>
                    <span className="text-[13px] text-zinc-400 mt-1">JPEG, PNG, PDF, TXT upto 10MB</span>
                    <button
                      type="button"
                      className="mt-4 px-5 py-2 bg-white border border-zinc-200 rounded-full text-[13.5px] font-semibold text-zinc-600 hover:bg-zinc-50 shadow-3xs cursor-pointer"
                    >
                      Browse Files
                    </button>
                  </div>
                )}
                <span className="text-[13px] text-zinc-400 mt-1">Upload images/docs of your preferred reference document</span>
              </div>

              {/* Due Date Row */}
              <div className="flex flex-col gap-2 max-w-sm">
                <label className="text-[14.5px] font-bold text-zinc-700">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-[15px] focus:outline-none focus:border-zinc-300 transition-all text-zinc-700 cursor-pointer"
                />
              </div>

              {/* Question Type Config table */}
              <div className="flex flex-col gap-3">
                <label className="text-[14.5px] font-bold text-zinc-700">Question Types & Criteria</label>
                
                {/* Headers Grid */}
                <div className="grid grid-cols-12 gap-4 pb-2 border-b border-zinc-100 text-[13.5px] font-bold text-zinc-400 select-none px-2">
                  <div className="col-span-6">Question Type</div>
                  <div className="col-span-3 text-center">No. of Questions</div>
                  <div className="col-span-2 text-center">Marks</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Rows List */}
                <div className="flex flex-col gap-3">
                  {questionConfigs.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-4 items-center px-2 py-1 hover:bg-zinc-50 rounded-xl transition-all">
                      
                      {/* Question Type Selector */}
                      <div className="col-span-6">
                        <select
                          value={row.type}
                          onChange={(e) => handleRowTypeChange(idx, e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[14px] font-semibold text-zinc-700 focus:outline-none cursor-pointer"
                        >
                          <option value="Multiple Choice Questions">Multiple Choice Questions</option>
                          <option value="Short Questions">Short Questions</option>
                          <option value="Diagram/Graph-Based Questions">Diagram/Graph-Based Questions</option>
                          <option value="Numerical Problems">Numerical Problems</option>
                          <option value="True/False Questions">True/False Questions</option>
                          <option value="Long Answer Questions">Long Answer Questions</option>
                        </select>
                      </div>

                      {/* No. of Questions counter */}
                      <div className="col-span-3 flex justify-center">
                        <div className="flex items-center border border-zinc-200 rounded-lg bg-zinc-50 px-2 py-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateCount(idx, -1)}
                            className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-800 font-bold active:scale-90 text-[16px] cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-[14px] font-bold text-zinc-800">{row.count}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateCount(idx, 1)}
                            className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-800 font-bold active:scale-90 text-[16px] cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Marks counter */}
                      <div className="col-span-2 flex justify-center">
                        <div className="flex items-center border border-zinc-200 rounded-lg bg-zinc-50 px-2 py-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateMarks(idx, -1)}
                            className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-800 font-bold active:scale-90 text-[16px] cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-[14px] font-bold text-zinc-800">{row.marks}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateMarks(idx, 1)}
                            className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-800 font-bold active:scale-90 text-[16px] cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Row Delete Icon */}
                      <div className="col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(idx)}
                          className="p-1 hover:bg-red-50 hover:text-red-600 rounded-lg text-zinc-400 cursor-pointer transition-all"
                        >
                          <X className="w-4.5 h-4.5" />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>

                {/* Bottom Row Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2 pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="flex items-center gap-1.5 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-full text-[13.5px] font-bold text-zinc-700 hover:bg-zinc-100 shadow-3xs cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4 text-zinc-600" />
                    Add Question Type
                  </button>

                  <div className="flex flex-col items-end leading-normal text-[14px] text-zinc-500 font-semibold font-mono">
                    <span>Total Questions : <strong className="text-zinc-800">{totalQuestionsCount}</strong></span>
                    <span className="mt-0.5">Total Marks : <strong className="text-zinc-800">{totalMarksCount}</strong></span>
                  </div>
                </div>

              </div>

              {/* Additional Information with Microphone dictation */}
              <div className="flex flex-col gap-2">
                <label className="text-[14.5px] font-bold text-zinc-700">Additional Information (For better output)</label>
                <div className="relative">
                  <textarea
                    rows={4}
                    placeholder="e.g. Generate CBSE analytical science questions. Use mid-level difficulty."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-[15px] focus:outline-none focus:border-zinc-300 transition-all placeholder-zinc-400 resize-none"
                  ></textarea>
                  
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`absolute right-3.5 bottom-4 p-2 rounded-full shadow-md cursor-pointer active:scale-95 transition-all ${
                      isListening
                        ? "bg-[#e04f2f] text-white animate-ping"
                        : "bg-white text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 border border-zinc-100"
                    }`}
                    title={isListening ? "Listening... click to stop" : "Start Voice Dictation"}
                  >
                    {isListening ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5" />}
                  </button>
                </div>
              </div>

            </div>

            {/* Stepper Actions footer panel */}
            <div className="flex justify-between items-center mt-4 pb-12">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="flex items-center gap-1.5 px-6 py-3 bg-white border border-zinc-200 rounded-full text-[15px] font-bold text-zinc-600 hover:bg-zinc-50 shadow-3xs cursor-pointer active:scale-98 transition-all"
              >
                ← Previous
              </button>

              <button
                type="button"
                onClick={handleGenerateAssignment}
                className="flex items-center gap-1.5 px-8 py-3 bg-[#1E1E1E] text-white border border-transparent rounded-full text-[15px] font-bold hover:bg-[#252525] shadow-md cursor-pointer active:scale-98 transition-all group"
              >
                Next →
              </button>
            </div>

          </section>
        ) : (
          /* ==================== ASSIGNMENTS DASHBOARD WORKSPACE ==================== */
          <section className="flex-1 flex flex-col p-2 animate-in fade-in duration-300">
            {/* Header info */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3.5 h-3.5 bg-[#10B981] rounded-full border-2 border-white shadow-xs shrink-0 animate-ping"></div>
              <div className="flex flex-col items-start leading-tight">
                <h1 className="text-[28px] font-bold text-zinc-900 tracking-tight">
                  Assignments
                </h1>
                <p className="text-[15px] text-zinc-500 mt-1">
                  Manage and create assignments for your classes.
                </p>
              </div>
            </div>

            {/* Filter and Search Bar aligned on the same row exactly like Figma */}
            <div className="flex items-center justify-between gap-4 bg-white p-3 mb-8 rounded-2xl select-none">
              {/* Separate Filter By Button */}
              <div className="flex items-center gap-2 py-2 px-4 font-weight-500 bg-white border border-zinc-200/80 rounded-full text-[15px] font-semibold text-zinc-500 shadow-3xs cursor-default">
                <Filter className="w-5 h-5 text-zinc-400 " />
                <span>Filter By</span>
              </div>

              {/* Separate Search Bar */}
              <div className="relative w-80 shadow-3xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search Assignment"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full w-10 font-semibold pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-full text-[15px] text-zinc-700 placeholder-zinc-400 focus:outline-none focus:border-zinc-300 transition-all"
                />
              </div>
            </div>

            {/* Grid of cards / Search Fallback */}
            {searchedAssignments.length === 0 ? (
              /* FIGMA AUDIO REQUEST: "This doesn't exist" custom inline card when search matches nothing */
              <div className="w-full bg-white rounded-3xl border border-zinc-100 p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[300px] animate-in fade-in duration-200">
                <div className="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-zinc-400" />
                </div>
                <h3
                  className="text-[20px] font-bold text-zinc-800 mb-1.5"
                  style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
                >
                  This doesn't exist.
                </h3>
                <p className="text-[14.5px] text-zinc-400 max-w-sm leading-relaxed">
                  No completed assignments match your search term "{searchQuery}". Please try another keyword.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6 mb-8 animate-in fade-in duration-200">
                {paginatedAssignments.map((a: any) => {
                  const cardId = a._id || a.id;
                  const isMenuOpen = activeDropdownCardId === cardId;

                  return (
                    <div
                      key={cardId}
                      className="bg-white rounded-3xl border border-zinc-100 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-300 relative group"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <h3
                          className="text-[24px] font-bold text-zinc-900 leading-snug tracking-tight select-none"
                          style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
                        >
                          {a.title}
                        </h3>
                        
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownCardId(isMenuOpen ? null : cardId);
                            }}
                            className="p-1.5 hover:bg-zinc-50 rounded-lg text-zinc-400 hover:text-zinc-600 transition-all select-none cursor-pointer"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 mt-1 w-40 bg-white border border-zinc-100 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alert(`Viewing assignment: ${a.title}`);
                                  setActiveDropdownCardId(null);
                                }}
                                className="w-full text-left px-4 py-2.5 text-[14px] font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
                              >
                                View Assignment
                              </button>
                              <div className="h-[1px] bg-zinc-100 my-1"></div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAssignment(cardId);
                                }}
                                className="w-full text-left px-4 py-2.5 text-[14px] font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col font-bold sm:flex-row items-start sm:items-center justify-between gap-2 mt-6 pt-8 border-t border-zinc-50 text-[18px] text-zinc-900"
                      style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                        <span>
                          Assigned on : <strong className="text-zinc-500 font-semibold">{formatDate(a.createdAt)}</strong>
                        </span>
                        <span>
                          Due : <strong className="text-zinc-400 font-semibold">{formatDate(a.dueDate)}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mb-8 select-none">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-[14px] font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:hover:bg-white transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  const isCurrent = currentPage === pageNum;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-xl text-[14px] font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-[#1E1E1E] text-white shadow-md"
                          : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-[14px] font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 disabled:hover:bg-white transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}

            {/* Premium Glassmorphic Fog Fade-out Overlay at the bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#F3F4F6] via-[#F3F4F6]/90 to-transparent pointer-events-none z-30 backdrop-blur-[1.5px]"></div>

            {/* Bottom floating button - FIXED POSITION matching Figma */}
            <div className="fixed bottom-8 left-[58%] -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 duration-300">
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