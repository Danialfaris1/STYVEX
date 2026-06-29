/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Sliders, KeyRound, UserPlus, Info, CheckCircle, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface StaffAuthGateProps {
  staffIds: string[];
  onAuthenticate: (staffId: string) => void;
  onRegisterStaffId: (staffId: string) => { success: boolean; error?: string };
  onBackToCustomer: () => void;
}

export default function StaffAuthGate({
  staffIds,
  onAuthenticate,
  onRegisterStaffId,
  onBackToCustomer,
}: StaffAuthGateProps) {
  const [staffIdInput, setStaffIdInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const trimmedId = staffIdInput.trim();

    if (!trimmedId) {
      setErrorMsg("Please enter your Staff ID.");
      return;
    }

    if (staffIds.includes(trimmedId)) {
      onAuthenticate(trimmedId);
    } else {
      setErrorMsg("Invalid Staff ID.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4 py-12 bg-natural-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white rounded-3xl border border-natural-border shadow-xl overflow-hidden"
      >
        {/* Banner header */}
        <div className="p-8 text-center bg-natural-secondary/20 border-b border-natural-border">
          <div className="mx-auto bg-brand h-14 w-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-brand/15">
            <Sliders className="h-6 w-6 text-white" />
          </div>
          <h2 className="font-serif font-black text-2xl text-natural-text">
            Staff Access Gate
          </h2>
          <p className="text-natural-muted text-xs mt-1.5 max-w-[280px] mx-auto">
            Authorized store operators must enter a valid numeric Staff ID to unlock inventory and shipping tools.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-natural-muted mb-2">
                Enter your Staff ID
              </label>
              <input
                type="text"
                required
                pattern="\d*"
                placeholder="Staff ID"
                value={staffIdInput}
                onChange={(e) => setStaffIdInput(e.target.value.replace(/\D/g, ""))}
                className="w-full px-4 py-3 rounded-xl bg-natural-secondary/50 border border-natural-border text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand text-natural-text transition-all"
              />
            </div>

            {/* Notifications */}
            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-natural-secondary text-terracotta text-xs p-3.5 rounded-xl border border-natural-border/60 leading-relaxed"
                >
                  {errorMsg}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3.5 rounded-xl transition-all text-sm cursor-pointer shadow-md shadow-brand/10"
            >
              Unlock Console
            </button>
          </form>

          {/* Auxiliary Button */}
          <div className="mt-6 pt-4 border-t border-natural-border flex justify-between items-center text-xs">
            <button
              onClick={onBackToCustomer}
              className="text-natural-muted hover:text-natural-text font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Customer Shop</span>
            </button>
            <span className="text-natural-muted font-mono text-[10px]">
              {staffIds.length} Registered ID{staffIds.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
