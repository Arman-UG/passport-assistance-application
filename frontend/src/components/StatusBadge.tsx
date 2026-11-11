import React from "react";
import { DOCUMENT_STATUSES } from "@/lib/constants";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const norm = status?.toUpperCase() || "NOT_SUBMITTED";
  const config =
    DOCUMENT_STATUSES[norm as keyof typeof DOCUMENT_STATUSES] || {
      label: norm.replace(/_/g, " "),
      color: "bg-slate-100 text-slate-800 border-slate-300",
    };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.color}`}
    >
      {config.label}
    </span>
  );
}
