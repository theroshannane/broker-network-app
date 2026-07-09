"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

export function Nav() {
  const { isAuthenticated, broker, logout } = useAuth();

  return (
    <header className="border-b border-gray-200">
      <nav className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold">
          Broker Network
        </Link>
        {isAuthenticated ? (
          <div className="flex items-center gap-4 text-sm">
            <Link href="/listings">Listings</Link>
            <Link href="/listings/new">Post</Link>
            <Link href="/requests">Sent</Link>
            <Link href="/requests/incoming">Incoming</Link>
            <span className="text-gray-500">{broker?.name ?? "..."}</span>
            <button onClick={logout} className="text-red-600">
              Log out
            </button>
          </div>
        ) : (
          <Link href="/login" className="text-sm">
            Log in
          </Link>
        )}
      </nav>
    </header>
  );
}
