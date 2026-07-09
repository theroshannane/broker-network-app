"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  ApiError,
  clearToken,
  createBroker,
  getMe,
  getToken,
  requestOtp as apiRequestOtp,
  setToken,
  verifyOtp as apiVerifyOtp,
  type CreateBrokerInput,
} from "./api";
import type { Broker } from "./types";

const PHONE_KEY = "broker_network_phone";

interface AuthState {
  phone: string | null;
  broker: Broker | null;
  loading: boolean;
  isAuthenticated: boolean;
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<{ hasBroker: boolean }>;
  register: (input: CreateBrokerInput) => Promise<void>;
  logout: () => void;
  refreshBroker: () => Promise<boolean>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [phone, setPhone] = useState<string | null>(null);
  const [broker, setBroker] = useState<Broker | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshBroker(): Promise<boolean> {
    try {
      const me = await getMe();
      setBroker(me);
      return true;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
        setBroker(null);
        return false;
      }
      throw err;
    }
  }

  useEffect(() => {
    const token = getToken();
    const storedPhone = window.localStorage.getItem(PHONE_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    setPhone(storedPhone);
    refreshBroker().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function requestOtp(phoneNumber: string) {
    await apiRequestOtp(phoneNumber);
  }

  async function verifyOtp(phoneNumber: string, code: string) {
    const { token } = await apiVerifyOtp(phoneNumber, code);
    setToken(token);
    window.localStorage.setItem(PHONE_KEY, phoneNumber);
    setPhone(phoneNumber);
    const hasBroker = await refreshBroker();
    return { hasBroker };
  }

  async function register(input: CreateBrokerInput) {
    const created = await createBroker(input);
    setBroker(created);
  }

  function logout() {
    clearToken();
    window.localStorage.removeItem(PHONE_KEY);
    setPhone(null);
    setBroker(null);
  }

  return (
    <AuthContext.Provider
      value={{
        phone,
        broker,
        loading,
        isAuthenticated: phone !== null,
        requestOtp,
        verifyOtp,
        register,
        logout,
        refreshBroker,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
