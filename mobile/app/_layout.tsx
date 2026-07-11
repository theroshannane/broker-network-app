import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "../src/lib/auth";
import { theme } from "../src/lib/theme";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.color.surface },
            headerTintColor: theme.color.text,
            headerTitleStyle: { fontWeight: "700" },
            contentStyle: { backgroundColor: theme.color.bg },
          }}
        >
          <Stack.Screen name="index" options={{ title: "CoBroker" }} />
          <Stack.Screen name="login" options={{ title: "Sign in" }} />
          <Stack.Screen name="register" options={{ title: "Create profile" }} />
          <Stack.Screen name="listings/index" options={{ title: "Listings" }} />
          <Stack.Screen name="listings/new" options={{ title: "New listing" }} />
          <Stack.Screen name="listings/[id]" options={{ title: "Listing" }} />
          <Stack.Screen name="requirements/new" options={{ title: "New requirement" }} />
          <Stack.Screen name="alerts" options={{ title: "Alerts" }} />
          <Stack.Screen name="requests/incoming" options={{ title: "Incoming requests" }} />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
