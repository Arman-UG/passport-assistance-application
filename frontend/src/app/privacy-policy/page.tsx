import React from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { APP_NAME, DISCLAIMER_TEXT } from "@/lib/constants";

export default function PrivacyPolicyPage() {
  return (
    <div className="py-12 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <span className="text-blue-600 font-semibold text-xs uppercase tracking-wider block mb-2">
            Data Protection & Privacy Notice
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Privacy Policy & Document Retention Standard
          </h1>
          <p className="mt-2 text-xs text-slate-500">Effective Date: November 2026</p>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs sm:text-sm flex gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <span>{DISCLAIMER_TEXT}</span>
        </div>

        <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-700 space-y-6 leading-relaxed">
          <h3 className="text-base font-bold text-slate-900">1. Information We Collect</h3>
          <p>
            When registering and using {APP_NAME}, we collect:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li><strong>Account Data:</strong> Legal full name, email address, password hash (Argon2id).</li>
            <li><strong>Uploaded Proofs:</strong> Scanned copies of identity proofs, proof of date of birth, address proofs, and biometric photographs uploaded solely for verification and compliance checking.</li>
            <li><strong>Technical Security Data:</strong> IP address, device user-agent string, session identifiers, and access audit records.</li>
          </ul>

          <h3 className="text-base font-bold text-slate-900">2. Security of Stored Documents</h3>
          <p>
            All submitted documents are housed in private, non-public server volumes. Documents are NEVER accessible via open web URLs or shared across customers. Every access requires a verified JWT signature, role verification, and customer ownership authorization.
          </p>

          <h3 className="text-base font-bold text-slate-900">3. Purpose of Processing</h3>
          <p>
            Your documents are processed exclusively to provide pre-submission document audit, format verification, and readiness assessment by your designated agent. Documents are NOT sold, rented, or transferred to third-party marketing brokers.
          </p>

          <h3 className="text-base font-bold text-slate-900">4. Retention & Deletion Policy</h3>
          <p>
            Identity document scans are retained only for the duration of your active preparation lifecycle plus 30 days for compliance audits. You may request immediate deletion of all uploaded documents at any time via your customer dashboard or by emailing dpo@passportassistance.local.
          </p>
        </div>
      </div>
    </div>
  );
}
