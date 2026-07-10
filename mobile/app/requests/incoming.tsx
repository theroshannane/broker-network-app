import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Badge,
  Button,
  Card,
  ErrorText,
  Loader,
  Screen,
  Subtitle,
  Title,
} from "../../src/components/ui";
import { approveRequest, getIncomingRequests } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import type { IncomingRequest } from "../../src/lib/types";

export default function Incoming() {
  const { broker } = useAuth();
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!broker) return;
    setError(null);
    setLoading(true);
    try {
      setRequests(await getIncomingRequests(broker.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load requests");
    } finally {
      setLoading(false);
    }
  }, [broker]);

  useEffect(() => {
    load();
  }, [load]);

  async function onApprove(id: string) {
    setApprovingId(id);
    setError(null);
    try {
      await approveRequest(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve");
    } finally {
      setApprovingId(null);
    }
  }

  if (loading) return <Loader />;

  return (
    <Screen>
      <Title>Incoming requests</Title>
      <Subtitle>Brokers asking to co-broke on your listings.</Subtitle>
      <ErrorText>{error}</ErrorText>

      {requests.length === 0 ? (
        <Subtitle>No incoming requests.</Subtitle>
      ) : (
        requests.map((r) => (
          <Card key={r.id}>
            <View style={styles.row}>
              <Badge tone={r.status === "approved" ? "accent" : r.status === "expired" ? "muted" : "warn"}>
                {r.status}
              </Badge>
              <Subtitle>SLA {new Date(r.slaExpiresAt).toLocaleString()}</Subtitle>
            </View>
            <Subtitle>Requester: {r.requesterId}</Subtitle>
            {r.status === "pending" ? (
              <Button
                label="Approve & reveal contact"
                onPress={() => onApprove(r.id)}
                loading={approvingId === r.id}
              />
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
