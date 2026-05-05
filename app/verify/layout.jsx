"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyLayout({ children }) {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Decode JWT payload without verification (client-side safe)
  const decodeJWT = (token) => {
    try {
      const base64Payload = token.split('.')[1];
      const payload = JSON.parse(atob(base64Payload));
      return payload;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const sessionData = localStorage.getItem('verifier_session');
    
    if (!sessionData) {
      router.replace('/login');
      return;
    }

    try {
      const session = JSON.parse(sessionData);
      
      // Check if session has a token
      if (!session.token) {
        localStorage.removeItem('verifier_session');
        router.replace('/login');
        return;
      }

      // Decode JWT to check expiry
      const payload = decodeJWT(session.token);
      
      if (payload && payload.exp) {
        const currentTime = Date.now() / 1000;
        if (payload.exp < currentTime) {
          // Token expired
          localStorage.removeItem('verifier_session');
          router.replace('/login');
          return;
        }
      }

      setIsVerified(true);
    } catch (error) {
      console.error("Invalid verifier session data:", error);
      localStorage.removeItem('verifier_session');
      router.replace('/login');
      return;
    }

    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-250px)]">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center p-10">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="mt-4 text-lg font-semibold text-base-content">
              Verifying your session...
            </p>
            <p className="text-base-content/70">Please wait a moment.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isVerified) {
    return <>{children}</>;
  }

  // Return null while redirecting to prevent flashing of un-authed content
  return null;
}