import React, { useState } from 'react';
import { 
  KeyRound, 
  ShieldCheck, 
  AlertCircle, 
  X, 
  Loader2, 
  CheckCircle2, 
  Sparkles,
  UserCheck
} from 'lucide-react';
import { apiRedeemTesterCode } from '../lib/api.js';

export default function TesterRedemptionModal({ isOpen, onClose, onSuccess, userEmail = '' }) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  if (!isOpen) return null;

  const handleCodeChange = (e) => {
    // Auto-uppercase and clean whitespace
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setCode(val);
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode) {
      setError('Please enter your invitation code.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await apiRedeemTesterCode(cleanCode);
      if (res && res.success) {
        setSuccessData(res.tester || { activated: true });
        if (onSuccess) {
          onSuccess(res.tester);
        }
      } else {
        const errorMsg = res?.error || 'Invalid invitation code. Please check and try again.';
        setError(errorMsg);
        if (res?.retryAfterSeconds) {
          setCooldownSeconds(res.retryAfterSeconds);
          const interval = setInterval(() => {
            setCooldownSeconds((prev) => {
              if (prev <= 1) {
                clearInterval(interval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to redeem invitation code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#8B0000] via-[#A51D24] to-[#6b0000] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <KeyRound className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-stone-900">
                  MRU ICCF Beta
                </span>
                <span className="text-xs text-white/80">One-Time Access</span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Redeem Tester Invitation
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {successData ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 animate-in zoom-in-50 duration-300" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900">Tester Access Activated!</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Your identity has been verified and registered on the testing roster.
                </p>
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-left text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Student Name:</span>
                  <span className="font-semibold text-stone-900">{successData.fullName || 'Authorized Tester'}</span>
                </div>
                {successData.rollNumber && (
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-medium">Roll Number:</span>
                    <span className="font-semibold text-stone-900">{successData.rollNumber}</span>
                  </div>
                )}
                {successData.department && (
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-medium">Department:</span>
                    <span className="font-semibold text-stone-900">{successData.department}</span>
                  </div>
                )}
                {successData.teamId && (
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-medium">Assigned Team:</span>
                    <span className="font-semibold text-stone-900 font-mono">{successData.teamId}</span>
                  </div>
                )}
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-[#8B0000] hover:bg-[#6b0000] transition-colors shadow-md shadow-[#8B0000]/20"
              >
                Continue to Assessments
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                <p>
                  Each authorized student is provided a <strong>unique one-time cryptographic code</strong> by their team lead or ICCF administrator. Enter it below to unlock testing assessments without repeated email OTPs.
                </p>
              </div>

              {userEmail && (
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <UserCheck className="w-4 h-4 text-stone-600" />
                  <span>Authenticated Account: <strong className="text-gray-800">{userEmail}</strong></span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Invitation Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={code}
                    onChange={handleCodeChange}
                    placeholder="e.g. ICCF-XXXX-XXXX-XXXX-XXXX"
                    disabled={submitting || cooldownSeconds > 0}
                    className="w-full px-4 py-3 text-base font-mono font-semibold tracking-wider text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000] outline-none transition disabled:bg-gray-100 uppercase"
                    autoFocus
                  />
                  <KeyRound className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Invitation codes are single-use, case-insensitive, and strictly bound to your student record.
                </p>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold">Redemption Error: </span>
                    {error}
                  </div>
                </div>
              )}

              {cooldownSeconds > 0 && (
                <div className="text-center text-xs font-semibold text-rose-700">
                  Rate limit reached. Please wait {cooldownSeconds}s before retrying.
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="w-1/3 py-2.5 px-4 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !code.trim() || cooldownSeconds > 0}
                  className="w-2/3 py-2.5 px-4 text-sm font-semibold text-white bg-[#8B0000] hover:bg-[#6b0000] disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl transition shadow-md shadow-[#8B0000]/20 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying Code...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Activate Tester Access
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
