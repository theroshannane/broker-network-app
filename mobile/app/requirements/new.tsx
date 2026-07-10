import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Badge,
  Button,
  Card,
  ErrorText,
  Field,
  Screen,
  Subtitle,
  Title,
} from "../../src/components/ui";
import { createRequirement, getSmartMatch } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { formatBudget, theme, txnLabel } from "../../src/lib/theme";
import type { ScoredListing, Txn } from "../../src/lib/types";

const TXNS: Txn[] = ["sell", "buy", "rent"];

export default function NewRequirement() {
  const { broker } = useAuth();
  const router = useRouter();

  const [txn, setTxn] = useState<Txn>("buy");
  const [locality, setLocality] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [specs, setSpecs] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<ScoredListing[] | null>(null);

  async function onSubmit() {
    if (!broker) return;
    const budgetNum = Number(maxBudget);
    if (!locality.trim() || !Number.isFinite(budgetNum) || budgetNum <= 0) {
      setError("Fill locality and a valid max budget.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const req = await createRequirement({
        brokerId: broker.id,
        txn,
        locality: locality.trim(),
        maxBudget: budgetNum,
        specs: specs.trim() || undefined,
      });
      setMatches(await getSmartMatch(req.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save requirement");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>New requirement</Title>
      <Subtitle>We save it and alert you on new matches. Smart-match runs instantly.</Subtitle>

      <Subtitle>Transaction type</Subtitle>
      <View style={styles.chips}>
        {TXNS.map((t) => (
          <View key={t} style={styles.chipItem}>
            <Button
              label={txnLabel[t]}
              variant={txn === t ? "primary" : "ghost"}
              onPress={() => setTxn(t)}
            />
          </View>
        ))}
      </View>

      <Field label="Locality" value={locality} onChangeText={setLocality} placeholder="Andheri West" />
      <Field label="Max budget (₹)" value={maxBudget} onChangeText={setMaxBudget} keyboardType="number-pad" placeholder="30000000" />
      <Field label="Specs (optional)" value={specs} onChangeText={setSpecs} placeholder="sea view, high floor" />

      <Button label="Save & smart-match" onPress={onSubmit} loading={busy} />
      <ErrorText>{error}</ErrorText>

      {matches ? (
        matches.length === 0 ? (
          <Subtitle>No matching listings yet. We will alert you when one appears.</Subtitle>
        ) : (
          <>
            <Title>Top matches</Title>
            {matches.map((m) => (
              <Card key={m.listing.id} onPress={() => router.push(`/listings/${m.listing.id}`)}>
                <View style={styles.row}>
                  <Badge>{txnLabel[m.listing.txn]}</Badge>
                  <Text style={styles.score}>{Math.round(m.score * 100)}% match</Text>
                </View>
                <Title>{m.listing.locality}</Title>
                <Subtitle>
                  ₹ {formatBudget(m.listing.budget)}
                  {m.listing.specs ? ` · ${m.listing.specs}` : ""}
                </Subtitle>
              </Card>
            ))}
          </>
        )
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", gap: 8 },
  chipItem: { flex: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  score: { color: theme.color.accent, fontWeight: "800" },
});
