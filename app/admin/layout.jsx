"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSessionChecker } from '@/lib/hooks/useInactivityTimeout';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  useSessionChecker();

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
    // For login page, just render (no auth check needed)
    if (pathname === '/admin/login') {
      // If already logged in with valid session, redirect to dashboard
      const sessionData = localStorage.getItem('admin_session');
      if (sessionData) {
        try {
          const session = JSON.parse(sessionData);
          if (session.token) {
            const payload = decodeJWT(session.token);
            if (payload && payload.exp && payload.exp > Date.now() / 1000) {
              const isAdmin = session.userType === 'admin' || session.isAdmin === true || session.role === 'super_admin' || session.role === 'hr_manager';
              if (isAdmin) {
                router.replace('/admin/dashboard');
                return;
              }
            }
          }
        } catch (e) {
          // Invalid session, stay on login page
        }
      }
      setIsLoading(false);
      return;
    }

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
  }, [router, pathname]);

  // For login page, always render children
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

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