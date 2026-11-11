import { Alert } from "../utils/salemaAlert";

import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { apiRequest } from "../services/apiClient";

type Props = NativeStackScreenProps<RootStackParamList, "VerifyEmail">;

type VerifyResponse = {
  success: boolean;
  message: string;
};

const PURPLE = "#6425A5";
const DEEP = "#260B40";
const BG = "#F6F1FB";
const TEXT = "#261633";
const MUTED = "#82758D";
const BORDER = "#E8DDF1";

export default function VerifyEmailScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    if (!/^\d{6}$/.test(code)) {
      Alert.alert(
        "Invalid code",
        "Enter the six-digit code sent to your email."
      );
      return;
    }

    setLoading(true);
    try {
      const result = await apiRequest<VerifyResponse>("/auth/verify-email", {
        method: "POST",
        authenticated: false,
        body: { email, code },
      });

      Alert.alert(
        "Email verified",
        result.message || "Your email has been verified successfully.",
        [
          {
            text: "Continue to login",
            onPress: () => navigation.navigate("Login"),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Verification failed",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.orbOne} />
          <View style={styles.orbTwo} />

          <Pressable
            onPress={() => navigation.navigate("Login")}
            style={styles.backButton}
            disabled={loading}
          >
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backText}>Back to login</Text>
          </Pressable>

          <View style={styles.brandRow}>
            <View style={styles.logo}>
              <Text style={styles.logoLetter}>S</Text>
              <View style={styles.plusBadge}>
                <Text style={styles.plusText}>+</Text>
              </View>
            </View>

            <View style={styles.brandCopy}>
              <Text style={styles.brand}>SALEMA</Text>
              <Text style={styles.brandSub}>MEDICAL</Text>
            </View>
          </View>

          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>STEP 02 · ACCOUNT SECURITY</Text>
            <Text style={styles.heroTitle}>Almost there.</Text>
            <Text style={styles.heroDescription}>
              Let's confirm your email address so you can continue.
            </Text>
          </View>
        </View>

        <View style={styles.formArea}>
          <View style={styles.card}>
            <View style={styles.mailIllustration}>
              <View style={styles.mailCircle}>
                <Text style={styles.mailIcon}>✉</Text>
              </View>
              <View style={styles.checkBadge}>
                <Text style={styles.checkText}>✓</Text>
              </View>
              <View style={styles.sparkleOne} />
              <View style={styles.sparkleTwo} />
            </View>

            <Text style={styles.heading}>Verify your email</Text>
            <Text style={styles.subtitle}>
              We've sent a six-digit verification code to the email address
              below.
            </Text>

            <View style={styles.emailPanel}>
              <View style={styles.emailIconBox}>
                <Text style={styles.emailIcon}>@</Text>
              </View>
              <View style={styles.emailCopy}>
                <Text style={styles.emailLabel}>CODE SENT TO</Text>
                <Text style={styles.email} numberOfLines={2}>
                  {email}
                </Text>
              </View>
            </View>

            <Text style={styles.label}>YOUR VERIFICATION CODE</Text>

            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={(value) =>
                setCode(value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              placeholderTextColor="#C4B3D1"
              keyboardType="number-pad"
              maxLength={6}
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              accessibilityLabel="Six-digit email verification code"
              editable={!loading}
              selectTextOnFocus
              selectionColor={PURPLE}
              returnKeyType="done"
              onSubmitEditing={handleVerify}
            />

            <View style={styles.codeProgress}>
              {Array.from({ length: 6 }, (_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressSegment,
                    index < code.length && styles.progressSegmentFilled,
                  ]}
                />
              ))}
              <Text style={styles.digitCount}>{code.length}/6</Text>
            </View>

            <Text style={styles.hint}>
              Enter the numbers exactly as they appear in your email.
            </Text>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !loading && styles.buttonPressed,
                loading && styles.disabled,
              ]}
              onPress={handleVerify}
              disabled={loading}
            >
              <LinearGradient
                colors={["#7540AD", "#461477", "#191044"]}
                locations={[0, 0.48, 1]}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>VERIFY EMAIL</Text>
                    <Text style={styles.buttonArrow}>→</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <View style={styles.securityNote}>
              <View style={styles.securityIcon}>
                <Text style={styles.securityCheck}>✓</Text>
              </View>
              <Text style={styles.securityText}>
                This step helps protect your account.
              </Text>
            </View>

            <View style={styles.divider} />

            <Pressable
              onPress={() => navigation.navigate("Login")}
              style={styles.backToLogin}
              disabled={loading}
            >
              <Text style={styles.backToLoginText}>
                Return to <Text style={styles.loginStrong}>sign in</Text>
              </Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>
            SALEMA MEDICAL  ·  BEYOND EXPECTATIONS
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scrollContent: { flexGrow: 1, paddingBottom: 24 },
  hero: {
    backgroundColor: DEEP,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 55 : 35,
    paddingBottom: 48,
    overflow: "hidden",
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },
  orbOne: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    right: -95,
    top: 40,
    backgroundColor: "#51217A",
    opacity: 0.7,
  },
  orbTwo: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    right: 25,
    bottom: -110,
    borderWidth: 28,
    borderColor: "#7B45A6",
    opacity: 0.35,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 25,
    paddingVertical: 5,
  },
  backArrow: { color: "#FFFFFF", fontSize: 29, marginRight: 7, lineHeight: 30 },
  backText: { color: "#E5D6F1", fontSize: 12, fontWeight: "700" },
  brandRow: { flexDirection: "row", alignItems: "center" },
  logo: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: {
    color: DEEP,
    fontSize: 33,
    lineHeight: 39,
    fontWeight: "900",
  },
  plusBadge: {
    position: "absolute",
    right: -5,
    bottom: -4,
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: "#D6B8FF",
    borderWidth: 2,
    borderColor: DEEP,
    alignItems: "center",
    justifyContent: "center",
  },
  plusText: { color: DEEP, fontSize: 16, fontWeight: "900" },
  brandCopy: { marginLeft: 12 },
  brand: { color: "#FFFFFF", fontSize: 19, fontWeight: "900", letterSpacing: 2 },
  brandSub: {
    color: "#D6B8FF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 4,
    marginTop: 3,
  },
  heroCopy: { marginTop: 30 },
  eyebrow: {
    color: "#D6B8FF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 33,
    fontWeight: "900",
    letterSpacing: -0.6,
    marginTop: 10,
  },
  heroDescription: {
    color: "#D8C9E5",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
    maxWidth: 300,
  },
  formArea: {
    flex: 1,
    paddingHorizontal: 19,
    paddingTop: 24,
    marginTop: -24,
    backgroundColor: "#EDEBED",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  card: {
    backgroundColor: "transparent",
    borderRadius: 0,
    borderWidth: 0,
    padding: 22,
  },
  mailIllustration: {
    alignSelf: "center",
    width: 86,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  mailCircle: {
    width: 67,
    height: 67,
    borderRadius: 24,
    backgroundColor: "#F0E5FA",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-6deg" }],
  },
  mailIcon: { color: PURPLE, fontSize: 34, fontWeight: "700" },
  checkBadge: {
    position: "absolute",
    right: 1,
    bottom: 3,
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: PURPLE,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  sparkleOne: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#D2B4F2",
    left: 1,
    top: 10,
  },
  sparkleTwo: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#A87BD1",
    right: 2,
    top: 5,
  },
  heading: {
    color: DEEP,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitle: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  emailPanel: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F3FC",
    borderWidth: 1,
    borderColor: "#E9DDF4",
    borderRadius: 15,
    padding: 12,
    marginBottom: 24,
  },
  emailIconBox: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: "#EBDDF8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  emailIcon: { color: PURPLE, fontSize: 20, fontWeight: "900" },
  emailCopy: { flex: 1, minWidth: 0 },
  emailLabel: {
    color: MUTED,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  email: { color: DEEP, fontSize: 12, fontWeight: "800" },
  label: {
    color: "#51425E",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  codeInput: {
    minHeight: 69,
    borderWidth: 1.5,
    borderColor: "#DCC9ED",
    borderRadius: 16,
    backgroundColor: "#FCFAFE",
    color: DEEP,
    textAlign: "center",
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: 12,
    paddingVertical: 14,
    paddingLeft: 12,
    paddingRight: 0,
  },
  codeProgress: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 3,
    backgroundColor: "#EDE6F3",
    marginRight: 5,
  },
  progressSegmentFilled: { backgroundColor: PURPLE },
  digitCount: {
    color: PURPLE,
    fontSize: 9,
    fontWeight: "900",
    marginLeft: 5,
  },
  hint: { color: MUTED, fontSize: 10, lineHeight: 16, marginTop: 10 },
  primaryButton: {
    height: 54,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 24,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonGradient: {
    flex: 1,
    minHeight: 54,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900", letterSpacing: 0.6 },
  buttonArrow: { color: "#FFFFFF", fontSize: 22, position: "absolute", right: 19 },
  buttonPressed: { opacity: 0.82 },
  disabled: { opacity: 0.65 },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  securityIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E9DDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },
  securityCheck: { color: PURPLE, fontSize: 11, fontWeight: "900" },
  securityText: { color: MUTED, fontSize: 10 },
  divider: { height: 1, backgroundColor: "#EEE7F3", marginTop: 20 },
  backToLogin: { alignItems: "center", paddingTop: 17 },
  backToLoginText: { color: MUTED, fontSize: 12 },
  loginStrong: { color: PURPLE, fontWeight: "900" },
  footer: {
    color: "#9688A1",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    textAlign: "center",
    marginTop: 23,
  },
});
