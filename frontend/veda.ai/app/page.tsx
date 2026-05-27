"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";

const USER_ID = "6a1698cdb2b362a0ebad5a2f";
const API_BASE = "http://localhost:3001/api/assignments";

export default function Page() {
  const { activeTab, setActiveTab, setCreateModalOpen, assignments, setAssignments } = useAssignmentStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDropdownCardId, setActiveDropdownCardId] = useState<string | null>(null);

  // Client-side pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch all assignments on mount (setting a high limit so client filters everything dynamically)
  const fetchAssignments = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/user/6a1698cdb2b362a0ebad5a2f?limit=100`);
      if (res.ok) {
        const data = await res.json();
        const payload = data.data || {};
        // Store all user assignments in the Zustand store
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

  // 1. FILTERING: Only show completed assignments (hide drafts, queued, failed, generating)
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
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
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
            onClick={() => setActiveTab("Settings")}
            className="flex items-center gap-4 py-2.5 px-4 rounded-xl text-[17px] font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 transition-all duration-200 text-left w-full cursor-pointer"
          >
            <Settings className="w-7 h-7 text-zinc-400" />
            Settings
          </button>

          <div className="bg-[#EFEFEF] p-4 rounded-2xl flex items-center gap-3.5 border border-zinc-100/50 hover:shadow-xs transition-shadow duration-200">
            <div className="w-14 h-14 rounded-full bg-[#fcd34d] overflow-hidden flex items-center justify-center border-2 border-white shadow-xs shrink-0">
              <img
                src="https://api.dicebear.com/7.x/bottts/svg?seed=dps"
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
            <button className="p-2 hover:bg-zinc-50 rounded-lg active:scale-95 transition-all text-zinc-600 cursor-pointer">
              <ArrowLeft className="w-8 h-8" />
            </button>
            <div className="h-5 w-[1px] bg-zinc-200"></div>
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4.5 h-4.5 text-zinc-400" />
              <span className="text-[18px] font-semibold text-zinc-400 select-none">
                Assignment
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
                    John Doe
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

        {/* Dynamic Inner Body Section */}
        {activeTab !== "Assignments" ? (
          <section className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-zinc-100 shadow-xs">
            <h2 className="text-2xl font-bold text-zinc-800 tracking-tight mb-2.5">
              {activeTab} Panel
            </h2>
            <p className="text-[14.5px] text-zinc-500 max-w-md leading-relaxed">
              This section is currently under active development. Select the "Assignments" tab to view assignment configurations.
            </p>
          </section>
        ) : isLoading ? (
          /* SKELETON LOADER STATE */
          <section className="flex-1 flex flex-col p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3.5 h-3.5 bg-zinc-300 rounded-full animate-pulse"></div>
              <div className="flex flex-col gap-2 items-start">
                <div className="w-48 h-7 bg-zinc-200 rounded-md animate-pulse"></div>
                <div className="w-72 h-4 bg-zinc-100 rounded-md animate-pulse"></div>
              </div>
            </div>

            <div className="flex justify-between items-center mb-8">
              <div className="w-28 h-10 bg-zinc-200 rounded-full animate-pulse"></div>
              <div className="w-80 h-10 bg-zinc-200 rounded-full animate-pulse"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-zinc-100 p-6 flex flex-col justify-between h-40 animate-pulse">
                  <div className="flex justify-between items-start">
                    <div className="w-40 h-6 bg-zinc-200 rounded-md"></div>
                    <div className="w-6 h-6 bg-zinc-100 rounded-full"></div>
                  </div>
                  <div className="flex justify-between items-end mt-4">
                    <div className="w-24 h-4 bg-zinc-100 rounded-md"></div>
                    <div className="w-24 h-4 bg-zinc-100 rounded-md"></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : completedAssignments.length === 0 ? (
          /* EMPTY STATE ILLUSTRATION (NO COMPLETED ASSIGNMENTS AT ALL) */
          <section className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
            <div className="mb-8 relative transform hover:scale-[1.03] transition-transform duration-300">
              <img
                src="/magnifying_icon.png"
                alt="No assignments yet"
                className="w-80 h-80 object-contain mx-auto"
              />
            </div>
            <h2 className="text-2xl font-bold text-zinc-800 tracking-tight mb-2.5">
              No assignments yet
            </h2>
            <p className="text-[14.5px] text-zinc-500 max-w-md leading-relaxed mb-8">
              Create your first assignment to start collecting and grading student
              submissions. You can set up rubrics, define marking criteria, and
              let AI assist with grading.
            </p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="bg-[#121212] hover:bg-[#252525] text-white py-3.5 px-7 rounded-full font-semibold flex items-center gap-2 shadow-md hover:shadow-lg active:scale-98 transition-all duration-200 text-[14.5px] cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5" />
              Create Your First Assignment
            </button>
          </section>
        ) : (
          /* DYNAMIC POPULATED STATE (FIGMA) */
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
              <div className="relative w-80  shadow-3xs">
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

                      <div className="flex flex-col font-bold sm:flex-row items-start sm:items-center justify-between gap-2 mt-6 pt-4 border-t border-zinc-50 text-[18px] text-zinc-900">
                        <span>
                          Assigned on : <strong className="text-zinc-400 font-semibold">{formatDate(a.createdAt)}</strong>
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