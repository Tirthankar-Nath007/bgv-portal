"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
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
    const sessionData = localStorage.getItem('admin_session');
    
    if (!sessionData) {
      router.replace('/admin/login');
      setIsLoading(false);
      return;
    }

    try {
      const session = JSON.parse(sessionData);
      
      // Check if session has a token
      if (!session.token) {
        localStorage.removeItem('admin_session');
        router.replace('/admin/login');
        return;
      }

      // Decode JWT to check expiry
      const payload = decodeJWT(session.token);
      
      if (payload && payload.exp) {
        const currentTime = Date.now() / 1000;
        if (payload.exp < currentTime) {
          // Token expired
          localStorage.removeItem('admin_session');
          router.replace('/admin/login');
          return;
        }
      }

      // Check for isAdmin or userType property for backward compatibility
      const isAdmin = session.userType === 'admin' || session.isAdmin === true || session.role === 'super_admin' || session.role === 'hr_manager';
      
      if (isAdmin) {
        setIsAuthorized(true);
      } else {
        // This case should ideally not happen if login logic is correct
        console.warn("Session found but user is not admin:", session);
        localStorage.removeItem('admin_session');
        router.replace('/admin/login');
        return;
      }
    } catch (error) {
      console.error("Invalid admin session data:", error);
      localStorage.removeItem('admin_session');
      router.replace('/admin/login');
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
              Verifying admin session...
            </p>
            <p className="text-base-content/70">Please wait a moment.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthorized) {
    return <>{children}</>;
  }

  // Return null while redirecting to prevent flashing of unauthorized content
  return null;
}