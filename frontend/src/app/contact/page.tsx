"use client";

import React, { useState } from "react";
import { Mail, Phone, MapPin, CheckCircle, ShieldCheck } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="py-12 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div>
          <span className="text-blue-600 font-semibold text-xs uppercase tracking-wider block mb-2">
            Support & Grievances
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Contact Assistance Team
          </h1>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            Have questions about document requirements, file formats, or your assigned agent? Reach out below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">Email Assistance</h4>
                <p className="text-xs text-slate-600 mt-0.5">support@passportassistance.local</p>
                <p className="text-[11px] text-slate-400 mt-1">Average response: 2 business hours</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
              <Phone className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">Helpline Desk</h4>
                <p className="text-xs text-slate-600 mt-0.5">+91 (0) 11 2345 6789</p>
                <p className="text-[11px] text-slate-400 mt-1">Mon - Sat: 9:00 AM - 6:00 PM IST</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">Data Privacy Officer</h4>
                <p className="text-xs text-slate-600 mt-0.5">dpo@passportassistance.local</p>
                <p className="text-[11px] text-slate-400 mt-1">For document deletion and DPDP queries</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
              {submitted ? (
                <div className="text-center py-10 space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Message Delivered</h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Our customer support team has received your query and will respond to your registered email shortly.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSubmitted(true);
                  }}
                  className="space-y-4"
                >
                  <h3 className="font-bold text-slate-900 text-base mb-1">Send an Enquiry</h3>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Subject / Application Reference (if applicable)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PP-2026-ABC123 or Photograph Inquiry"
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Message
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Describe your query in detail..."
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm transition shadow-sm"
                  >
                    Submit Enquiry
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
