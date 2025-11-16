"use client";
import Link from "next/link";
import { useAuth } from "../lib/auth";

export default function Header() {
  const { user, loading, signOutNow } = useAuth();
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b">
      <Link href="/" className="font-semibold">Lex Marketplace</Link>
      <div className="text-sm">
        {loading ? "…" : user ? (
          // --- TARGET LOCATION: The 'Signed-in UI' Block ---
          <div className="flex items-center gap-3">
            
            {/* 1. ADD THE "SELL" LINK HERE */}
            <Link 
              href="/products/new" 
              className="rounded-lg border px-3 py-2 hover:bg-gray-50"
            >
              Sell
            </Link>

            <Link 
              href="/my/listings" 
              className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
            >
              My listings
            </Link>

            <Link 
              href="/my/bookmarks" 
              className="rounded-lg border px-3 py-1 hover:bg-gray-50"
            >
              My bookmarks
            </Link>

            <Link 
              href="/offers" 
              className="rounded-lg border px-3 py-1 hover:bg-gray-50"
            >
              Offers
            </Link>

            
            {/* 2. Existing User Email */}
            <span className="opacity-80">{user.email}</span>
            
            {/* 3. Existing Sign Out Button */}
            <button onClick={signOutNow} className="px-3 py-1 border rounded">Sign out</button>
            
          </div>
        ) : (
          // --- The 'Logged-out UI' Block (Unchanged) ---
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="underline">Sign in</Link>
            <Link href="/sign-up" className="underline">Sign up</Link>
          </div>
        )}
      </div>
    </header>
  );
}