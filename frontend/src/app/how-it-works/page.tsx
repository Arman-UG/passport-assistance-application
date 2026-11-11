import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { APPLICATION_STATUS_STEPS, PHOTO_SPECIFICATIONS } from "@/lib/constants";

export default function HowItWorksPage() {
  return (
    <div className="py-12 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div>
          <span className="text-blue-600 font-semibold text-xs uppercase tracking-wider block mb-2">
            Step-By-Step Workflow
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            How Passport Application Assistance Works
          </h1>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            From initial registration to verified document dossier, follow our transparent 8-stage preparation process.
          </p>
        </div>

        <div className="space-y-6">
          {APPLICATION_STATUS_STEPS.map((step, idx) => (
            <div
              key={step.key}
              className="flex items-start gap-4 p-5 rounded-xl border border-slate-200 bg-slate-50/70"
            >
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-sm shadow-sm">
                {idx + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 text-base">{step.label}</h3>
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    Stage {idx + 1}
                  </span>
                </div>
                <p className="text-slate-600 text-xs sm:text-sm mt-1">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-bold">Ready to Start Your Application?</h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Create your account to get your personalized checklist immediately.
            </p>
          </div>
          <Link
            href="/auth/register"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-lg transition shrink-0 flex items-center gap-2"
          >
            Create Customer Account
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
