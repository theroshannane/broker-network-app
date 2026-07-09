"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

type Step = "phone" | "code" | "register";

export default function LoginPage() {
  const router = useRouter();
  const { requestOtp, verifyOtp, register } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [reraId, setReraId] = useState("");
  const [pan, setPan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await requestOtp(phone);
      setStep("code");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "failed to request code");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { hasBroker } = await verifyOtp(phone, code);
      if (hasBroker) {
        router.replace("/listings");
      } else {
        setStep("register");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "invalid or expired code");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register({
        phone,
        name,
        agencyName: agencyName || undefined,
        reraId: reraId || undefined,
        pan: pan || undefined,
      });
      router.replace("/listings");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "failed to create profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Log in</h1>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {step === "phone" && (
        <form onSubmit={handleRequestOtp} className="flex flex-col gap-3">
          <label className="text-sm">
            Phone number
            <input
              type="tel"
              required
              minLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
          >
            Send code
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
          <p className="text-sm text-gray-600">Enter the code sent to {phone}</p>
          <label className="text-sm">
            Code
            <input
              type="text"
              required
              minLength={6}
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
          >
            Verify
          </button>
        </form>
      )}

      {step === "register" && (
        <form onSubmit={handleRegister} className="flex flex-col gap-3">
          <p className="text-sm text-gray-600">Set up your broker profile</p>
          <label className="text-sm">
            Full name
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
            />
          </label>
          <label className="text-sm">
            Agency name (optional)
            <input
              type="text"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
            />
          </label>
          <label className="text-sm">
            RERA ID (optional)
            <input
              type="text"
              value={reraId}
              onChange={(e) => setReraId(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
            />
          </label>
          <label className="text-sm">
            PAN (optional)
            <input
              type="text"
              value={pan}
              onChange={(e) => setPan(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
          >
            Create profile
          </button>
        </form>
      )}
    </div>
  );
}
