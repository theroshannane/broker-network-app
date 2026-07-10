import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  ErrorText,
  Field,
  Screen,
  Subtitle,
  Title,
} from "../../src/components/ui";
import { createListing, parseListingText } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { theme, txnLabel } from "../../src/lib/theme";
import type { Txn } from "../../src/lib/types";

const TXNS: Txn[] = ["sell", "buy", "rent"];

export default function NewListing() {
  const { broker } = useAuth();
  const router = useRouter();

  const [raw, setRaw] = useState("");
  const [parsing, setParsing] = useState(false);

  const [txn, setTxn] = useState<Txn>("sell");
  const [locality, setLocality] = useState("");
  const [pincode, setPincode] = useState("");
  const [budget, setBudget] = useState("");
  const [specs, setSpecs] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onParse() {
    if (!raw.trim()) return;
    setError(null);
    setParsing(true);
    try {
      const draft = await parseListingText(raw.trim());
      if (draft.txn) setTxn(draft.txn);
      if (draft.locality) setLocality(draft.locality);
      if (draft.pincode) setPincode(draft.pincode);
      if (draft.budget) setBudget(String(draft.budget));
      const specParts = [
        draft.bhk ? `${draft.bhk} BHK` : null,
        draft.specs ?? null,
      ].filter(Boolean);
      if (specParts.length) setSpecs(specParts.join(" · "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse");
    } finally {
      setParsing(false);
    }
  }

  async function onSubmit() {
    if (!broker) return;
    const budgetNum = Number(budget);
    if (!locality.trim() || !pincode.trim() || !Number.isFinite(budgetNum) || budgetNum <= 0) {
      setError("Fill locality, pincode and a valid budget.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const created = await createListing({
        brokerId: broker.id,
        txn,
        locality: locality.trim(),
        pincode: pincode.trim(),
        budget: budgetNum,
        specs: specs.trim() || undefined,
      });
      router.replace(`/listings/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create listing");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Card>
        <Title>AI listing parser</Title>
        <Subtitle>Paste a WhatsApp message — we draft the fields. Review before posting.</Subtitle>
        <Field
          label="WhatsApp text"
          value={raw}
          onChangeText={setRaw}
          multiline
          numberOfLines={4}
          placeholder="3 BHK sea-facing in Andheri West 400058, 2.5 cr..."
        />
        <Button label="Parse with AI" variant="ghost" onPress={onParse} loading={parsing} />
      </Card>

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
      <Field label="Pincode" value={pincode} onChangeText={setPincode} keyboardType="number-pad" placeholder="400058" />
      <Field label="Budget (₹)" value={budget} onChangeText={setBudget} keyboardType="number-pad" placeholder="25000000" />
      <Field label="Specs (optional)" value={specs} onChangeText={setSpecs} placeholder="3 BHK · sea-facing" />

      <Button label="Post listing" onPress={onSubmit} loading={busy} />
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", gap: 8 },
  chipItem: { flex: 1 },
});
