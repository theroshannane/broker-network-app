import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Badge,
  Card,
  ErrorText,
  Loader,
  Screen,
  Subtitle,
  Title,
} from "../src/components/ui";
import { getAlerts } from "../src/lib/api";
import { useAuth } from "../src/lib/auth";
import { formatBudget, theme, txnLabel } from "../src/lib/theme";
import type { Alert } from "../src/lib/types";

export default function Alerts() {
  const { broker } = useAuth();
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!broker) return;
    setError(null);
    setLoading(true);
    try {
      setAlerts(await getAlerts(broker.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load alerts");
    } finally {
      setLoading(false);
    }
  }, [broker]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loader />;

  return (
    <Screen>
      <Title>Your alerts</Title>
      <Subtitle>New listings matching your saved requirements.</Subtitle>
      <ErrorText>{error}</ErrorText>

      {alerts.length === 0 ? (
        <Subtitle>No alerts yet. Add a requirement to start matching.</Subtitle>
      ) : (
        alerts.map((a) => (
          <Card key={a.id} onPress={() => router.push(`/listings/${a.listing.id}`)}>
            <View style={styles.row}>
              <Badge>{txnLabel[a.listing.txn]}</Badge>
              <Text style={styles.budget}>₹ {formatBudget(a.listing.budget)}</Text>
            </View>
            <Title>{a.listing.locality}</Title>
            <Subtitle>
              {a.listing.pincode}
              {a.listing.specs ? ` · ${a.listing.specs}` : ""}
            </Subtitle>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  budget: { color: theme.color.accent, fontWeight: "800", fontSize: theme.text.lg },
});
