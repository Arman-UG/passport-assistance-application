import React from "react";
import { ShieldAlert } from "lucide-react";
import { APP_NAME, DISCLAIMER_TEXT } from "@/lib/constants";

export default function TermsPage() {
  return (
    <div className="py-12 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <span className="text-blue-600 font-semibold text-xs uppercase tracking-wider block mb-2">
            User Agreement
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Terms & Conditions of Service
          </h1>
          <p className="mt-2 text-xs text-slate-500">Effective Date: November 2026</p>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs sm:text-sm flex gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <span>{DISCLAIMER_TEXT}</span>
        </div>

        <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-700 space-y-6 leading-relaxed">
          <h3 className="text-base font-bold text-slate-900">1. Nature of the Service</h3>
          <p>
            {APP_NAME} operates as an independent facilitation and pre-application preparation platform. We assist applicants in verifying that their documentation meets standards published by the Ministry of External Affairs. We do NOT guarantee passport issuance, appointment dates, or police clearance outcomes.
          </p>

          <h3 className="text-base font-bold text-slate-900">2. Accuracy of Submissions</h3>
          <p>
            You agree to upload only legitimate, authentic scanned documents belonging to you or for whom you hold legal representation rights. Uploading forged, altered, or fraudulent identity proofs is strictly prohibited and constitutes an offence under the Indian Penal Code and the Passports Act, 1967.
          </p>

          <h3 className="text-base font-bold text-slate-900">3. Account Security</h3>
          <p>
            You are responsible for maintaining the confidentiality of your authentication credentials. In the event of suspected unauthorized account access or compromised sessions, notify our security desk immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
