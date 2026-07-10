import * as SecureStore from "expo-secure-store";

// SecureStore keys must be alphanumeric plus ".", "-", "_".
const TOKEN_KEY = "broker_network_token";
const PHONE_KEY = "broker_network_phone";

export function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export function setToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}

export function clearToken(): Promise<void> {
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function getStoredPhone(): Promise<string | null> {
  return SecureStore.getItemAsync(PHONE_KEY);
}

export function setStoredPhone(phone: string): Promise<void> {
  return SecureStore.setItemAsync(PHONE_KEY, phone);
}

export function clearStoredPhone(): Promise<void> {
  return SecureStore.deleteItemAsync(PHONE_KEY);
}
