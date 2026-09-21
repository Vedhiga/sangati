"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, CircleAlert, Eye, EyeOff, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api, ApiClientError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LiquidMetalButton } from "@/components/ui/liquid-metal";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message || "Invalid email or password.");
        setIsLoading(false);
        return;
      }

      if (data.session) {
        // Check if user already completed profile setup via FastAPI
        try {
          await api.get("/api/v1/profile/me");
          router.push("/profile");
        } catch (apiErr) {
          if (apiErr instanceof ApiClientError && apiErr.code === "PROFILE_NOT_FOUND") {
            router.push("/profile/setup");
          } else {
            // Default to profile page
            router.push("/profile");
          }
        }
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
              Welcome back to <span className="text-amber-400">Sangati</span>
            </CardTitle>
            <CardDescription className="text-zinc-400 text-xs">
              Where interests meet people. Log in to continue your journey.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="rounded-xl bg-rose-950/40 text-rose-300 border-rose-800/40">
                <CircleAlert className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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

            <LiquidMetalButton
              type="submit"
              disabled={isLoading}
              size="md"
              className="w-full mt-2"
              icon={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
            >
              {isLoading ? "Logging in..." : "Log in to Sangati →"}
            </LiquidMetalButton>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-zinc-800/80 py-4 bg-zinc-900/40">
          <p className="text-xs text-zinc-400">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-zinc-100 font-bold hover:underline">
              Create one now
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
