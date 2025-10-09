"use client";
import { FormEvent, useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";
import Link from "next/link";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      location.href = "/";
    } catch (e: any) {
      setError(e?.message ?? "Sign up failed");
    } finally { setBusy(false); }
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Create account</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input required type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full border rounded px-3 py-2"/>
        <input required type="password" placeholder="Password (min 6)" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border rounded px-3 py-2"/>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={busy} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">{busy ? "…" : "Create account"}</button>
      </form>
      <p className="mt-3 text-sm">Have an account? <Link href="/sign-in" className="underline">Sign in</Link></p>
    </main>
  );
}