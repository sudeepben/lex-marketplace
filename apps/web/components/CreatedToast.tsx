"use client";

import { useSearchParams } from "next/navigation";
import Toast from "./Toast";

export default function CreatedToast() {
  const sp = useSearchParams();
  const created = sp.get("created");

  // debug line so we know the client component mounted
  if (typeof window !== "undefined") {
    console.debug("[CreatedToast] search:", window.location.search, "created=", created);
  }

  if (created !== "1") return null;
  return <Toast message="Your product was created." duration={4000} />;
}
