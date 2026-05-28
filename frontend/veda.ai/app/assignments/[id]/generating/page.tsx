"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { useAssignmentStore, Section, Question } from "../../../../store/useAssignmentStore";
import {
  ArrowLeft,
  LayoutGrid,
  Bell,
  ChevronDown,
  Loader2,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Home,
  Users,
  Book,
  Library,
  Menu,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// STREAMING ENGINE
// We keep one mutable array (sectionsRef) as the "source of truth" and bump
// a counter state (tick) to tell React to re-read the ref. This avoids every
// stale-closure problem the previous setInterval approach had.
// ---------------------------------------------------------------------------

interface StreamItem {
  kind: "section" | "question";
  // for section
  section?: { title: string; instruction: string };
  // for question
  sectionTitle?: string;
  question?: Question;
}

export default function GeneratingPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const {
    assignment,
    progress,
    logs,
    status,
    setAssignment,
    setGeneratedPaper,
    addLog,
    setProgress,
    completeGeneration,
    resetGeneration,
  } = useAssignmentStore();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const paperBottomRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // ---- Streaming state kept in refs for mutation safety ----
  const sectionsRef = useRef<Section[]>([]);

  const typingTextRef = useRef("");                     // currently visible typed text
  const typingTargetRef = useRef("");                   // full target for current item
  const typingPosRef = useRef<{ secIdx: number; qIdx: number } | null>(null);
  const isTypingRef = useRef(false);
  const queueRef = useRef<StreamItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedPaperRef = useRef<any>(null);

  // Bump this to re-render from refs
  const [tick, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  const latestLogMessage = logs.length > 0 ? logs[logs.length - 1] : "Initializing...";

  // ---- Process queue: types one item at a time ----
  const processQueue = useCallback(() => {
    if (isTypingRef.current || queueRef.current.length === 0) return;

    const item = queueRef.current.shift()!;

    if (item.kind === "section") {
      sectionsRef.current = [
        ...sectionsRef.current,
        { title: item.section!.title, instruction: item.section!.instruction, questions: [] },
      ];
      rerender();
      setTimeout(processQueue, 120);
      return;
    }

    // kind === "question"  →  typewriter effect
    const secIdx = sectionsRef.current.findIndex((s) => s.title === item.sectionTitle);
    if (secIdx === -1) {
      setTimeout(processQueue, 50);
      return;
    }

    // Push a blank question placeholder
    const q: Question = { ...item.question!, question: "" };
    sectionsRef.current[secIdx].questions = [...sectionsRef.current[secIdx].questions, q];
    const qIdx = sectionsRef.current[secIdx].questions.length - 1;

    typingPosRef.current = { secIdx, qIdx };
    typingTargetRef.current = item.question!.question;
    typingTextRef.current = "";
    isTypingRef.current = true;
    rerender();

    let charIdx = 0;
    const fullText = item.question!.question;
    const CHARS_PER_TICK = 3;

    timerRef.current = setInterval(() => {
      charIdx += CHARS_PER_TICK;

      if (charIdx >= fullText.length) {
        // Finish this question
        clearInterval(timerRef.current!);
        timerRef.current = null;

        const pos = typingPosRef.current!;
        sectionsRef.current[pos.secIdx].questions[pos.qIdx] = {
          ...item.question!,
          question: fullText,
        };

        typingPosRef.current = null;
        typingTextRef.current = "";
        typingTargetRef.current = "";
        isTypingRef.current = false;
        rerender();

        // Small pause then next
        setTimeout(processQueue, 60);
      } else {
        typingTextRef.current = fullText.slice(0, charIdx);
        // Also mutate the section directly so the render reads it
        const pos = typingPosRef.current!;
        if (sectionsRef.current[pos.secIdx]?.questions[pos.qIdx]) {
          sectionsRef.current[pos.secIdx].questions[pos.qIdx].question = typingTextRef.current;
        }
        rerender();
      }
    }, 14);
  }, [rerender]);

  // ---- Auto-scroll to bottom as content appears ----
  useEffect(() => {
    paperBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [tick]);

  // ---- Rehydrate on mount ----
  useEffect(() => {
    resetGeneration();
    sectionsRef.current = [];
    queueRef.current = [];

    const fetchCurrentState = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/assignments/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        const db = data.data || {};

        setAssignment(db);
        setProgress(db.progress || 0);
        if (db.generationLogs) db.generationLogs.forEach((l: string) => addLog(l));

        if (db.status === "completed" && db.generatedPaperId) {
          completeGeneration(db.generatedPaperId);
          sectionsRef.current = db.generatedPaperId.sections || [];
          rerender();
        } else if (db.status === "failed") {
          useAssignmentStore.setState({ status: "failed" });
        } else if (db.status === "generating" && db.generatedPaperId) {
          setGeneratedPaper(db.generatedPaperId);
          sectionsRef.current = db.generatedPaperId.sections || [];
          useAssignmentStore.setState({ status: "generating" });
          rerender();
        } else {
          useAssignmentStore.setState({ status: "queued" });
        }
      } catch (err) {
        console.error("Rehydrate error:", err);
      }
    };

    fetchCurrentState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---- WebSocket ----
  useEffect(() => {
    if (!id) return;

    const socket = io("http://localhost:3001");
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-assignment-room", id);
    });

    socket.on("assignment:started", (d: any) => {
      useAssignmentStore.setState({ status: "generating" });
      setProgress(d.progress || 10);
      addLog(d.message || "Generation started...");
    });

    socket.on("assignment:progress", (d: any) => {
      setProgress(d.progress || 0);
      if (d.message) addLog(d.message);
    });

    socket.on("assignment:section-created", (d: any) => {
      queueRef.current.push({ kind: "section", section: { title: d.title, instruction: d.instruction } });
      addLog(`Section created: "${d.title}"`);
      processQueue();
    });

    socket.on("assignment:question-generated", (d: any) => {
      // Ensure section exists in ref
      const secExists = sectionsRef.current.some((s) => s.title === d.sectionTitle) ||
        queueRef.current.some((q) => q.kind === "section" && q.section?.title === d.sectionTitle);
      if (!secExists) {
        queueRef.current.push({
          kind: "section",
          section: { title: d.sectionTitle, instruction: "Attempt all questions." },
        });
      }

      queueRef.current.push({ kind: "question", sectionTitle: d.sectionTitle, question: d.question });
      addLog(`Question generated for [${d.sectionTitle}]`);
      processQueue();
    });

    socket.on("assignment:log", (d: any) => {
      if (d.message) addLog(d.message);
    });

    socket.on("assignment:completed", (d: any) => {
      completedPaperRef.current = d;
      addLog("Generation complete.");

      // Wait until typing queue drains, then finalize
      const check = setInterval(() => {
        if (!isTypingRef.current && queueRef.current.length === 0) {
          clearInterval(check);
          completeGeneration(d);
          sectionsRef.current = d.sections || [];
          rerender();
        }
      }, 200);
    });

    socket.on("assignment:failed", (d: any) => {
      useAssignmentStore.setState({ status: "failed" });
      addLog(`Error: ${d.message || "Generation failed."}`);
    });

    return () => {
      socket.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDownloadPDF = () => {
    (async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/assignments/${id}/pdf`);
        if (!res.ok) throw new Error(`PDF fetch failed: ${res.status}`);
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(assignment?.title || "assignment").replace(/[^a-z0-9\-\_ ]/gi, "_")}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Server PDF download failed:", err);
        alert("Failed to download PDF. See console for details.");
      }
    })();
  };

  const handleRegenerate = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/assignments/${id}/regenerate`, { method: "POST" });
      if (!res.ok) throw new Error(`Regenerate failed: ${res.status}`);
      addLog("Regeneration requested — job queued.");
      setProgress(0);
      useAssignmentStore.setState({ status: "queued" });
      alert("Regeneration queued. The job will begin shortly.");
    } catch (err) {
      console.error("Regenerate error:", err);
      alert("Failed to queue regeneration. See console for details.");
    }
  };

  // ---- Derived render data from refs (re-read on every tick) ----
  const sections = sectionsRef.current;
  const typingPos = typingPosRef.current;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#e2e3e4] p-4 gap-6 font-sans overflow-hidden">
      {/* ==================== LEFT SIDEBAR (hidden on mobile) ==================== */}
      <aside className="hidden md:flex md:w-82 bg-white rounded-3xl shadow-2xl border border-zinc-100 flex-col justify-between p-6 shrink-0 select-none">
        <div className="flex flex-col gap-8">
          <div className="flex items-center -ml-5 -mt-6 ">
            <img src="/logo 2.png" alt="VedaAI" className="mt-6 w-24 h-22  object-contain" />
            <span className="-ml-4 text-3xl font-bold tracking-tight text-zinc-900" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
              VedaAI
            </span>
          </div>

          <div className="w-full rounded-full p-[3.5px] bg-gradient-to-t from-[#C0350A] to-[#FF7950] shadow-sm">
            <button onClick={() => { resetGeneration(); router.push("/"); }} className="w-full bg-[#1E1E1E] text-white py-3 px-5 rounded-full font-medium flex items-center justify-center gap-2.5 cursor-pointer">
              <ArrowLeft className="w-4 h-4 text-white" />
              <span className="text-[18px]">Back to Dashboard</span>
            </button>
          </div>

          <nav className="mt-8 flex flex-col gap-1.5">
            {[
              { icon: Home, label: "Home" },
              { icon: Users, label: "My Groups" },
              { icon: FileText, label: "Assignments", active: true },
              { icon: Book, label: "AI Teacher's Toolkit" },
              { icon: Library, label: "My Library"},
            ].map((n) => (
              <button key={n.label} onClick={() => { resetGeneration(); router.push("/"); }}
                className={`w-full flex items-center gap-4 py-3 px-4 rounded-xl text-left text-[16px] font-medium transition-all cursor-pointer ${n.active ? "bg-[#EFEFEF] text-zinc-900 shadow-2xs font-semibold" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"}`}>
                <n.icon className={`w-5 h-5 ${n.active ? "text-zinc-900" : "text-zinc-400"}`} />
                <span className="flex-1">{n.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-4">
          <button onClick={() => { resetGeneration(); router.push("/"); }} className="flex items-center gap-4 py-2.5 px-4 rounded-xl text-[17px] font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 transition-all cursor-pointer">
            <Settings className="w-7 h-7 text-zinc-400" />
            Settings
          </button>
          <div className="bg-[#EFEFEF] p-4 rounded-2xl flex items-center gap-3.5 border border-zinc-100/50">
            <div className="w-14 h-14 rounded-full bg-[#fcd34d] flex items-center justify-center border-2 border-white">
              <img src="https://api.dicebear.com/7.x/bottts/svg?seed=dps" alt="School" className="w-9 h-9" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-[15px] font-bold text-zinc-800 truncate leading-tight">Delhi Public School</span>
              <span className="text-[14px] text-zinc-500 truncate leading-none mt-0.5">Bokaro Steel City</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT ==================== */}
      <main className="flex-1 flex flex-col gap-4 relative md:h-[calc(100vh-2rem)] h-auto overflow-y-auto">
        {/* Header */}
        <header className="bg-white rounded-2xl border border-zinc-100/50 p-2 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3.5">
            <button onClick={() => { resetGeneration(); router.push("/"); }} className="p-2 hover:bg-zinc-50 rounded-lg active:scale-95 transition-all text-zinc-600 cursor-pointer">
              <ArrowLeft className="w-8 h-8" />
            </button>
            <div className="h-5 w-[1px] bg-zinc-200" />
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4.5 h-4.5 text-zinc-400" />
              <span className="text-[18px] font-semibold text-zinc-400 select-none">Create New</span>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <button className="relative p-2 hover:bg-zinc-50 rounded-full text-zinc-600 cursor-pointer">
              <Bell className="w-7 h-7" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#e04f2f] rounded-full ring-2 ring-white" />
            </button>

            {/* Hamburger menu for mobile */}
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="md:hidden p-2 hover:bg-zinc-50 rounded-lg active:scale-95 transition-all text-zinc-600 cursor-pointer"
            >
              <Menu className="w-7 h-7" />
            </button>

            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-3 hover:bg-zinc-50 py-1.5 px-3 rounded-full transition-all cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-[#f87171] overflow-hidden flex items-center justify-center border border-zinc-200">
                <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=john" alt="User" className="w-10 h-10" />
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-[18px] font-semibold text-zinc-700 select-none">James Bond</span>
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              </div>
            </button>
          </div>
        </header>

        {/* ---- Subtle floating progress line ABOVE the sheet ---- */}
        {status !== "completed" && status !== "idle" && (
          <div className="flex items-center gap-2.5 px-1 select-none">
            {status === "failed" ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF7950] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF7950]" />
              </span>
            )}
            <span className="text-[13px] font-semibold text-zinc-800 truncate">
              {status === "failed" ? "Generation failed" : latestLogMessage}
            </span>
            <span className="text-[13px] font-mono font-bold text-zinc-800 shrink-0">{progress}%</span>
          </div>
        )}

        {/* ---- Top completion banner ---- */}
        {status === "completed" && (
          <div className="bg-[#1E1E1E] text-white p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md shrink-0">
            <div className="flex flex-col gap-1 leading-normal max-w-lg text-[14px] text-zinc-300">
              <span className="font-bold text-white text-[15px]" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                Certainly, James! Here are customized Question Paper for your CBSE Grade 8 Science classes on the NCERT chapters:
              </span>
            </div>
            <div className="flex gap-3">
              <button onClick={handleRegenerate} className="bg-[#FF7950] hover:bg-[#FF6f3a] text-white px-4 py-2.5 rounded-full font-bold text-[14px] flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all select-none">
                Regenerate
              </button>
              <button onClick={handleDownloadPDF} className="bg-white hover:bg-zinc-100 text-black px-6 py-2.5 rounded-full font-bold text-[14px] flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all select-none self-start sm:self-auto shrink-0">
              <Download className="w-4 h-4 text-black" />
              Download as PDF
              </button>
            </div>
          </div>
        )}

        {/* ==================== THE EXAM SHEET ==================== */}
        <div ref={paperRef} className="bg-white rounded-3xl border border-zinc-100 shadow-lg p-6 md:p-10 flex flex-col gap-6 relative flex-1">

          {/* Paper header – ALWAYS VISIBLE (static school template) */}
          <div className="flex flex-col items-center text-center border-b border-zinc-200 pb-5 leading-normal select-none">
            <span className="text-[22px] font-bold text-zinc-800 tracking-tight" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
              Delhi Public School, Sector-4, Bokaro
            </span>
            <span className="text-[15.5px] text-zinc-600 font-semibold mt-1">
              Subject: {assignment?.title || "English"}
            </span>
            <span className="text-[14.5px] text-zinc-600 font-semibold mt-0.5">
              Class: 5th
            </span>

            <div className="w-full flex justify-between text-[16px] text-zinc-800 font-semibold mt-6 border-t border-zinc-100 pt-3">
              <span>Time Allowed: 45 minutes</span>
              <span>Maximum Marks: {assignment?.totalMarks || 20}</span>
            </div>
          </div>

          {/* Instructions row */}
          <div className="flex flex-col gap-1 border-b border-zinc-100 pb-4 select-none">
            <span className="text-[16px] font-bold text-zinc-800">
              All questions are compulsory unless stated otherwise.
            </span>
            <div className="flex flex-col gap-1 text-[16px] text-zinc-800 mt-3 font-semibold">
              <span>Name: ____________________</span>
              <span>Roll Number: ____________</span>
              <span>Class: 5th Section: ________</span>
            </div>
          </div>

          {/* ---- Sections & Questions (streamed) ---- */}
          {sections.length === 0 && status !== "completed" && (
            <div className="flex items-center gap-2 text-zinc-400 py-6 select-none">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[13px] font-semibold">Generating sections…</span>
            </div>
          )}

          {sections.length > 0 && (
            <div className="flex flex-col gap-8">
              {sections.map((sec, secIdx) => (
                <div key={sec.title + secIdx} className="flex flex-col gap-4">
                  {/* Section heading */}
                  <div className="flex flex-col gap-1 border-b border-zinc-100 pb-2">
                    <span className="text-[17px] font-bold text-zinc-800" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                      {sec.title}
                    </span>
                    <span className="text-[13px] text-zinc-400 font-semibold italic">{sec.instruction}</span>
                  </div>

                  {/* Questions */}
                  {sec.questions.length === 0 ? (
                    <div className="flex items-center gap-2 text-zinc-300 py-2 select-none">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-[13px] font-semibold">Generating questions…</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {sec.questions.map((q, qIdx) => {
                        const isThisTyping = typingPos?.secIdx === secIdx && typingPos?.qIdx === qIdx;
                        const doneTyping = !isThisTyping;

                        return (
                          <div key={qIdx} className="flex flex-col gap-1 text-[16px] text-zinc-700 leading-relaxed">
                            <div className="flex items-start gap-1.5">
                              <span className="font-bold shrink-0">{qIdx + 1}.</span>
                              <div className="flex-1">
                                {q.difficulty && doneTyping && (
                                  <span className="text-zinc-400 text-[14px] font-bold mr-1">[{q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}]</span>
                                )}
                                <span>{q.question}</span>
                                {/* Blinking cursor while typing */}
                                {isThisTyping && (
                                  <span className="inline-block w-[2px] h-[15px] bg-[#FF7950] ml-0.5 animate-pulse align-middle" />
                                )}
                                {/* Marks badge – only after done */}
                                {q.marks && doneTyping && (
                                  <span className="text-zinc-400 text-[15px] font-semibold ml-1">[{q.marks} Marks]</span>
                                )}
                              </div>
                            </div>

                            {/* MCQ options – only after done typing */}
                            {q.options && q.options.length > 0 && doneTyping && (
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-5 mt-1.5 select-none">
                                {q.options.map((opt, optIdx) => (
                                  <div key={optIdx} className="flex items-center gap-2 text-[16px] text-zinc-500 font-medium">
                                    <span className="w-5 h-5 rounded-full border border-zinc-200 flex items-center justify-center shrink-0 text-[11px] font-bold">
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <span>{opt}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* End of question paper marker */}
          {status === "completed" && sections.length > 0 && (
            <div className="text-center text-[15px] font-bold text-zinc-400 mt-4 pt-4 border-t border-zinc-100 select-none">
              End of Question Paper
            </div>
          )}

          {/* Answer Key */}
          {status === "completed" && sections.some((s) => s.questions.some((q) => q.answer)) && (() => {
            let answerNum = 0;
            return (
              <div className="border-t-2 border-dashed border-zinc-200 pt-6 mt-4 flex flex-col gap-5">
                <span className="text-[17px] font-bold text-zinc-800" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
                  Answer Key:
                </span>
                <div className="flex flex-col gap-5">
                  {sections.map((sec, secIdx) => {
                    const sectionAnswers = sec.questions.filter((q) => q.answer);
                    if (sectionAnswers.length === 0) return null;
                    return (
                      <div key={secIdx} className="flex flex-col gap-2">
                        <span className="text-[16px] font-bold text-zinc-700">{sec.title}</span>
                        <div className="flex flex-col gap-1.5 pl-1">
                          {sec.questions.map((q) => {
                            answerNum++;
                            if (!q.answer) return null;
                            return (
                              <div key={answerNum} className="text-[16px] text-zinc-600 flex items-start gap-1.5">
                                <span className="font-bold shrink-0">{answerNum}.</span>
                                <span>{q.answer}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Scroll anchor */}
          <div ref={paperBottomRef} />
        </div>
      </main>

      {/* ══════════════════════ MOBILE SIDEBAR DRAWER ══════════════════════ */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      <div
        className={`fixed left-0 top-0 bottom-0 w-72 bg-white rounded-r-3xl shadow-2xl border-r border-zinc-100 flex flex-col justify-between p-6 z-50 transition-transform duration-300 md:hidden ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center -ml-5">
              <img
                src="/logo 2.png"
                alt="VedaAI Logo"
                className="w-16 h-14 object-contain"
              />
              <span
                className="-ml-2 text-2xl font-bold tracking-tight text-zinc-900"
                style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}
              >
                VedaAI
              </span>
            </div>
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-2 hover:bg-zinc-50 rounded-lg text-zinc-600 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="mt-2 flex flex-col gap-1.5">
            {[
              { id: "Home", label: "Home", icon: Home },
              { id: "My Groups", label: "My Groups", icon: Users },
              { id: "Assignments", label: "Assignments", icon: FileText },
              { id: "AI Teacher's Toolkit", label: "AI Teacher's Toolkit", icon: Book },
              { id: "My Library", label: "My Library", icon: Library },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-4 py-3 px-4 rounded-xl text-left text-[16px] font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 transition-all duration-200 cursor-pointer"
                >
                  <Icon className="w-5 h-5 text-zinc-400" />
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => {
              setIsMobileSidebarOpen(false);
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
      </div>
    </div>
  );
}
