"use client";

import React, { useEffect, useState } from "react";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Download,
  Info,
  X,
  FileCheck,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { StatusBadge } from "@/components/StatusBadge";
import { PHOTO_SPECIFICATIONS } from "@/lib/constants";

export default function ChecklistPage() {
  const [app, setApp] = useState<any | null>(null);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [activeUploadItem, setActiveUploadItem] = useState<any | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadData = async () => {
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
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !activeUploadItem || !app) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    const res = await apiClient(
      `/api/proxy/documents/upload/${app.id}/${activeUploadItem.id}`,
      {
        method: "POST",
        body: formData,
      }
    );

    setUploading(false);

    if (res.error) {
      setUploadError(res.error);
      return;
    }

    // Success
    setActiveUploadItem(null);
    setSelectedFile(null);
    await loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!app) {
    return <div className="p-8 text-center text-sm text-slate-500">No application dossier found.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="text-blue-600 font-mono text-xs uppercase tracking-wider block mb-1">
          Reference: {app.application_reference}
        </span>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Required Document Checklist
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Review specifications, accepted formats, and upload clear copies for agent examination.
        </p>
      </div>

      {/* Document Items List */}
      <div className="space-y-4">
        {checklist.map((item) => {
          const req = item.requirement;
          const doc = item.document;
          const isPhoto = req?.name?.toLowerCase().includes("photograph");

          return (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{req?.name}</h3>
                    {item.is_mandatory && (
                      <span className="text-[10px] bg-rose-50 border border-rose-200 text-rose-700 px-1.5 py-0.2 rounded font-semibold">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">{req?.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={item.status} />
                </div>
              </div>

              {/* Requirement details & precautions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                <div>
                  <span className="font-semibold text-slate-700 block mb-0.5">Accepted Formats:</span>
                  <span className="text-slate-600 font-mono text-[11px]">
                    {req?.allowed_formats?.toUpperCase() || "PDF, JPG, PNG"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 block mb-0.5">Maximum File Size:</span>
                  <span className="text-slate-600">
                    {Math.round((req?.max_file_size_bytes || 5242880) / (1024 * 1024))} MB
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700 block mb-0.5">Instructions:</span>
                  <span className="text-slate-600">
                    {isPhoto ? "White background, 35x45mm" : "Colour scan, all edges visible"}
                  </span>
                </div>
              </div>

              {/* Rejection / Resubmission alert */}
              {doc?.rejection_reason && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Agent Review Remark:</span>
                    <span>{doc.rejection_reason}</span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-1">
                {doc ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>Uploaded: {doc.original_filename}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">No document uploaded yet</span>
                )}

                <div className="flex items-center gap-2">
                  {doc && (
                    <a
                      href={`/api/proxy/documents/${doc.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium transition flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Copy
                    </a>
                  )}

                  <button
                    onClick={() => {
                      setActiveUploadItem(item);
                      setSelectedFile(null);
                      setUploadError(null);
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {doc ? "Replace Scan" : "Upload Scan"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Modal */}
      {activeUploadItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Upload {activeUploadItem.requirement?.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Private, encrypted storage in compliance with DPDP standards
                </p>
              </div>
              <button
                onClick={() => setActiveUploadItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-6 text-center space-y-2 bg-slate-50/50 transition">
                <Upload className="w-8 h-8 text-blue-600 mx-auto" />
                <div className="text-xs text-slate-600">
                  <label className="font-bold text-blue-600 hover:underline cursor-pointer">
                    Click to select file
                    <input
                      type="file"
                      required
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </label>{" "}
                  or drag and drop
                </div>
                <p className="text-[11px] text-slate-400">
                  PDF, JPG, JPEG, or PNG (Max 5MB)
                </p>
                {selectedFile && (
                  <div className="mt-3 p-2 bg-blue-50 text-blue-900 border border-blue-200 rounded text-xs font-medium text-left">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 leading-relaxed">
                <strong>Precautions:</strong> Ensure document corners are not cropped, all text is legible without blur, and no confidential numbers other than legal identity proofs are visible.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveUploadItem(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                >
                  {uploading ? "Verifying & Uploading..." : "Submit for Agent Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
