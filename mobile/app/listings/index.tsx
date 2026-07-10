import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, ErrorText, Field, Screen, Subtitle, Title } from "../../src/components/ui";
import { searchListings } from "../../src/lib/api";
import { formatBudget, theme, txnLabel } from "../../src/lib/theme";
import type { Listing, Txn } from "../../src/lib/types";

const TXNS: Txn[] = ["sell", "buy", "rent"];

export default function Listings() {
  const router = useRouter();
  const [locality, setLocality] = useState("");
  const [txn, setTxn] = useState<Txn | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const results = await searchListings({
        locality: locality.trim() || undefined,
        txn: txn ?? undefined,
        limit: 50,
      });
      setListings(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load listings");
    } finally {
      setLoading(false);
    }
  }, [locality, txn]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <Field
        label="Locality"
        value={locality}
        onChangeText={setLocality}
        placeholder="e.g. Andheri West"
        onSubmitEditing={load}
        returnKeyType="search"
      />
      <View style={styles.chips}>
        <Pressable
          onPress={() => setTxn(null)}
          style={[styles.chip, txn === null && styles.chipActive]}
        >
          <Text style={[styles.chipText, txn === null && styles.chipTextActive]}>All</Text>
        </Pressable>
        {TXNS.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTxn(t)}
            style={[styles.chip, txn === t && styles.chipActive]}
          >
            <Text style={[styles.chipText, txn === t && styles.chipTextActive]}>
              {txnLabel[t]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Button label="Search" onPress={load} loading={loading} />
      <ErrorText>{error}</ErrorText>

      {!loading && listings.length === 0 ? (
        <Subtitle>No listings found. Try a different locality.</Subtitle>
      ) : null}

      {listings.map((l) => (
        <Card key={l.id} onPress={() => router.push(`/listings/${l.id}`)}>
          <View style={styles.row}>
            <Badge>{txnLabel[l.txn]}</Badge>
            <Text style={styles.budget}>₹ {formatBudget(l.budget)}</Text>
          </View>
          <Title>{l.locality}</Title>
          <Subtitle>
            {l.pincode}
            {l.specs ? ` · ${l.specs}` : ""}
          </Subtitle>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: 999,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs,
  },
  chipActive: { backgroundColor: theme.color.accent, borderColor: theme.color.accent },
  chipText: { color: theme.color.textMuted, fontWeight: "600" },
  chipTextActive: { color: theme.color.accentText },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  budget: { color: theme.color.accent, fontWeight: "800", fontSize: theme.text.lg },
});
