const KEY = "broker_network_sent_requests";

export function getSentRequestIds(): string[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export function addSentRequestId(id: string): void {
  const ids = getSentRequestIds();
  if (!ids.includes(id)) {
    window.localStorage.setItem(KEY, JSON.stringify([...ids, id]));
  }
}
