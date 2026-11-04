"use client";

import React, { useState } from "react";
import { AlertTriangle, Power, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Modal } from "./Modal";
import { AdminRole } from "@/lib/types";

interface KillSwitchBannerProps {
  isKillSwitchActive: boolean;
  userRole: AdminRole;
  onToggleKillSwitch: (newState: boolean) => Promise<void>;
}

export function KillSwitchBanner({
  isKillSwitchActive,
  userRole,
  onToggleKillSwitch,
}: KillSwitchBannerProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const canEdit = userRole === "owner" || userRole === "editor";

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onToggleKillSwitch(!isKillSwitchActive);
      setIsConfirmOpen(false);
    } catch (err: any) {
      alert("Failed to update Master Kill Switch: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* If Kill Switch is ACTIVE: High-visibility emergency alert */}
      {isKillSwitchActive ? (
        <div className="bg-rose-600 text-white p-3 sm:p-4 rounded-xl shadow-lg shadow-rose-600/20 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-700/80 rounded-lg flex-shrink-0">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base">
                  MASTER KILL SWITCH IS ACTIVE
                </span>
                <span className="bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                  System Halted
                </span>
              </div>
              <p className="text-xs text-rose-100 mt-0.5">
                All lead pages and quizzes are forced paused. Visitors see the closed maintenance message.
              </p>
            </div>
          </div>

          {canEdit && (
            <button
              onClick={() => setIsConfirmOpen(true)}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 bg-white text-rose-700 hover:bg-rose-50 font-bold text-xs sm:text-sm rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 touch-target"
            >
              <Power className="w-4 h-4 text-emerald-600" />
              <span>Deactivate Kill Switch (Resume)</span>
            </button>
          )}
        </div>
      ) : (
        /* If Kill Switch is INACTIVE: Compact operational status */
        <div className="flex items-center justify-between p-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-slate-700">
              System Operational
            </span>
          </div>

          {canEdit && (
            <button
              onClick={() => setIsConfirmOpen(true)}
              title="Pause all lead pages immediately"
              className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 rounded-lg transition-colors flex items-center gap-1.5 touch-target"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Kill Switch</span>
            </button>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title={
          isKillSwitchActive
            ? "Deactivate Master Kill Switch?"
            : "⚠️ ACTIVATE MASTER KILL SWITCH?"
        }
        maxWidth="md"
      >
        <div className="space-y-4">
          <div
            className={`p-4 rounded-xl flex items-start gap-3 ${
              isKillSwitchActive
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {isKillSwitchActive ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="text-xs sm:text-sm">
              {isKillSwitchActive ? (
                <p>
                  Turning off the Master Kill Switch will restore all pages to their individually
                  configured live or scheduled states. Lead traffic and quiz submissions will resume.
                </p>
              ) : (
                <p>
                  <strong>EMERGENCY ACTION:</strong> Activating the Master Kill Switch will
                  immediately freeze and pause <strong>ALL</strong> pages across the entire Lead Page
                  Engine, redirecting visitors to the closed maintenance message.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsConfirmOpen(false)}
              disabled={loading}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors touch-target"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className={`px-5 py-2.5 text-sm font-bold text-white rounded-lg transition-colors shadow-sm flex items-center gap-2 touch-target ${
                isKillSwitchActive
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {loading && <span className="animate-spin">⏳</span>}
              <span>{isKillSwitchActive ? "Resume All Pages" : "Confirm: Pause All Pages"}</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
