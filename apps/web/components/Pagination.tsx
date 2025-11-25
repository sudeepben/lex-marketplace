"use client";

import { useSearchParams, useRouter } from "next/navigation";

type Props = {
  page: number;
  pageSize: number;
  total: number;
};

export default function Pagination({ page, pageSize, total }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function go(nextPage: number) {
    const p = new URLSearchParams(sp.toString());
    p.set("page", String(Math.max(1, Math.min(totalPages, nextPage))));
    router.push(`/?${p.toString()}`);
  }

  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      <button
        className="rounded-lg border px-3 py-2 disabled:opacity-50"
        onClick={() => go(page - 1)}
        disabled={page <= 1}
      >
        Previous
      </button>
      <span className="text-sm text-gray-600">
        Page {page} of {totalPages}
      </span>
      <button
        className="rounded-lg border px-3 py-2 disabled:opacity-50"
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
      >
        Next
      </button>
    </div>
  );
}
