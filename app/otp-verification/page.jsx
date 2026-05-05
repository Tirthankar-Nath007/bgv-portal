"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Icon from '@/components/Icon';
import Toast from '@/components/ui/Toast';
import { initializeActivityTracking } from '@/lib/hooks/useInactivityTimeout';

export default function OtpVerificationPage() {
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "", show: false });
  const router = useRouter();

  useEffect(() => {
    // Get email from sessionStorage
    const storedEmail = sessionStorage.getItem("otp_email");
    if (!storedEmail) {
      // No email found, redirect to login
      router.push("/login");
      return;
    }
    setEmail(storedEmail);
  }, [router]);

  const showToast = (message, type) => {
    setToast({ message, type, show: true });
  };

  const closeToast = () => {
    setToast({ ...toast, show: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!otp || otp.length !== 5) {
      showToast("Please enter a valid 5-digit OTP.", "error");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/verify-login-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (data.success) {
        // Store session for UI state with proper format
        const sessionData = {
          ...data.data.verifier,
          token: data.data.token,
          userType: "verifier",
          loginTime: Date.now() // Store login timestamp for 10-minute timeout
        };

        localStorage.setItem("verifier_session", JSON.stringify(sessionData));

        // Clear temporary OTP email from sessionStorage
        sessionStorage.removeItem("otp_email");

        // Initialize activity tracking for session timeout
        initializeActivityTracking();

        // Dispatch event to notify other components like Header
        window.dispatchEvent(new Event("local-storage-changed"));

        showToast("Login successful! Redirecting...", "success");
        setTimeout(() => {
          router.push("/verify");
        }, 1500);
      } else {
        showToast(data.message || "Invalid OTP. Please try again.", "error");
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      showToast("An unexpected error occurred. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = () => {
    showToast("OTP resend is not available in this version. Use OTP: 12345", "info");
  };

  const handleBackToLogin = () => {
    sessionStorage.removeItem("otp_email");
    router.push("/login");
  };

  return (
    <motion.div
      className="flex items-center justify-center min-h-[calc(100vh-100px)] py-12 px-4 sm:px-6 lg:px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {toast.show && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
      <div className="w-full max-w-md space-y-8">
        <div className="card bg-base-100 shadow-2xl transition-shadow duration-300 hover:shadow-primary/20">
          <div className="card-body p-8 sm:p-10">
            <div className="text-center mb-6">
              <div className="inline-block bg-primary/10 p-4 rounded-full">
                <Icon name="ShieldCheck" className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mt-4 text-base-content">
                OTP Verification
              </h1>
              <p className="text-base-content/70 mt-2">
                Enter the OTP sent to your email
              </p>
              <p className="text-sm text-base-content/50 mt-1">
                {email}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">OTP Code</span>
                </label>
                <div className="relative">
                  <Icon name="Key" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
                  <input
                    type="text"
                    placeholder="12345"
                    className="input input-bordered w-full pl-10 text-center tracking-widest text-lg"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    disabled={isLoading}
                    maxLength={5}
                    required
                  />
                </div>
                <label className="label">
                  <span className="label-text-alt text-base-content/50">
                    Hint: Use "12345" as the OTP (placeholder)
                  </span>
                </label>
              </div>

              <div className="form-control mt-6 space-y-3">
                <button
                  type="submit"
                  className="btn w-full"
                  style={{ backgroundColor: '#007A3D', borderColor: '#007A3D', color: 'white', fontFamily: "'Montserrat', sans-serif" }}
                  disabled={isLoading}
                >
                  {isLoading ? <span className="loading loading-spinner"></span> : "Verify OTP"}
                </button>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                >
                  Resend OTP
                </button>

                <button
                  type="button"
                  className="btn btn-link btn-sm"
                  onClick={handleBackToLogin}
                  disabled={isLoading}
                >
                  <Icon name="ArrowLeft" className="w-4 h-4 mr-1" />
                  Back to Login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
