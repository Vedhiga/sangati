"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CircleAlert, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api, ApiClientError } from "@/lib/api";
import { Profile } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ProfileSetupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [interestsInput, setInterestsInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function checkAuthAndExistingProfile() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      // Check if user already has a profile
      try {
        await api.get<Profile>("/api/v1/profile/me");
        // Profile already exists -> go to profile
        router.replace("/profile");
      } catch (err) {
        // If 404, this is expected for new users completing setup
        setIsCheckingAuth(false);
      }
    }

    checkAuthAndExistingProfile();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanDisplayName = displayName.trim();

    if (!cleanDisplayName) {
      setError("Please enter a display name.");
      return;
    }

    if (!cleanUsername || cleanUsername.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
      setError("Username must only contain letters, numbers, and underscores.");
      return;
    }

    const parsedInterests = interestsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setIsSubmitting(true);

    try {
      await api.post<Profile>("/api/v1/profile", {
        display_name: cleanDisplayName,
        username: cleanUsername,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        interests: parsedInterests.length > 0 ? parsedInterests : undefined,
      });

      router.push("/activity");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to create profile. Please check your details and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        <p className="text-sm text-zinc-400">Preparing your setup...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto py-6 px-4 animate-in fade-in duration-300">
      <Card className="border-zinc-800 bg-sangati-glass shadow-2xl rounded-3xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-amber-500/80 via-sky-500/80 to-violet-500/80 w-full" />
        
        <CardHeader className="text-center space-y-1.5 pt-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-zinc-800 text-zinc-100 mx-auto mb-1 border border-zinc-700 shadow-md">
            <Sparkles className="h-6 w-6 text-amber-400" />
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-zinc-100">
            Welcome to Sangati ✨
          </CardTitle>
          <CardDescription className="text-zinc-400 text-xs">
            Where interests meet people. Tell us a little about yourself — no resume required.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="rounded-xl bg-rose-950/40 text-rose-300 border-rose-800/40">
                <CircleAlert className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="displayName" className="text-xs font-semibold text-zinc-300">Display name</Label>
              <Input
                id="displayName"
                placeholder="e.g. Alex"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={50}
                disabled={isSubmitting}
                className="rounded-xl border-zinc-800 bg-zinc-900/60 text-zinc-100 focus-visible:ring-zinc-700 placeholder:text-zinc-500"
              />
              <p className="text-[11px] text-zinc-500">
                How other community members will see you.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-semibold text-zinc-300">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-semibold text-zinc-500">
                  @
                </span>
                <Input
                  id="username"
                  className="pl-7 rounded-xl border-zinc-800 bg-zinc-900/60 text-zinc-100 focus-visible:ring-zinc-700 placeholder:text-zinc-500"
                  placeholder="alex_builds"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  maxLength={30}
                  disabled={isSubmitting}
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                3-30 letters, numbers, or underscores. Unique to you.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-xs font-semibold text-zinc-300">Bio</Label>
              <Textarea
                id="bio"
                placeholder="What are you currently learning, building, or curious about?"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={500}
                disabled={isSubmitting}
                className="rounded-xl border-zinc-800 bg-zinc-900/60 text-zinc-100 focus-visible:ring-zinc-700 placeholder:text-zinc-500 resize-none text-sm"
              />
              <p className="text-[11px] text-zinc-500">
                Keep it casual and human. Express what you enjoy.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="interests" className="text-xs font-semibold text-zinc-300">Interests (optional)</Label>
              <Input
                id="interests"
                placeholder="e.g. coding, rust, photography, philosophy"
                value={interestsInput}
                onChange={(e) => setInterestsInput(e.target.value)}
                disabled={isSubmitting}
                className="rounded-xl border-zinc-800 bg-zinc-900/60 text-zinc-100 focus-visible:ring-zinc-700 placeholder:text-zinc-500"
              />
              <p className="text-[11px] text-zinc-500">
                Comma-separated topics you care about. Used to suggest like-minded people.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="avatarUrl" className="text-xs font-semibold text-zinc-300">Avatar URL (optional)</Label>
              <Input
                id="avatarUrl"
                type="url"
                placeholder="https://example.com/photo.jpg"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                disabled={isSubmitting}
                className="rounded-xl border-zinc-800 bg-zinc-900/60 text-zinc-100 focus-visible:ring-zinc-700 placeholder:text-zinc-500"
              />
              <p className="text-[11px] text-zinc-500">
                A public link to an image of yourself or avatar illustration.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full mt-2 bg-zinc-100 text-zinc-950 hover:bg-zinc-200 rounded-xl text-xs font-semibold py-2.5 shadow-md transition-all"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up your profile...
                </>
              ) : (
                "Complete Profile →"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
