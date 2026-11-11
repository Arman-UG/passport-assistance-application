"use client";

import React, { useEffect, useState } from "react";
import { User, Bell, Check, ShieldCheck, Key } from "lucide-react";
import { apiClient } from "@/lib/api-client";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const meRes = await apiClient("/api/auth/me");
    if (meRes.data?.user) {
      setProfile(meRes.data.user);
    }

    const notifRes = await apiClient("/api/proxy/profile/notifications");
    if (notifRes.data) {
      setNotifications(notifRes.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const markRead = async (notifId: string) => {
    await apiClient(`/api/proxy/profile/notifications/${notifId}/read`, {
      method: "PATCH",
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Applicant Profile & Notifications
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Manage your account credentials, security configuration, and agent notices.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Account Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Account Security</h3>
            <p className="text-xs text-slate-500">Authenticated via Central Java Authority</p>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div>
              <span className="text-slate-400 block font-mono">User ID</span>
              <span className="font-mono text-slate-800 break-all">{profile?.userId}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Assigned Role</span>
              <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                {profile?.role}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Password Hashing</span>
              <span className="font-medium text-slate-700">Argon2id (m=65536, t=3, p=1)</span>
            </div>
            <div>
              <span className="text-slate-400 block">Session State</span>
              <span className="font-medium text-emerald-600">Active · Refresh Rotation Enabled</span>
            </div>
          </div>
        </div>

        {/* Notifications Center */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-base">Agent Notifications</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {notifications.filter((n) => !n.is_read).length} Unread
            </span>
          </div>

          {notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 italic">
              No notifications dispatched to your account yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`py-3.5 flex items-start justify-between gap-3 ${
                    notif.is_read ? "opacity-75" : "bg-blue-50/40 p-2.5 rounded-lg"
                  }`}
                >
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{notif.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>

                  {!notif.is_read && (
                    <button
                      onClick={() => markRead(notif.id)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 rounded shrink-0 transition"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
