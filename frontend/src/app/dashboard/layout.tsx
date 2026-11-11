"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  CheckSquare,
  Clock,
  User,
  Shield,
  Bell,
  PlusCircle,
  AlertCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [applications, setApplications] = useState<any[]>([]);
  const [activeApp, setActiveApp] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchApps = async () => {
    setLoading(true);
    const res = await apiClient("/api/proxy/applications/me");
    if (res.data && res.data.length > 0) {
      setApplications(res.data);
      setActiveApp(res.data[0]);
    } else {
      setApplications([]);
      setActiveApp(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleCreateApplication = async () => {
    const res = await apiClient("/api/proxy/applications/", {
      method: "POST",
    });
    if (res.data) {
      await fetchApps();
      router.push("/dashboard/checklist");
    }
  };

  const navLinks = [
    { href: "/dashboard", label: "Overview", icon: FileText },
    { href: "/dashboard/checklist", label: "Document Checklist", icon: CheckSquare },
    { href: "/dashboard/progress", label: "Application Timeline", icon: Clock },
    { href: "/dashboard/profile", label: "Profile & Alerts", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 shrink-0 p-4 md:p-6 space-y-6">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Active Passport Dossier
          </span>
          {activeApp ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-xs text-slate-500 block font-mono">Reference</span>
              <span className="font-bold text-slate-900 text-sm block">
                {activeApp.application_reference}
              </span>
              <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-semibold rounded">
                {activeApp.application_status}
              </span>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
              No active application found. Click below to initiate your checklist.
            </div>
          )}

          <button
            onClick={handleCreateApplication}
            className="w-full mt-3 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New Application
          </button>
        </div>

        <nav className="space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-white" : "text-slate-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl">{children}</main>
    </div>
  );
}
