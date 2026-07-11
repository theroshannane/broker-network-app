import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  ApiError,
  createBroker,
  getMe,
  requestOtp as apiRequestOtp,
  verifyOtp as apiVerifyOtp,
  type CreateBrokerInput,
} from "./api";
import {
  clearStoredPhone,
  clearToken,
  getStoredPhone,
  getToken,
  setStoredPhone,
  setToken,
} from "./token";
import type { Broker } from "./types";

interface AuthState {
  phone: string | null;
  broker: Broker | null;
  loading: boolean;
  isAuthenticated: boolean;
  requestOtp: (phone: string, email?: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<{ hasBroker: boolean }>;
  register: (input: CreateBrokerInput) => Promise<void>;
  logout: () => Promise<void>;
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
    let active = true;
    (async () => {
      const token = await getToken();
      const storedPhone = await getStoredPhone();
      if (!active) return;
      if (!token) {
        setLoading(false);
        return;
      }
      setPhone(storedPhone);
      try {
        await refreshBroker();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function requestOtp(phoneNumber: string, email?: string) {
    await apiRequestOtp(phoneNumber, email);
  }

  async function verifyOtp(phoneNumber: string, code: string) {
    const { token } = await apiVerifyOtp(phoneNumber, code);
    await setToken(token);
    await setStoredPhone(phoneNumber);
    setPhone(phoneNumber);
    const hasBroker = await refreshBroker();
    return { hasBroker };
  }

  async function register(input: CreateBrokerInput) {
    const created = await createBroker(input);
    setBroker(created);
  }

  async function logout() {
    await clearToken();
    await clearStoredPhone();
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
