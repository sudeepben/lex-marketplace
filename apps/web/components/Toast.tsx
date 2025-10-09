"use client";

import { useEffect, useState } from "react";

export default function Toast({
  message,
  duration = 3000,
}: { message: string; duration?: number }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => setOpen(false), duration);
    return () => clearTimeout(id);
  }, [open, duration]);

  if (!open) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] pointer-events-auto">
      <div className="rounded-xl border bg-white shadow-xl px-4 py-3">
        <div className="font-medium">Success</div>
        <div className="text-sm text-gray-600">{message}</div>
        <button
          onClick={() => setOpen(false)}
          className="mt-2 text-xs text-gray-500 underline"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
