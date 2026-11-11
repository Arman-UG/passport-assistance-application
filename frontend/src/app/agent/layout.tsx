"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, FileText, Users, ShieldAlert, ArrowLeft } from "lucide-react";
import { apiClient } from "@/lib/api-client";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<any | null>(null);

  useEffect(() => {
    apiClient("/api/auth/me").then((res) => {
      if (res.data?.user) setSession(res.data.user);
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-900 text-white shrink-0 p-5 space-y-6">
        <div>
          <span className="text-[10px] uppercase font-mono text-emerald-400 tracking-wider font-semibold block mb-1">
            Certified Officer
          </span>
          <h2 className="text-base font-bold text-white">Agent Workspace</h2>
          <p className="text-xs text-slate-400 mt-1">
            Pre-submission compliance & document review portal
          </p>
        </div>

        <nav className="space-y-1">
          <Link
            href="/agent"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
              pathname === "/agent"
                ? "bg-emerald-600 text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            Applicant Dossiers
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Customer View
          </Link>
        </nav>

        <div className="pt-6 border-t border-slate-800 text-[11px] text-slate-400 space-y-2">
          <div className="flex items-center gap-1.5 text-amber-300">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span className="font-semibold">Sensitive Dossier Access</span>
          </div>
          <p className="text-slate-500 leading-relaxed">
            All reviews, notes, and file downloads are tracked in immutable audit logs.
          </p>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl">{children}</main>
    </div>
  );
}
