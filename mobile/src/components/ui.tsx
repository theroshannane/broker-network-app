import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { theme } from "../lib/theme";

export function Screen({
  children,
  scroll = true,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  if (!scroll) {
    return <View style={styles.screen}>{children}</View>;
  }
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Card({
  children,
  onPress,
}: {
  children: ReactNode;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={styles.card}>{children}</View>;
}

export function Field({
  label,
  ...props
}: { label: string } & TextInputProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.color.textMuted}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

export function Button({
  label,
  onPress,
  loading,
  variant = "primary",
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "ghost";
  disabled?: boolean;
}) {
  const isGhost = variant === "ghost";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        isGhost && styles.btnGhost,
        pressed && styles.btnPressed,
        (disabled || loading) && styles.btnDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isGhost ? theme.color.text : theme.color.accentText} />
      ) : (
        <Text style={[styles.btnText, isGhost && styles.btnTextGhost]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Badge({
  children,
  tone = "accent",
}: {
  children: ReactNode;
  tone?: "accent" | "muted" | "warn";
}) {
  const bg =
    tone === "muted"
      ? theme.color.surfaceAlt
      : tone === "warn"
        ? theme.color.warn
        : theme.color.accent;
  const fg = tone === "accent" || tone === "warn" ? theme.color.accentText : theme.color.textMuted;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{children}</Text>
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

export function Loader() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator color={theme.color.accent} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.bg },
  screenContent: { padding: theme.space.md, gap: theme.space.md, paddingBottom: theme.space.xl },
  title: { color: theme.color.text, fontSize: theme.text.hero, fontWeight: "800" },
  subtitle: { color: theme.color.textMuted, fontSize: theme.text.base },
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: theme.space.md,
    gap: theme.space.xs,
  },
  cardPressed: { backgroundColor: theme.color.surfaceAlt },
  fieldWrap: { gap: theme.space.xs },
  label: { color: theme.color.textMuted, fontSize: theme.text.sm, fontWeight: "600" },
  input: {
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    color: theme.color.text,
    fontSize: theme.text.base,
  },
  btn: {
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  btnPressed: { opacity: 0.85 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: theme.color.accentText, fontSize: theme.text.base, fontWeight: "700" },
  btnTextGhost: { color: theme.color.text },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 3,
  },
  badgeText: { fontSize: theme.text.sm, fontWeight: "700" },
  error: { color: theme.color.danger, fontSize: theme.text.base },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.color.bg },
});
