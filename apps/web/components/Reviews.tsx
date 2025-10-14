"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "../lib/api"; // adjust if your api helpers live elsewhere

// If your api helpers are at "../../../lib/api", use that path instead:
/// import { apiGet, apiPost } from "../../lib/api";

type Review = {
  id: string;
  productId: string;
  rating: number;
  text?: string;
  authorId: string;
  createdAt?: any;
};

export default function Reviews({ productId }: { productId: string }) {
  const [signedIn, setSignedIn] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [text, setText] = useState("");

  useEffect(() => {
    (async () => {
      const { getAuth, onAuthStateChanged } = await import("firebase/auth");
      const auth = getAuth();
      return onAuthStateChanged(auth, (u) => setSignedIn(!!u));
    })();
  }, []);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () =>
      apiGet<{ items: Review[]; summary: { avg: number; count: number } }>(
        `/reviews?productId=${encodeURIComponent(productId)}`
      ),
  });

  const createReview = useMutation({
    mutationFn: async () => {
      return apiPost<{ id: string }>("/reviews", { productId, rating, text });
    },
    onSuccess: () => {
      setText("");
      refetch();
    },
  });

  const summary = data?.summary ?? { avg: 0, count: 0 };
  const items = data?.items ?? [];

  return (
    <div className="mt-10 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Reviews</h2>
        <div className="text-sm text-gray-600">
          Avg: <span className="font-medium">{summary.avg.toFixed(1)}</span> / 5 ·{" "}
          <span className="font-medium">{summary.count}</span> ratings
        </div>
      </div>

      {/* Write review */}
      {signedIn ? (
        <form
          className="rounded-lg border p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            createReview.mutate();
          }}
        >
          <div className="flex items-center gap-3">
            <label className="text-sm">Rating</label>
            <select
              className="rounded border px-2 py-1"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="w-full rounded border p-2"
            placeholder="Optional comment (max 500 chars)"
            maxLength={500}
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="submit"
            disabled={createReview.isPending}
            className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
          >
            {createReview.isPending ? "Submitting..." : "Submit review"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-600">Sign in to write a review.</p>
      )}

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-gray-600">Loading reviews...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-600">No reviews yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className="rounded border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">Rating: {r.rating} / 5</div>
                <div className="text-xs text-gray-500">{r.authorId.slice(0, 6)}…</div>
              </div>
              {r.text ? <p className="mt-2 text-sm">{r.text}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
