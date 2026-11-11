import Link from "next/link";
import {
  FileCheck,
  ShieldCheck,
  Clock,
  UserCheck,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  UploadCloud,
  FileSearch,
} from "lucide-react";
import { APP_NAME, PHOTO_SPECIFICATIONS } from "@/lib/constants";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white py-16 md:py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-700">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-6">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            Independent Application Preparation Portal
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Prepare Your Passport Application with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              Zero Guesswork
            </span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
            Avoid application rejections, incorrect photo dimensions, and missing annexures. Our certified assistance platform guides you through document collection, pre-submission reviews, and readiness verification.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg hover:shadow-blue-500/25 transition flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              Start Your Preparation
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/how-it-works"
              className="w-full sm:w-auto px-7 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-lg transition text-sm sm:text-base"
            >
              Learn the Process
            </Link>
          </div>
        </div>
      </section>

      {/* Core Workflow Steps */}
      <section className="py-16 md:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">
              How the Platform Works
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              A structured, 4-step preparation pathway connecting applicants directly with experienced passport assistance agents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 relative">
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="font-semibold text-slate-900 text-base mb-2">Register & Initiate</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Create your secure customer account in seconds. No identity documents required during signup.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 relative">
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="font-semibold text-slate-900 text-base mb-2">Tailored Checklist</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Review your personalized document checklist tailored to your application category and age group.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 relative">
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="font-semibold text-slate-900 text-base mb-2">Upload & Validate</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Upload clear scans through our private, strictly access-controlled storage with immediate format checks.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 relative">
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center mb-4">
                4
              </div>
              <h3 className="font-semibold text-slate-900 text-base mb-2">Agent Review</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                An assigned agent inspects every document for legibility, spelling matches, and government guidelines compliance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Photograph Instructions Preview */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10">
            <div className="max-w-3xl mb-8">
              <span className="text-blue-600 font-semibold text-xs uppercase tracking-wider block mb-2">
                Critical Compliance Requirement
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                Official Photograph Guidance
              </h2>
              <p className="text-slate-600 text-sm sm:text-base">
                Over 30% of passport appointment delays are caused by non-compliant photographs. Ensure your photograph meets exact specifications prior to submitting:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-lg border border-slate-100 bg-slate-50/70">
                <h4 className="font-semibold text-slate-900 text-sm mb-1">Dimensions & Size</h4>
                <p className="text-xs text-slate-600">{PHOTO_SPECIFICATIONS.dimensions}</p>
                <p className="text-xs text-slate-500 mt-1">{PHOTO_SPECIFICATIONS.fileLimit}</p>
              </div>

              <div className="p-5 rounded-lg border border-slate-100 bg-slate-50/70">
                <h4 className="font-semibold text-slate-900 text-sm mb-1">Background & Framing</h4>
                <p className="text-xs text-slate-600">{PHOTO_SPECIFICATIONS.background}</p>
                <p className="text-xs text-slate-500 mt-1">Head should occupy 70% to 80% of photo frame.</p>
              </div>

              <div className="p-5 rounded-lg border border-slate-100 bg-slate-50/70">
                <h4 className="font-semibold text-slate-900 text-sm mb-1">Pose & Quality</h4>
                <p className="text-xs text-slate-600">{PHOTO_SPECIFICATIONS.composition}</p>
                <p className="text-xs text-slate-500 mt-1">{PHOTO_SPECIFICATIONS.lighting}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Confidentiality */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-base mb-1">Strict Access Control</h3>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  Identity proofs are stored on private file systems. Only you and your specifically assigned agent can access your files.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-base mb-1">Audit Trail & Integrity</h3>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  Every document review action, status update, and note is permanently recorded in an immutable audit ledger.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-base mb-1">Certified Assistance</h3>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  Direct communication channels with experienced agents who review names, birth dates, and address proofs before appointment day.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
