"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  FileText,
  AlertCircle,
  Send,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { APPLICATION_STATUS_STEPS } from "@/lib/constants";

export default function AgentReviewPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = use(params);

  const [application, setApplication] = useState<any | null>(null);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Document review action state
  const [reviewingDoc, setReviewingDoc] = useState<any | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"APPROVED" | "REJECTED" | "RESUBMISSION_REQUIRED">("APPROVED");
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Status update state
  const [newStatus, setNewStatus] = useState("");
  const [statusRemarks, setStatusRemarks] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);

  // Note state
  const [newNote, setNewNote] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);

  // Notification state
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [appRes, chkRes, notesRes] = await Promise.all([
      apiClient(`/api/proxy/applications/${appId}`),
      apiClient(`/api/proxy/applications/${appId}/checklist`),
      apiClient(`/api/proxy/agent/applications/${appId}/notes`),
    ]);

    if (appRes.data) {
      setApplication(appRes.data);
      setNewStatus(appRes.data.application_status);
    }
    if (chkRes.data) setChecklist(chkRes.data);
    if (notesRes.data) setNotes(notesRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [appId]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingDoc) return;

    if (
      (reviewStatus === "REJECTED" || reviewStatus === "RESUBMISSION_REQUIRED") &&
      !rejectionReason.trim()
    ) {
      setActionError("A rejection or resubmission reason must be provided.");
      return;
    }

    setActionLoading(true);
    setActionError(null);

    const res = await apiClient(`/api/proxy/documents/${reviewingDoc.id}/review`, {
      method: "PATCH",
      body: JSON.stringify({
        review_status: reviewStatus,
        rejection_reason: rejectionReason.trim() || undefined,
      }),
    });

    setActionLoading(false);

    if (res.error) {
      setActionError(res.error);
      return;
    }

    setReviewingDoc(null);
    setRejectionReason("");
    await loadData();
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusLoading(true);

    const res = await apiClient(`/api/proxy/agent/applications/${appId}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        new_status: newStatus,
        remarks: statusRemarks,
      }),
    });

    setStatusLoading(false);
    if (res.data) {
      setStatusRemarks("");
      await loadData();
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setNoteLoading(true);
    const res = await apiClient(`/api/proxy/agent/applications/${appId}/notes`, {
      method: "POST",
      body: JSON.stringify({ content: newNote.trim() }),
    });

    setNoteLoading(false);
    if (res.data) {
      setNewNote("");
      const notesRes = await apiClient(`/api/proxy/agent/applications/${appId}/notes`);
      if (notesRes.data) setNotes(notesRes.data);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return;

    setNotifLoading(true);
    const res = await apiClient(`/api/proxy/agent/applications/${appId}/notify`, {
      method: "POST",
      body: JSON.stringify({
        title: notifTitle.trim(),
        message: notifMessage.trim(),
      }),
    });

    setNotifLoading(false);
    if (res.data) {
      setNotifTitle("");
      setNotifMessage("");
      setNotifSuccess(true);
      setTimeout(() => setNotifSuccess(false), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!application) {
    return <div className="p-8 text-center text-sm text-slate-500">Application not found.</div>;
  }

  return (
    <div className="space-y-8">
      {/* Back button & dossier header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link
            href="/agent"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-2 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dossier Desk
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 font-mono">
              {application.application_reference}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
              {application.application_status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Customer ID: {application.customer_id}</p>
        </div>

        {/* Claim / Assign Button if unassigned */}
        {!application.assigned_agent_id && (
          <button
            onClick={async () => {
              await apiClient(`/api/proxy/agent/applications/${appId}/assign`, { method: "POST" });
              await loadData();
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            Assign Myself to this Dossier
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Submitted Documents Review */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Document Verification & Examination
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Download private scans, inspect compliance against PSK standards, and mark approval.
            </p>

            <div className="space-y-4">
              {checklist.map((item) => {
                const req = item.requirement;
                const doc = item.document;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{req?.name}</h4>
                          {item.is_mandatory && (
                            <span className="text-[10px] bg-rose-50 text-rose-700 px-1 rounded font-medium border border-rose-200">
                              Mandatory
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{req?.description}</p>
                      </div>

                      <StatusBadge status={item.status} />
                    </div>

                    {doc ? (
                      <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-slate-600">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">{doc.original_filename}</span>
                          <span className="text-slate-400">
                            ({new Date(doc.uploaded_at).toLocaleDateString()})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={`/api/proxy/documents/${doc.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded text-xs font-medium flex items-center gap-1 transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </a>

                          <button
                            onClick={() => {
                              setReviewingDoc(doc);
                              setReviewStatus("APPROVED");
                              setRejectionReason("");
                              setActionError(null);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition"
                          >
                            Review Action
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-200 text-xs text-slate-400 italic">
                        Applicant has not submitted this proof yet.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Internal Notes Thread */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              Internal Agent Notes (Private to Agents)
            </h3>

            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={2}
                placeholder="Record internal verification notes, spelling discrepancies, or PSK appointment prep remarks..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <button
                type="submit"
                disabled={noteLoading || !newNote.trim()}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold transition disabled:opacity-50"
              >
                {noteLoading ? "Saving..." : "Add Note"}
              </button>
            </form>

            <div className="space-y-2 pt-2">
              {notes.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No internal notes recorded yet.</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                    <p className="text-slate-800">{note.content}</p>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {new Date(note.created_at).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Progression & Customer Messaging */}
        <div className="space-y-6">
          {/* Status Progression */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Update Dossier Status</h3>
            <form onSubmit={handleStatusChange} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white"
                >
                  <option value="INITIATED">INITIATED</option>
                  <option value="CHECKLIST_ASSIGNED">CHECKLIST_ASSIGNED</option>
                  <option value="DOCUMENTS_SUBMITTED">DOCUMENTS_SUBMITTED</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                  <option value="ADDITIONAL_DOCS_REQUESTED">ADDITIONAL_DOCS_REQUESTED</option>
                  <option value="REVIEW_COMPLETE">REVIEW_COMPLETE</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Remarks / History Reason
                </label>
                <input
                  type="text"
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  placeholder="e.g. All identity proofs verified compliant"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={statusLoading}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition shadow-sm disabled:opacity-50"
              >
                {statusLoading ? "Updating..." : "Commit Status Change"}
              </button>
            </form>
          </div>

          {/* Send Customer Notification */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Send className="w-4 h-4 text-blue-600" />
              Notify Applicant
            </h3>

            {notifSuccess && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs">
                Notification dispatched to applicant inbox!
              </div>
            )}

            <form onSubmit={handleSendNotification} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Subject / Alert Title
                </label>
                <input
                  type="text"
                  required
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="e.g. Resubmission Required for Aadhaar"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Notification Body
                </label>
                <textarea
                  required
                  rows={3}
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="Explain exactly what the applicant needs to do next..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={notifLoading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition shadow-sm disabled:opacity-50"
              >
                {notifLoading ? "Sending..." : "Dispatch Notification"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {reviewingDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base">
              Review Document: {reviewingDoc.original_filename}
            </h3>

            {actionError && (
              <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded border border-rose-200">
                {actionError}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Verification Decision
                </label>
                <select
                  value={reviewStatus}
                  onChange={(e: any) => setReviewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white"
                >
                  <option value="APPROVED">APPROVED — Document Meets Standards</option>
                  <option value="REJECTED">REJECTED — Invalid or Unacceptable</option>
                  <option value="RESUBMISSION_REQUIRED">RESUBMISSION_REQUIRED — Blurry / Missing Details</option>
                </select>
              </div>

              {reviewStatus !== "APPROVED" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Rejection / Resubmission Reason (Mandatory)
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Clearly explain the reason for the applicant (e.g. Address proof older than 3 months, or edges cut off)..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewingDoc(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                >
                  {actionLoading ? "Submitting..." : "Save Review Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
