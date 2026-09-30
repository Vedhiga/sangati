"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api, ApiClientError } from "@/lib/api";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function handleAuthCallback() {
      try {
        // Check for error parameters in query string
        const urlParams = new URLSearchParams(window.location.search);
        const errorDesc = urlParams.get("error_description") || urlParams.get("error");
        if (errorDesc) {
          if (isMounted) setError(errorDesc);
          return;
        }

        // Check for authorization code in query params (PKCE flow)
        const code = urlParams.get("code");
        if (code) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) {
            console.error("OAuth code exchange error:", exchangeErr);
            if (isMounted) setError(exchangeErr.message || "Failed to exchange authorization code.");
            return;
          }
        }

        // Retrieve session established by Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          if (isMounted) setError("Authentication failed or session expired. Please try signing in again.");
          return;
        }

        // Verify profile setup status via FastAPI backend
        try {
          await api.get("/api/v1/profile/me");
          if (isMounted) router.push("/profile");
        } catch (apiErr) {
          if (apiErr instanceof ApiClientError && apiErr.code === "PROFILE_NOT_FOUND") {
            if (isMounted) router.push("/profile/setup");
          } else {
            if (isMounted) router.push("/profile");
          }
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        if (isMounted) setError("An unexpected error occurred during sign-in.");
      }
    }

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-3xl border border-rose-800/40 bg-sangati-glass space-y-4 text-center shadow-2xl">
          <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-zinc-100">Authentication Failed</h2>
          <p className="text-xs text-rose-300 leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-100 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      <p className="text-xs text-zinc-400 font-mono animate-pulse">Completing sign-in with Google...</p>
    </div>
  );
}
