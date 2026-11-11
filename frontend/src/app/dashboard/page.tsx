"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  UploadCloud,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { PHOTO_SPECIFICATIONS } from "@/lib/constants";

export default function DashboardOverviewPage() {
  const [app, setApp] = useState<any | null>(null);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const appsRes = await apiClient("/api/proxy/applications/me");
      if (appsRes.data && appsRes.data.length > 0) {
        const currentApp = appsRes.data[0];
        setApp(currentApp);

        const chkRes = await apiClient(`/api/proxy/applications/${currentApp.id}/checklist`);
        if (chkRes.data) {
          setChecklist(chkRes.data);
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-medium">Loading your dossier...</p>
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Welcome to Your Dashboard</h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          You don&apos;t have any active passport application dossiers yet. Click the button below to initiate your checklist.
        </p>
        <button
          onClick={async () => {
            const res = await apiClient("/api/proxy/applications/", { method: "POST" });
            if (res.data) window.location.reload();
          }}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition"
        >
          Initiate Passport Application
        </button>
      </div>
    );
  }

  // Calculate metrics
  const totalDocs = checklist.length;
  const submittedDocs = checklist.filter((item) => item.status !== "NOT_SUBMITTED").length;
  const approvedDocs = checklist.filter((item) => item.status === "APPROVED").length;
  const percentComplete = totalDocs > 0 ? Math.round((submittedDocs / totalDocs) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-blue-400 font-mono text-xs uppercase tracking-wider block mb-1">
            Application Reference: {app.application_reference}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Applicant Document Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Upload identity documents and monitor review status before your passport seva appointment.
          </p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 text-center shrink-0 w-full md:w-auto">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
            Application Status
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600/30 text-blue-300 border border-blue-400/40 inline-block">
            {app.application_status}
          </span>
        </div>
      </div>

      {/* Progress Metric Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Document Readiness Progress
          </span>
          <span className="text-sm font-extrabold text-blue-600">{percentComplete}% Complete</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentComplete}%` }}
          ></div>
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
          <span>{submittedDocs} of {totalDocs} documents submitted</span>
          <span>{approvedDocs} approved by agent</span>
        </div>
      </div>

      {/* Checklist Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Document Checklist Overview</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Items required for verified passport seva dossier
            </p>
          </div>
          <Link
            href="/dashboard/checklist"
            className="text-xs font-semibold text-blue-600 hover:text-blue-500 flex items-center gap-1"
          >
            Manage All
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {checklist.map((item) => (
            <div key={item.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 text-sm">
                    {item.requirement?.name || "Required Proof"}
                  </h3>
                  {item.is_mandatory && (
                    <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded font-medium">
                      Mandatory
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 line-clamp-1 max-w-xl">
                  {item.requirement?.description}
                </p>
                {item.document?.rejection_reason && (
                  <p className="text-xs text-rose-600 font-medium">
                    Reason: {item.document.rejection_reason}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={item.status} />
                <Link
                  href="/dashboard/checklist"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 text-xs font-medium rounded transition"
                >
                  {item.status === "NOT_SUBMITTED" ? "Upload" : "Review"}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Photograph Instructions Card */}
      <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-6">
        <h3 className="font-bold text-blue-950 text-sm mb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-700" />
          Photograph Precautions
        </h3>
        <p className="text-xs text-blue-900/80 mb-3 leading-relaxed">
          Photo size must be exactly 35mm × 45mm on a clean white background. Selfies, blurred photos, and photos with tinted glasses or headgear (except religious) will be rejected by the agent and PSK.
        </p>
        <Link
          href="/dashboard/checklist"
          className="text-xs font-semibold text-blue-700 hover:underline"
        >
          View detailed photo requirements →
        </Link>
      </div>
    </div>
  );
}
