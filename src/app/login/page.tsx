"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

function friendly(code: string) {
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Incorrect email or password.";
  if (code.includes("email-already-in-use")) return "That email already has an account. Sign in instead.";
  if (code.includes("weak-password")) return "Use a password of at least 6 characters.";
  if (code.includes("invalid-email")) return "Enter a valid email address.";
  if (code.includes("popup-closed")) return "Google sign-in was cancelled.";
  return "Could not sign in. Check your connection and try again.";
}

export default function Login() {
  const { user } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      if (mode === "in") await signInWithEmailAndPassword(auth, email, pw);
      else await createUserWithEmailAndPassword(auth, email, pw);
    } catch (err: any) {
      setMsg(friendly(String(err?.code || "")));
    }
    setBusy(false);
  }

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4">
      <div className="card w-full max-w-sm space-y-4">
        <h1 className="font-heading text-2xl font-semibold text-navy">{mode === "in" ? "Welcome back" : "Create your account"}</h1>
        <form onSubmit={submit} className="space-y-3">
          <div><label className="label" htmlFor="e">Email</label><input id="e" className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
          <div><label className="label" htmlFor="p">Password</label><input id="p" className="field" type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} /></div>
          {msg && <p className="text-sm text-red-700" role="alert">{msg}</p>}
          <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Please wait..." : mode === "in" ? "Sign in" : "Sign up"}</button>
        </form>
        <button className="btn btn-ghost w-full" onClick={() => signInWithPopup(auth, new GoogleAuthProvider()).catch((e) => setMsg(friendly(String(e?.code || ""))))}>Continue with Google</button>
        <div className="flex justify-between text-sm">
          <button className="text-navy underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? "New here? Sign up" : "Have an account? Sign in"}</button>
          {mode === "in" && (
            <button className="text-navy underline" onClick={() => email ? sendPasswordResetEmail(auth, email).then(() => setMsg("Password reset email sent.")).catch(() => setMsg("Could not send reset email.")) : setMsg("Enter your email first.")}>Forgot password?</button>
          )}
        </div>
      </div>
    </div>
  );
}
