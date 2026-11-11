import React from "react";
import Link from "next/link";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { APP_NAME, DISCLAIMER_TEXT } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              <span className="font-bold text-slate-100 text-base">{APP_NAME}</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-md mb-4">
              Providing application document readiness checks, compliance verification, and preparation guidance for passport applicants through certified agents.
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded p-3 text-[11px] leading-relaxed text-amber-300/90 flex gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{DISCLAIMER_TEXT}</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 mb-3 text-xs uppercase tracking-wider">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/how-it-works" className="hover:text-white transition">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition">
                  About Our Service
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="hover:text-white transition">
                  Create Customer Account
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-white transition">
                  Applicant & Agent Login
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 mb-3 text-xs uppercase tracking-wider">
              Legal & Privacy
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/privacy-policy" className="hover:text-white transition">
                  Privacy Policy & DPDP
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition">
                  Security & Support Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <p>End-to-End Encrypted File Handling · Zero Public Cloud Sharing</p>
        </div>
      </div>
    </footer>
  );
}
