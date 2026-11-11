import React from "react";
import { ShieldAlert, CheckCircle, FileCheck, Users, HelpCircle } from "lucide-react";
import { APP_NAME, DISCLAIMER_TEXT } from "@/lib/constants";

export default function AboutPage() {
  return (
    <div className="py-12 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div>
          <span className="text-blue-600 font-semibold text-xs uppercase tracking-wider block mb-2">
            Independent Mediation & Review Service
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            About {APP_NAME}
          </h1>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            Our mission is to eliminate common errors and oversights that lead to appointment delays, document objections, and repeated visits to Passport Seva Kendras (PSK).
          </p>
        </div>

        {/* Prominent Statutory Disclaimer */}
        <div className="p-5 rounded-xl border border-amber-300 bg-amber-50/80 text-amber-900 text-sm leading-relaxed flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-950 mb-1">Notice of Independent Status</h3>
            <p>{DISCLAIMER_TEXT}</p>
          </div>
        </div>

        <div className="space-y-6 text-slate-700 leading-relaxed text-sm sm:text-base">
          <h2 className="text-xl font-bold text-slate-900">Why Pre-Submission Assistance Matters</h2>
          <p>
            Passport issuance is a sovereign function governed by the Passports Act, 1967. While citizens can apply directly through official portals, first-time applicants, senior citizens, and applicants with complex documentation often face hurdles such as:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-slate-600">
            <li>Name discrepancies between Aadhaar, Matriculation certificates, and PAN cards.</li>
            <li>Incorrectly dated utility bills or unaccepted address proofs.</li>
            <li>Non-compliant photographs failing biometric requirements.</li>
            <li>Uncertainty about Non-ECR (Emigration Check Not Required) eligibility documents.</li>
          </ul>

          <h2 className="text-xl font-bold text-slate-900 pt-4">What Our Platform Provides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
              <h4 className="font-semibold text-slate-900 text-sm mb-1 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Prescreening of Document Scans
              </h4>
              <p className="text-xs text-slate-600">
                Experienced passport agents review your documents before you ever visit the passport office.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
              <h4 className="font-semibold text-slate-900 text-sm mb-1 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Pre-Application Checklist
              </h4>
              <p className="text-xs text-slate-600">
                A custom list of required documents tailored to your specific application circumstance.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
              <h4 className="font-semibold text-slate-900 text-sm mb-1 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                Assigned Agent Collaboration
              </h4>
              <p className="text-xs text-slate-600">
                One-on-one document assistance with clear rejection reasons and resubmission guidance.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
              <h4 className="font-semibold text-slate-900 text-sm mb-1 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                Clarifications & Annexures
              </h4>
              <p className="text-xs text-slate-600">
                Guidance on required affidavits (Annexure C, D, E, F) when relevant to your circumstances.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
