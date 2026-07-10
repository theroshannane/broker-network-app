import { useRouter } from "expo-router";
import { useState } from "react";
import { Button, ErrorText, Field, Screen, Subtitle, Title } from "../src/components/ui";
import { useAuth } from "../src/lib/auth";

export default function Login() {
  const { requestOtp, verifyOtp } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onRequest() {
    setError(null);
    setBusy(true);
    try {
      await requestOtp(phone.trim());
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send OTP");
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    setError(null);
    setBusy(true);
    try {
      const { hasBroker } = await verifyOtp(phone.trim(), code.trim());
      router.replace(hasBroker ? "/" : "/register");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>Broker sign in</Title>
      <Subtitle>Verified brokers only. We send a one-time code to your phone.</Subtitle>

      <Field
        label="Phone number"
        value={phone}
        onChangeText={setPhone}
        editable={step === "phone"}
        keyboardType="phone-pad"
        placeholder="+9198XXXXXXXX"
        autoCapitalize="none"
      />

      {step === "code" ? (
        <>
          <Field
            label="One-time code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            placeholder="123456"
          />
          <Button label="Verify & continue" onPress={onVerify} loading={busy} />
          <Button
            label="Change number"
            variant="ghost"
            onPress={() => setStep("phone")}
          />
        </>
      ) : (
        <Button label="Send code" onPress={onRequest} loading={busy} disabled={!phone.trim()} />
      )}

      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}
