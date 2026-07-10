import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
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
import {
  getContactReveal,
  getListing,
  getRequestStatus,
  sendContactRequest,
} from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { formatBudget, theme, txnLabel } from "../../src/lib/theme";
import type { ContactReveal, Listing, RequestDetail } from "../../src/lib/types";

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { broker } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [requestId, setRequestId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [reveal, setReveal] = useState<ContactReveal | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        setListing(await getListing(id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load listing");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function onRequest() {
    if (!broker) return;
    setError(null);
    setBusy(true);
    try {
      const summary = await sendContactRequest(id, broker.id);
      setRequestId(summary.id);
      setDetail(await getRequestStatus(summary.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send request");
    } finally {
      setBusy(false);
    }
  }

  const refresh = useCallback(async () => {
    if (!requestId) return;
    setBusy(true);
    setError(null);
    try {
      const d = await getRequestStatus(requestId);
      setDetail(d);
      if (d.status === "approved") setReveal(await getContactReveal(requestId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh");
    } finally {
      setBusy(false);
    }
  }, [requestId]);

  if (loading) return <Loader />;
  if (!listing) {
    return (
      <Screen>
        <ErrorText>{error ?? "Listing not found"}</ErrorText>
      </Screen>
    );
  }

  const isOwn = broker?.id === listing.brokerId;

  return (
    <Screen>
      <View style={styles.row}>
        <Badge>{txnLabel[listing.txn]}</Badge>
        <Text style={styles.budget}>₹ {formatBudget(listing.budget)}</Text>
      </View>
      <Title>{listing.locality}</Title>
      <Subtitle>Pincode {listing.pincode}</Subtitle>
      {listing.specs ? <Subtitle>{listing.specs}</Subtitle> : null}

      {isOwn ? (
        <Card>
          <Subtitle>This is your own listing.</Subtitle>
        </Card>
      ) : reveal ? (
        <Card>
          <Badge>Contact revealed</Badge>
          <Title>{reveal.name}</Title>
          <Button label={`Call ${reveal.phone}`} onPress={() => Linking.openURL(`tel:${reveal.phone}`)} />
        </Card>
      ) : detail ? (
        <Card>
          <Badge tone={detail.status === "approved" ? "accent" : "warn"}>
            {detail.status}
          </Badge>
          {detail.status === "pending" ? (
            <Subtitle>Queue position: {detail.queuePosition}. Awaiting owner approval.</Subtitle>
          ) : null}
          <Button label="Refresh status" variant="ghost" onPress={refresh} loading={busy} />
        </Card>
      ) : (
        <Button label="Request contact" onPress={onRequest} loading={busy} />
      )}

      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  budget: { color: theme.color.accent, fontWeight: "800", fontSize: theme.text.xl },
});
