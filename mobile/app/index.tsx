import { Redirect, useRouter } from "expo-router";
import { View } from "react-native";
import { Badge, Button, Card, Loader, Screen, Subtitle, Title } from "../src/components/ui";
import { useAuth } from "../src/lib/auth";

export default function Home() {
  const { loading, isAuthenticated, broker, phone, logout } = useAuth();
  const router = useRouter();

  if (loading) return <Loader />;
  if (!isAuthenticated) return <Redirect href="/login" />;
  if (!broker) return <Redirect href="/register" />;

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Title>Namaste, {broker.name}</Title>
        <Subtitle>{phone}</Subtitle>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          <Badge tone={broker.verification === "verified" ? "accent" : "warn"}>
            {broker.verification === "verified" ? "Verified" : "Verification pending"}
          </Badge>
          {broker.agencyName ? <Badge tone="muted">{broker.agencyName}</Badge> : null}
        </View>
      </View>

      <Card onPress={() => router.push("/listings")}>
        <Title>Browse listings</Title>
        <Subtitle>Search the broker network and request contacts.</Subtitle>
      </Card>
      <Card onPress={() => router.push("/listings/new")}>
        <Title>Post a listing</Title>
        <Subtitle>Paste a WhatsApp message — AI drafts it for you.</Subtitle>
      </Card>
      <Card onPress={() => router.push("/requirements/new")}>
        <Title>Add a requirement</Title>
        <Subtitle>Get smart-matched to open listings.</Subtitle>
      </Card>
      <Card onPress={() => router.push("/alerts")}>
        <Title>My alerts</Title>
        <Subtitle>New listings matching your saved requirements.</Subtitle>
      </Card>
      <Card onPress={() => router.push("/requests/incoming")}>
        <Title>Incoming requests</Title>
        <Subtitle>Approve co-broking requests on your listings.</Subtitle>
      </Card>

      <Button label="Log out" variant="ghost" onPress={logout} />
    </Screen>
  );
}
