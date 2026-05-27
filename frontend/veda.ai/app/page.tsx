"use client";

import React, { useState } from "react";
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
} from "lucide-react";

export default function Page() {
  const { activeTab, setActiveTab, setCreateModalOpen } = useAssignmentStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const navItems = [
    { id: "Home", label: "Home", icon: Home },
    { id: "My Groups", label: "My Groups", icon: Users },
    { id: "Assignments", label: "Assignments", icon: FileText },
    { id: "AI Teacher's Toolkit", label: "AI Teacher's Toolkit", icon: Book },
    { id: "My Library", label: "My Library", icon: Library },
  ];

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] p-4 gap-6 font-sans">
      {/* -------------------- LEFT SIDEBAR -------------------- */}
      <aside className="w-82 bg-white rounded-3xl shadow-xs border border-zinc-100 flex flex-col justify-between p-6 shrink-0">
        <div className="flex flex-col gap-8">
          {/* Logo Section */}
          <div className="flex items-center -ml-5 -gap- select-none">
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

          {/* Create Assignment Button */}
          <div className="w-full rounded-full p-[3.5px] bg-gradient-to-t from-[#C0350A] to-[#FF7950] shadow-sm hover:shadow-md transition-all duration-200">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="w-full bg-[#1E1E1E] text-white py-3 px-5 rounded-full font-medium flex items-center justify-center gap-2.5 hover:bg-[#252525] active:scale-98 transition-all duration-200 group relative overflow-hidden"
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
                  className={`w-full flex items-center gap-4 py-3 px-4 rounded-xl text-left text-[16px] font-medium transition-all duration-200 ${
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
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Configuration Block */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setActiveTab("Settings")}
            className="flex items-center gap-4 py-2.5 px-4 rounded-xl text-[17px] font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 transition-all duration-200 text-left w-full"
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
      <main className="flex-1 flex flex-col gap-6">
        {/* Top Header Bar */}
        <header className="bg-white rounded-2xl border border-zinc-100/50 p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3.5">
            <button className="p-2 hover:bg-zinc-50 rounded-lg active:scale-95 transition-all text-zinc-600">
              <ArrowLeft className="w-8 h-8" />
            </button>
            <div className="h-5 w-[1px] bg-zinc-200"></div>
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4.5 h-4.5 text-zinc-400" />
              <span className="text-[18px] font-semibold text-zinc-400">
                Assignment
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <button className="relative p-2 hover:bg-zinc-50 rounded-full text-zinc-600 active:scale-95 transition-all">
              <Bell className="w-7 h-7" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#e04f2f] rounded-full ring-2 ring-white"></span>
            </button>

            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 hover:bg-zinc-50 py-1.5 px-3 rounded-full transition-all duration-200 text-left active:scale-98"
              >
                <div className="w-10 h-10 rounded-full bg-[#f87171] overflow-hidden flex items-center justify-center border border-zinc-200 shadow-xs">
                  <img
                    src="https://api.dicebear.com/7.x/adventurer/svg?seed=john"
                    alt="User profile"
                    className="w-10 h-10"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[18px] font-semibold text-zinc-700">
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
                  <button className="w-full text-left px-4 py-2 text-[13px] text-zinc-700 hover:bg-zinc-50">
                    My Profile
                  </button>
                  <button className="w-full text-left px-4 py-2 text-[13px] text-zinc-700 hover:bg-zinc-50">
                    Security
                  </button>
                  <div className="h-[1px] bg-zinc-100 my-1"></div>
                  <button className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50">
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Inner Body Section */}
        <section className="flex-1 flex flex-col items-center justify-center p-8 text-center">

          {/* ── ILLUSTRATION matching Figma exactly ── */}
          <div className="mb-8 relative transform hover:scale-[1.03] transition-transform duration-300">
            <img
              src="/magnifying_icon.png"
              alt="No assignments yet"
              className="w-80 h-80 object-contain mx-auto"
            />
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-zinc-800 tracking-tight mb-2.5">
            No assignments yet
          </h2>

          {/* Subtext */}
          <p className="text-[14.5px] text-zinc-500 max-w-md leading-relaxed mb-8">
            Create your first assignment to start collecting and grading student
            submissions. You can set up rubrics, define marking criteria, and
            let AI assist with grading.
          </p>

          {/* CTA Button */}
          <button
            onClick={() => setCreateModalOpen(true)}
            className="bg-[#121212] hover:bg-[#252525] text-white py-3.5 px-7 rounded-full font-semibold flex items-center gap-2 shadow-md hover:shadow-lg active:scale-98 transition-all duration-200 text-[14.5px]"
          >
            <Plus className="w-4.5 h-4.5" />
            Create Your First Assignment
          </button>
        </section>
      </main>
    </div>
  );
}