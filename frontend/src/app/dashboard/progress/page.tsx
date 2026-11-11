"use client";

import React, { useEffect, useState } from "react";
import { Clock, CheckCircle2, Circle, AlertCircle, FileText } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { APPLICATION_STATUS_STEPS } from "@/lib/constants";

export default function ProgressPage() {
  const [app, setApp] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const appsRes = await apiClient("/api/proxy/applications/me");
      if (appsRes.data && appsRes.data.length > 0) {
        const currentApp = appsRes.data[0];
        setApp(currentApp);

        const histRes = await apiClient(`/api/proxy/applications/${currentApp.id}/history`);
        if (histRes.data) {
          setHistory(histRes.data);
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!app) {
    return <div className="p-8 text-center text-sm text-slate-500">No active application found.</div>;
  }

  // Determine current stage index
  const currentStatusIndex = APPLICATION_STATUS_STEPS.findIndex(
    (s) => s.key === app.application_status
  );

  return (
    <div className="space-y-8">
      <div>
        <span className="text-blue-600 font-mono text-xs uppercase tracking-wider block mb-1">
          Reference: {app.application_reference}
        </span>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Application Progress Timeline
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Track preparation milestones and immutable agent verification events.
        </p>
      </div>

      {/* Visual Roadmap Tracker */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">
          Preparation Lifecycle Stages
        </h3>

        <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200 before:top-3 before:bottom-3">
          {APPLICATION_STATUS_STEPS.map((step, idx) => {
            const isDone = currentStatusIndex > idx || (currentStatusIndex === -1 && idx === 0);
            const isCurrent = currentStatusIndex === idx;

            return (
              <div key={step.key} className="flex items-start gap-4 relative z-10">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition ${
                    isDone
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                      ? "bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse"
                      : "bg-white border-2 border-slate-300 text-slate-400"
                  }`}
                >
                  {isDone ? "✓" : idx + 1}
                </div>
                <div>
                  <h4
                    className={`text-sm font-bold ${
                      isCurrent
                        ? "text-blue-600"
                        : isDone
                        ? "text-slate-900"
                        : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Audit History Log */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          Event History & Agent Remarks
        </h3>

        {history.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No status change events logged yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {history.map((item) => (
              <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{item.new_status}</span>
                    {item.previous_status && (
                      <span className="text-slate-400 text-[11px]">
                        (was {item.previous_status})
                      </span>
                    )}
                  </div>
                  {item.remarks && <p className="text-slate-600 mt-0.5">{item.remarks}</p>}
                </div>
                <span className="text-slate-400 font-mono text-[11px] shrink-0">
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
