"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, CircleAlert, CheckCircle2, Eye, EyeOff, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LiquidMetalButton } from "@/components/ui/liquid-metal";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#EA4335"
        d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
      />
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
      />
      <path
        fill="#FBBC05"
        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.3s.7 2.6 1.9 5l3.7-2.5z"
      />
      <path
        fill="#34A853"
        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
      />
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message || "Failed to initiate Google Sign-In.");
        setIsGoogleLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred during Google Sign-In.");
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message || "Failed to create account.");
        setIsLoading(false);
        return;
      }

      if (data.session) {
        // Automatically signed in -> proceed directly to profile setup
        router.push("/profile/setup");
      } else if (data.user && !data.session) {
        // Email verification required by Supabase project settings
        setInfoMessage(
          "Account created! Please check your email to verify your address before logging in."
        );
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-10 px-4 animate-in fade-in duration-300">
      <Card className="border-zinc-800 bg-sangati-glass shadow-2xl rounded-3xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-amber-500/80 via-sky-500/80 to-violet-500/80 w-full" />

        <CardHeader className="space-y-2 text-center pt-8 pb-4">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-zinc-800/80 text-zinc-100 mx-auto border border-zinc-700 shadow-md">
            <Sparkles className="h-6 w-6 text-amber-400" />
          </div>

          <div className="space-y-1">
            <CardTitle className="text-2xl font-extrabold tracking-tight text-zinc-100">
              Join <span className="text-amber-400">Sangati</span>
            </CardTitle>
            <CardDescription className="text-zinc-400 text-xs">
              Where interests meet people. Find your people & create together.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6 space-y-4">
          {error && (
            <Alert variant="destructive" className="rounded-xl bg-rose-950/40 text-rose-300 border-rose-800/40">
              <CircleAlert className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {infoMessage && (
            <Alert variant="success" className="rounded-xl bg-emerald-950/40 text-emerald-300 border-emerald-800/40">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <AlertTitle className="text-emerald-300 font-semibold">Check your inbox</AlertTitle>
              <AlertDescription>{infoMessage}</AlertDescription>
            </Alert>
          )}

          {/* Continue with Google Button */}
          <Button
            type="button"
            variant="outline"
            disabled={isLoading || isGoogleLoading}
            onClick={handleGoogleSignIn}
            className="w-full h-10 rounded-xl border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-100 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
            ) : (
              <GoogleIcon className="h-4 w-4 shrink-0" />
            )}
            <span>Continue with Google</span>
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800/80" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
              <span className="bg-[#0A0A0A] px-2 text-zinc-500">or register with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-zinc-300">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isLoading}
                className="rounded-xl border-zinc-800 bg-zinc-900/60 text-zinc-100 focus-visible:ring-zinc-700 placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-zinc-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={isLoading}
                  className="pr-10 rounded-xl border-zinc-800 bg-zinc-900/60 text-zinc-100 focus-visible:ring-zinc-700 placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-600 rounded-md transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={0}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold text-zinc-300">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  disabled={isLoading}
                  className="pr-10 rounded-xl border-zinc-800 bg-zinc-900/60 text-zinc-100 focus-visible:ring-zinc-700 placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-600 rounded-md transition-colors"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  tabIndex={0}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <LiquidMetalButton
              type="submit"
              disabled={isLoading}
              size="md"
              className="w-full mt-2"
              icon={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
            >
              {isLoading ? "Creating account..." : "Create Account →"}
            </LiquidMetalButton>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-zinc-800/80 py-4 bg-zinc-900/40">
          <p className="text-xs text-zinc-400">
            Already have an account?{" "}
            <Link href="/login" className="text-zinc-100 font-bold hover:underline">
              Log in instead
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
