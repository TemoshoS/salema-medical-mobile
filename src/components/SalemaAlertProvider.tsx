import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  registerSalemaAlertHandler,
  type SalemaAlertButton,
} from "../utils/salemaAlert";
import { BlurView } from "expo-blur";

type AlertData = {
  title: string;
  message: string;
  buttons: SalemaAlertButton[];
};

function getKind(title: string) {
  const value = title.toLowerCase();

  if (/success|verified|completed|submitted|approved|saved|sent/.test(value))
    return "success";
  if (/error|failed|failure|invalid|unable|rejected|not connected/.test(value))
    return "error";
  if (/warning|emergency|important|attention|required/.test(value))
    return "warning";
  if (/confirm|are you sure|log out|logout|assign provider|dispatch/.test(value))
    return "confirm";

  return "info";
}

const kinds = {
  success: { symbol: "✓", label: "SUCCESS", color: "#A7F0CB", tint: "#245C4B" },
  error: { symbol: "×", label: "PLEASE NOTE", color: "#FFB7C7", tint: "#65253B" },
  warning: { symbol: "!", label: "IMPORTANT", color: "#FFD99A", tint: "#684A22" },
  confirm: { symbol: "?", label: "CONFIRMATION", color: "#E1C8FF", tint: "#563476" },
  info: { symbol: "i", label: "SALEMA MEDICAL", color: "#E1C8FF", tint: "#563476" },
};

export function SalemaAlertProvider({ children }: { children: React.ReactNode }) {
  const [alert, setAlert] = useState<AlertData | null>(null);
  const scale = useRef(new Animated.Value(0.94)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return registerSalemaAlertHandler((title, message, buttons) => {
      setAlert({
        title,
        message: message ?? "",
        buttons: buttons?.length ? buttons : [{ text: "OK" }],
      });
    });
  }, []);

  useEffect(() => {
    if (!alert) return;
    scale.setValue(0.94);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        speed: 20,
        bounciness: 5,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [alert, opacity, scale]);

  const kind = alert ? getKind(alert.title) : "info";
  const config = kinds[kind];

  return (
    <>
      {children}
      <Modal
        visible={!!alert}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAlert(null)}
      >
        <View style={styles.overlay}>
          <BlurView
            intensity={100}
            tint="light"
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.overlayTint} />

          {alert && (
            <Animated.View
              accessibilityViewIsModal
              accessibilityRole="alert"
              style={[
                styles.card,
                { opacity, transform: [{ scale }] },
              ]}
            >
              <LinearGradient
                colors={[
                  "rgba(255,255,255,0.72)",
                  "rgba(235,225,250,0.58)",
                  "rgba(255,255,255,0.76)",
                ]}
                locations={[0, 0.5, 1]}
                style={styles.gradient}
              >
                <View style={styles.header}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: config.tint },
                    ]}
                  >
                    <Text style={[styles.symbol, { color: config.color }]}>
                      {config.symbol}
                    </Text>
                  </View>

                  <View style={styles.heading}>
                    <Text style={styles.label}>{config.label}</Text>
                    <Text style={styles.title}>{alert.title}</Text>
                  </View>
                </View>

                {!!alert.message && (
                  <Text style={styles.message}>{alert.message}</Text>
                )}

                <View
                  style={[
                    styles.buttons,
                    alert.buttons.length > 2 && styles.stacked,
                  ]}
                >
                  {alert.buttons.map((button, index) => {
                    const cancel = button.style === "cancel";
                    const destructive = button.style === "destructive";
                    const primary =
                      !cancel &&
                      !destructive &&
                      (alert.buttons.length === 1 ||
                        index === alert.buttons.length - 1);

                    return (
                      <Pressable
                        key={`${button.text ?? "action"}-${index}`}
                        accessibilityRole="button"
                        onPress={() => {
                          setAlert(null);
                          button.onPress?.();
                        }}
                        style={({ pressed }) => [
                          styles.button,
                          cancel && styles.cancel,
                          destructive && styles.destructive,
                          primary && styles.primary,
                          alert.buttons.length > 2 && styles.stackedButton,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.buttonText,
                            cancel && styles.cancelText,
                            destructive && styles.whiteText,
                            primary && styles.whiteText,
                          ]}
                        >
                          {button.text ?? "OK"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </LinearGradient>
            </Animated.View>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 30,
    backgroundColor: "rgba(35, 20, 55, 0.12)",
  },

  overlayTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(80, 45, 120, 0.4)",
  },

card: {
  width: "100%",
  maxWidth: 380,
  borderRadius: 25,
  overflow: "hidden",
  borderWidth: 1.5,
  borderColor: "rgba(255,255,255,0.95)",
  backgroundColor: "rgba(255,255,255,0.88)",
  elevation: 24,
  shadowColor: "#39234F",
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.16,
  shadowRadius: 25,
},

gradient: {
  paddingHorizontal: 23,
  paddingTop: 25,
  paddingBottom: 22,
},

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  accent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: "#DCC9EF",
  },

 iconCircle: {
  width: 49,
  height: 49,
  borderRadius: 17,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.8)",
  backgroundColor: "rgba(255,255,255,0.35)",
},
  symbol: {
    fontSize: 25,
    fontWeight: "800",
  },
  heading: { flex: 1 },
  label: {
    color: "#8C6BA8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginBottom: 5,
  },
  title: {
    color: "#29183D",
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 26,
  },
  message: {
    color: "#655873",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 19,
    marginBottom: 20,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 19,
  },
  stacked: { flexDirection: "column-reverse" },
  button: {
    flex: 1,
    minHeight: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#DCCCEB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: "#F4EFF8",
  },
  stackedButton: { flex: 0, width: "100%" },
  primary: {
    backgroundColor: "#461477",
    borderColor: "#461477",
  },
  cancel: {
    backgroundColor: "#F5F1F8",
    borderColor: "#E3D9EB",
  },
  destructive: {
    backgroundColor: "#A30E35",
    borderColor: "#A30E35",
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.985 }],
  },
  buttonText: {
    color: "#461477",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  cancelText: { color: "#655873" },
  whiteText: { color: "#FFFFFF" },
  footer: {
    color: "#A292B1",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 19,
  },
});
