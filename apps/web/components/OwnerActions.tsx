// apps/web/components/OwnerActions.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// ⬇️ use the auth-aware helper (sends Authorization: Bearer <idToken>)
import { apiDeleteAuth } from "../lib/api";

type Props = {
  productId: string;
  ownerId: string;
};

export default function OwnerActions({ productId, ownerId }: Props) {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const { getAuth, onAuthStateChanged } = await import("firebase/auth");
      const auth = getAuth();
      unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    })();
    return () => unsub();
  }, []);

  // small correctness tweak (avoid relying on truthiness)
  const canManage = uid === ownerId;
  if (!canManage) return null;

  return (
    <div className="flex items-center gap-3">
      <a
        href={`/products/${productId}/edit`}
        className="rounded-lg border px-3 py-2 hover:bg-gray-50"
        title="Edit product"
      >
        Edit
      </a>

      <button
        onClick={async () => {
          if (deleting) return;
          setError(null);
          const ok = window.confirm("Delete this product? This cannot be undone.");
          if (!ok) return;
          try {
            setDeleting(true);
            // ⬇️ auth-required delete
            await apiDeleteAuth<{ ok: boolean }>(`/products/${productId}`);
            router.push("/");
          } catch (e: any) {
            setError(e?.message ?? "Delete failed");
            setDeleting(false);
          }
        }}
        className="rounded-lg border px-3 py-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
        disabled={deleting}
        title="Delete product"
      >
        {deleting ? "Deleting…" : "Delete"}
      </button>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
