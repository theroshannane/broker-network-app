import { useRouter } from "expo-router";
import { useState } from "react";
import { Button, ErrorText, Field, Screen, Subtitle, Title } from "../src/components/ui";
import { useAuth } from "../src/lib/auth";

export default function Register() {
  const { phone, register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [reraId, setReraId] = useState("");
  const [pan, setPan] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!phone) {
      setError("Missing phone — sign in again.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await register({
        phone,
        name: name.trim(),
        agencyName: agencyName.trim() || undefined,
        reraId: reraId.trim() || undefined,
        pan: pan.trim() || undefined,
      });
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>Create your broker profile</Title>
      <Subtitle>
        Add your RERA ID and PAN to get the verified badge. You can add them later.
      </Subtitle>

      <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" />
      <Field
        label="Agency name (optional)"
        value={agencyName}
        onChangeText={setAgencyName}
        placeholder="Agency"
      />
      <Field
        label="RERA ID (optional)"
        value={reraId}
        onChangeText={setReraId}
        autoCapitalize="characters"
        placeholder="A012..."
      />
      <Field
        label="PAN (optional)"
        value={pan}
        onChangeText={setPan}
        autoCapitalize="characters"
        placeholder="ABCDE1234F"
      />

      <Button label="Create profile" onPress={onSubmit} loading={busy} disabled={!name.trim()} />
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}
