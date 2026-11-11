"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ShieldCheck, User, LogOut, FileText, CheckCircle2 } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { apiClient } from "@/lib/api-client";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<{ userId: string; role: string } | null>(null);

  useEffect(() => {
    apiClient("/api/auth/me").then((res) => {
      if (res.data?.authenticated) {
        setSession(res.data.user);
      } else {
        setSession(null);
      }
    });
  }, [pathname]);

  const handleLogout = async () => {
    await apiClient("/api/auth/logout", { method: "POST" });
    setSession(null);
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-base sm:text-lg tracking-tight block text-slate-100">
              {APP_NAME}
            </span>
            <span className="text-[10px] text-blue-300 block -mt-1 font-mono uppercase tracking-wider">
              Assistance & Mediation Portal
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <Link href="/" className="hover:text-white transition">
            Home
          </Link>
          <Link href="/how-it-works" className="hover:text-white transition">
            How It Works
          </Link>
          <Link href="/about" className="hover:text-white transition">
            About Service
          </Link>
          <Link href="/contact" className="hover:text-white transition">
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-3">
              {session.role === "CUSTOMER" ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-700 hover:bg-blue-600 text-xs sm:text-sm font-medium transition"
                >
                  <FileText className="w-4 h-4" />
                  My Dashboard
                </Link>
              ) : (
                <Link
                  href="/agent"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-600 text-xs sm:text-sm font-medium transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Agent Workspace
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white text-xs sm:text-sm transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-200 hover:text-white transition"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="px-3.5 py-1.5 text-xs sm:text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition shadow-sm"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
