"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiPostAuth } from "../../../../lib/api";

export default function MakeOfferPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = params.id;

  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const { getAuth, onAuthStateChanged } = await import("firebase/auth");
      const auth = getAuth();
      unsub = onAuthStateChanged(auth, (u) => setSignedIn(!!u));
    })();
    return () => unsub();
  }, []);

  if (signedIn === false) {
    // bounce to sign-in, then back here
    if (typeof window !== "undefined") {
      router.push(`/sign-in?next=/products/${productId}/offer`);
    }
    return null;
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Make an Offer</h1>

      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          try {
            setSubmitting(true);
            await apiPostAuth<{ id: string }>("/offers", {
              productId,
              amount,
              message,
            });
            router.push("/offers?tab=sent&created=1");
          } catch (e: any) {
            setErr(e?.message ?? "Failed to submit offer");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div>
          <label className="block text-sm mb-1">Your price (USD)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-full rounded-lg border px-3 py-2"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Message (optional)</label>
          <textarea
            className="w-full rounded-lg border px-3 py-2"
            rows={4}
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Any details you'd like to add…"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? "Sending…" : "Send offer"}
          </button>
          <a href={`/products/${productId}`} className="rounded-lg border px-4 py-2 hover:bg-gray-50">
            Cancel
          </a>
        </div>

        {err ? <p className="text-sm text-red-600">{err}</p> : null}
      </form>
    </div>
  );
}
