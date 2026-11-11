import React from "react";
import { AlertCircle } from "lucide-react";
import { DISCLAIMER_TEXT } from "@/lib/constants";

export function DisclaimerBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs md:text-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <p className="font-medium">{DISCLAIMER_TEXT}</p>
        </div>
      </div>
    </div>
  );
}
