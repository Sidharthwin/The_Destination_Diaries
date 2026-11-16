"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { pill } from "@/components/layout/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface Common {
  configured: boolean;
  devAuth: boolean;
  next: string;
}

function callbackUrl(next: string) {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password do not match. Check them and try again.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox for our message.";
  if (m.includes("already registered")) return "An account with this email already exists. Try signing in instead.";
  if (m.includes("rate limit")) return "Too many attempts. Please wait a minute and try again.";
  return message;
}

function NotConfigured() {
  return (
    <div role="status" className="border border-border bg-paper p-5 text-sm leading-relaxed text-ink-soft">
      <p className="font-semibold text-ink">Sign-in is not connected yet.</p>
      <p className="mt-1">
        Add your Supabase URL and anon key to <code>.env.local</code> to enable accounts — see{" "}
        <code>docs/ENVIRONMENT_SETUP.md</code>.
      </p>
    </div>
  );
}

function DevSignIn({ next }: { next: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const signIn = async (user: string) => {
    setBusy(user);
    const res = await fetch("/api/dev-auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user }),
    });
    if (res.ok) window.location.assign(next);
    else setBusy(null);
  };
  return (
    <div className="mt-8 border border-dashed border-terracotta-deep/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta-deep">Local development only</p>
      <p className="mt-2 text-sm text-ink-soft">Sign in as a test identity. This panel cannot appear in production.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {[["traveller", "Traveller"], ["other", "Second traveller"], ["admin", "Admin"]].map(([key, label]) => (
          <button key={key} type="button" disabled={busy !== null} onClick={() => signIn(key)} className={pill("outline", "sm")}>
            {busy === key ? "Signing in…" : label}
          </button>
        ))}
      </div>
    </div>
  );
}

function GoogleButton({ next, label }: { next: string; label: string }) {
  const [error, setError] = useState<string | null>(null);
  const go = async () => {
    setError(null);
    const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(next) },
    });
    if (error) setError(friendly(error.message));
  };
  return (
    <>
      <button type="button" onClick={go} className={pill("outline", "md", "w-full")}>
        <span aria-hidden className="inline-flex size-5 items-center justify-center rounded-full border border-current font-serif text-xs">G</span>
        {label}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </>
  );
}

const Divider = () => (
  <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-[0.18em] text-ink-soft">
    <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
  </div>
);

export function LoginForm({ configured, devAuth, next, notice }: Common & { notice?: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { error } = await createSupabaseBrowserClient().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setError(friendly(error.message));
      setBusy(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <>
      <h1 className="text-5xl">Welcome back</h1>
      <p className="mt-3 text-ink-soft">Sign in to pick up your plans where you left them.</p>
      {notice && <p role="status" className="mt-5 border-l-2 border-terracotta bg-paper px-4 py-3 text-sm">{notice}</p>}
      <div className="mt-8">
        {configured ? (
          <>
            <GoogleButton next={next} label="Continue with Google" />
            <Divider />
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" className="h-11 bg-paper" />
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-xs font-semibold text-forest underline underline-offset-2">Forgot password?</Link>
                </div>
                <Input id="password" name="password" type="password" required autoComplete="current-password" className="h-11 bg-paper" />
              </div>
              {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
              <button type="submit" disabled={busy} className={pill("primary", "md", "w-full")}>{busy ? "Signing in…" : "Sign in"}</button>
            </form>
          </>
        ) : (
          <NotConfigured />
        )}
        {devAuth && <DevSignIn next={next} />}
      </div>
      <p className="mt-8 text-sm text-ink-soft">
        New here? <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-forest underline underline-offset-2">Create an account</Link>
      </p>
    </>
  );
}

export function SignupForm({ configured, devAuth, next }: Common) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error } = await createSupabaseBrowserClient().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl(next), data: { full_name: String(form.get("name") ?? "") } },
    });
    setBusy(false);
    if (error) {
      setError(friendly(error.message));
      return;
    }
    if (data.session) {
      // Email confirmation is disabled on this project: already signed in.
      router.push(next);
      router.refresh();
    } else setSentTo(email);
  }

  if (sentTo) {
    return (
      <div role="status">
        <h1 className="text-5xl">Check your inbox</h1>
        <p className="mt-4 leading-relaxed text-ink-soft">
          We sent a confirmation link to <strong className="text-ink">{sentTo}</strong>. Open it on this device to finish
          creating your account. It can take a minute to arrive — check spam if you do not see it.
        </p>
        <Link href="/login" className={pill("outline", "md", "mt-8")}>Back to sign in</Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-5xl">Start your diary</h1>
      <p className="mt-3 text-ink-soft">Create a free account to save and edit your trips.</p>
      <div className="mt-8">
        {configured ? (
          <>
            <GoogleButton next={next} label="Sign up with Google" />
            <Divider />
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" name="name" autoComplete="name" className="h-11 bg-paper" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" className="h-11 bg-paper" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" aria-describedby="pw-hint" className="h-11 bg-paper" />
                <p id="pw-hint" className="text-xs text-ink-soft">At least 8 characters.</p>
              </div>
              {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
              <button type="submit" disabled={busy} className={pill("primary", "md", "w-full")}>{busy ? "Creating account…" : "Create account"}</button>
            </form>
          </>
        ) : (
          <NotConfigured />
        )}
        {devAuth && <DevSignIn next={next} />}
      </div>
      <p className="mt-8 text-sm text-ink-soft">
        Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-forest underline underline-offset-2">Sign in</Link>
      </p>
    </>
  );
}

export function ForgotPasswordForm({ configured }: { configured: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const email = String(new FormData(e.currentTarget).get("email"));
    const { error } = await createSupabaseBrowserClient().auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl("/reset-password"),
    });
    setBusy(false);
    if (error) setError(friendly(error.message));
    else setSent(true);
  }

  if (sent) {
    return (
      <div role="status">
        <h1 className="text-5xl">Check your inbox</h1>
        <p className="mt-4 leading-relaxed text-ink-soft">If an account exists for that address, a link to choose a new password is on its way.</p>
        <Link href="/login" className={pill("outline", "md", "mt-8")}>Back to sign in</Link>
      </div>
    );
  }
  return (
    <>
      <h1 className="text-5xl">Reset your password</h1>
      <p className="mt-3 text-ink-soft">Enter your email and we will send you a link to choose a new one.</p>
      <div className="mt-8">
        {configured ? (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" className="h-11 bg-paper" />
            </div>
            {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
            <button type="submit" disabled={busy} className={pill("primary", "md", "w-full")}>{busy ? "Sending…" : "Send reset link"}</button>
          </form>
        ) : (
          <NotConfigured />
        )}
      </div>
      <p className="mt-8 text-sm text-ink-soft">
        Remembered it? <Link href="/login" className="font-semibold text-forest underline underline-offset-2">Sign in</Link>
      </p>
    </>
  );
}

export function ResetPasswordForm({ configured, hasSession }: { configured: boolean; hasSession: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== String(form.get("confirm"))) return setError("The two passwords do not match.");
    setBusy(true);
    setError(null);
    const { error } = await createSupabaseBrowserClient().auth.updateUser({ password });
    if (error) {
      setError(friendly(error.message));
      setBusy(false);
      return;
    }
    router.push("/dashboard?notice=password-updated");
    router.refresh();
  }

  return (
    <>
      <h1 className="text-5xl">Choose a new password</h1>
      <div className="mt-8">
        {!configured ? (
          <NotConfigured />
        ) : !hasSession ? (
          <div role="alert" className="border border-border bg-paper p-5 text-sm leading-relaxed text-ink-soft">
            <p className="font-semibold text-ink">This reset link has expired or was already used.</p>
            <p className="mt-1"><Link href="/forgot-password" className="font-semibold text-forest underline underline-offset-2">Request a new link</Link>.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="h-11 bg-paper" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className="h-11 bg-paper" />
            </div>
            {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
            <button type="submit" disabled={busy} className={pill("primary", "md", "w-full")}>{busy ? "Saving…" : "Save new password"}</button>
          </form>
        )}
      </div>
    </>
  );
}
