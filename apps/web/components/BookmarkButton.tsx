"use client";

import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost } from "../lib/api"; // adjust path if needed

export default function BookmarkButton({ productId }: { productId: string }) {
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { getAuth, onAuthStateChanged } = await import("firebase/auth");
      const auth = getAuth();
      return onAuthStateChanged(auth, async (u) => {
        setSignedIn(!!u);
        if (u) {
          try {
            const res = await apiGet<{ bookmarked: boolean; id?: string }>(
              `/bookmarks/status?productId=${encodeURIComponent(productId)}`
            );
            setBookmarkId(res.bookmarked ? res.id ?? null : null);
          } catch {}
        } else {
          setBookmarkId(null);
        }
        setLoading(false);
      });
    })();
  }, [productId]);

  const toggle = async () => {
    if (!signedIn) {
      alert("Please sign in to save this item.");
      return;
    }
    setLoading(true);
    try {
      if (bookmarkId) {
        await apiDelete(`/bookmarks/${bookmarkId}`);
        setBookmarkId(null);
      } else {
        const res = await apiPost<{ id: string }>("/bookmarks", { productId });
        setBookmarkId(res.id);
      }
    } catch (e: any) {
      alert(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`w-full rounded-lg border px-4 py-2 ${bookmarkId ? "bg-yellow-50" : ""}`}
      title={bookmarkId ? "Saved" : "Save to bookmarks"}
    >
      {bookmarkId ? "★ Saved" : "☆ Save"}
    </button>
  );
}
