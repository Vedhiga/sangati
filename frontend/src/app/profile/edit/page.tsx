"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, CircleAlert, CheckCircle2, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api, ApiClientError } from "@/lib/api";
import { Profile } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LiquidMetalButton } from "@/components/ui/liquid-metal";

export default function EditProfilePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [interestsInput, setInterestsInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchCurrentProfile() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      try {
        const profile = await api.get<Profile>("/api/v1/profile/me");
        setDisplayName(profile.display_name);
        setUsername(profile.username);
        setBio(profile.bio || "");
        setAvatarUrl(profile.avatar_url || "");
        setInterestsInput((profile.interests || []).join(", "));
      } catch (err) {
        if (err instanceof ApiClientError && err.code === "PROFILE_NOT_FOUND") {
          router.replace("/profile/setup");
          return;
        }
        setError("Failed to load your profile.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchCurrentProfile();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const cleanUsername = username.trim().toLowerCase();
    const cleanDisplayName = displayName.trim();

    if (!cleanDisplayName) {
      setError("Display name cannot be empty.");
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

    setIsSaving(true);

    try {
      await api.put<Profile>("/api/v1/profile/me", {
        display_name: cleanDisplayName,
        username: cleanUsername,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        interests: parsedInterests,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/profile");
      }, 1000);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to update profile. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        <p className="text-sm text-zinc-400">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto py-6 px-4 animate-in fade-in duration-300">
      <Card className="border-zinc-800 bg-sangati-glass shadow-2xl rounded-3xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-amber-500/80 via-sky-500/80 to-violet-500/80 w-full" />
        
        <CardHeader className="space-y-1 pt-6">
          <div className="flex items-center gap-2">
            <Link href="/profile">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <CardTitle className="text-2xl font-extrabold tracking-tight text-zinc-100">Edit Profile</CardTitle>
          </div>
          <CardDescription className="text-zinc-400 pl-10 text-xs">
            Update your identity, bio, and interests on Sangati.
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

            {success && (
              <Alert variant="success" className="rounded-xl bg-emerald-950/40 text-emerald-300 border-emerald-800/40">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <AlertDescription>Profile updated successfully! Redirecting...</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="displayName" className="text-xs font-semibold text-zinc-300">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={50}
                disabled={isSaving}
                className="rounded-xl border-zinc-800 bg-zinc-900/60 text-zinc-100 focus-visible:ring-zinc-700"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-semibold text-zinc-300">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-semibold text-zinc-500">@</span>
                <Input
                  id="username"
                  className="pl-7 rounded-xl border-zinc-800 bg-zinc-900/60 text-zinc-100 focus-visible:ring-zinc-700"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  maxLength={30}
                  disabled={isSaving}
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                3-30 letters, numbers, or underscores.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-xs font-semibold text-zinc-300">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={500}
                disabled={isSaving}
                className="rounded-xl border-zinc-800 bg-zinc-900/60 text-zinc-100 focus-visible:ring-zinc-700 resize-none text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="interests" className="text-xs font-semibold text-zinc-300">Interests</Label>
              <Input
                id="interests"
                placeholder="e.g. coding, rust, photography, philosophy"
                value={interestsInput}
                onChange={(e) => setInterestsInput(e.target.value)}
                disabled={isSaving}
                className="rounded-xl border-zinc-800 bg-zinc-900/60 text-zinc-100 focus-visible:ring-zinc-700 placeholder:text-zinc-500"
              />
              <p className="text-[11px] text-zinc-500">
                Comma-separated topics you care about. Helps others find you.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="avatarUrl" className="text-xs font-semibold text-zinc-300">Avatar URL</Label>
              <Input
                id="avatarUrl"
                type="url"
                placeholder="https://example.com/photo.jpg"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                disabled={isSaving}
                className="rounded-xl border-zinc-800 bg-zinc-900/60 text-zinc-100 focus-visible:ring-zinc-700 placeholder:text-zinc-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/80">
              <Link href="/profile">
                <Button variant="ghost" type="button" disabled={isSaving} className="rounded-xl text-xs text-zinc-400 hover:text-zinc-200">
                  Cancel
                </Button>
              </Link>
              <LiquidMetalButton
                type="submit"
                disabled={isSaving}
                size="sm"
                icon={isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : undefined}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </LiquidMetalButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
