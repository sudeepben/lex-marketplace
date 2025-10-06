"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [status, setStatus] = useState<string>("loading…");

  useEffect(() => {
    const url = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000") + "/health";
    fetch(url)
      .then(r => r.json())
      .then(d => setStatus(d.status ?? "unknown"))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Lex Marketplace</h1>
      <p className="mt-2 opacity-80">Your Next.js app is running 🎉</p>
      <p className="mt-4">API status: <span className="font-mono">{status}</span></p>
    </main>
  );
}