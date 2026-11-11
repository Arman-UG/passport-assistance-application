"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  CheckCircle,
  Clock,
  ArrowRight,
  Filter,
  FileCheck,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";

export default function AgentDashboardPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  useEffect(() => {
    async function loadApps() {
      setLoading(true);
      const res = await apiClient("/api/proxy/agent/applications");
      if (res.data) {
        setApplications(res.data);
      }
      setLoading(false);
    }
    loadApps();
  }, []);

  const filtered = applications.filter((app) => {
    const matchesSearch =
      app.application_reference.toLowerCase().includes(search.toLowerCase()) ||
      app.customer_id.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterStatus === "ALL" || app.application_status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Applicant Management Desk
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Review applicant documents, verify compliance, and update preparation progress.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Dossiers
          </span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-1">
            {applications.length}
          </span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Documents Submitted
          </span>
          <span className="text-2xl font-extrabold text-blue-600 block mt-1">
            {applications.reduce((acc, a) => acc + (a.metrics?.uploaded_count || 0), 0)}
          </span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Approved Documents
          </span>
          <span className="text-2xl font-extrabold text-emerald-600 block mt-1">
            {applications.reduce((acc, a) => acc + (a.metrics?.approved_count || 0), 0)}
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by application reference (e.g. PP-2026-) or customer ID..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="ALL">All Statuses</option>
          <option value="INITIATED">INITIATED</option>
          <option value="DOCUMENTS_SUBMITTED">DOCUMENTS_SUBMITTED</option>
          <option value="UNDER_REVIEW">UNDER_REVIEW</option>
          <option value="ADDITIONAL_DOCS_REQUESTED">ADDITIONAL_DOCS_REQUESTED</option>
          <option value="REVIEW_COMPLETE">REVIEW_COMPLETE</option>
          <option value="COMPLETED">COMPLETED</option>
        </select>
      </div>

      {/* Application Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading applicant list...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 italic">
            No applications match your search or filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Application Reference</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Document Progress</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {item.application_reference}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        Customer: {item.customer_id.substring(0, 8)}...
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-800">
                        {item.application_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">
                          {item.metrics?.uploaded_count || 0} / {item.metrics?.total_required || 0}
                        </span>
                        <span>uploaded</span>
                        <span className="text-emerald-600 font-medium">
                          ({item.metrics?.approved_count || 0} approved)
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">
                      {new Date(item.updated_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/agent/review/${item.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition"
                      >
                        Review Dossier
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
