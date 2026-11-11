
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

type RegisterResponse = {
  success: boolean;
  message: string;
};

const PURPLE = "#6425A5";
const DEEP = "#260B40";
const BG = "#F6F1FB";
const TEXT = "#261633";
const MUTED = "#82758D";
const BORDER = "#E8DDF1";

export default function RegisterScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (
      !fullName.trim() ||
      !email.trim() ||
      !phoneNumber.trim() ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert("Missing details", "Please complete all fields.");
      return;
    }

    if (
      password.length < 6 ||
      password.length > 128 ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9\s]/.test(password)
    ) {
      Alert.alert(
        "Invalid password",
        "Use 6–128 characters, including at least one number and one special character."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Passwords do not match", "Please make sure both passwords are identical.");
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      const result = await apiRequest<RegisterResponse>("/auth/register", {
        method: "POST",
        authenticated: false,
        body: {
          fullName: fullName.trim(),
          email: normalizedEmail,
          phoneNumber: phoneNumber.trim(),
          password,
        },
      });

      Alert.alert(
        "Check your email",
        result.message || "Check your inbox to verify your email address."
      );

      navigation.navigate("VerifyEmail", { email: normalizedEmail });
    } catch (error) {
      Alert.alert(
        "Registration failed",
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

          <Text style={styles.eyebrow}>LET'S GET YOU CONNECTED</Text>
          <Text style={styles.heroTitle}>Your care journey{"\n"}starts here.</Text>
          <Text style={styles.heroDescription}>
            Create your account to connect with medical assistance.
          </Text>

          <View style={styles.stepsRow}>
            <View style={styles.stepActive}>
              <Text style={styles.stepNumber}>01</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepInactive}>
              <Text style={styles.stepNumberInactive}>02</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepInactive}>
              <Text style={styles.stepNumberInactive}>03</Text>
            </View>
            <Text style={styles.stepCaption}>ACCOUNT · VERIFY · READY</Text>
          </View>
        </View>

        <View style={styles.formArea}>
          <View style={styles.card}>
            <Text style={styles.heading}>Create your account</Text>
            <Text style={styles.subtitle}>
              Enter your details below. Fields marked here are all required.
            </Text>

            <Text style={styles.sectionLabel}>PERSONAL DETAILS</Text>

            <Text style={styles.label}>Full name</Text>
            <View style={styles.inputShell}>
              <Text style={styles.inputIcon}>◉</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor="#A99BB4"
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                editable={!loading}
                selectionColor={PURPLE}
              />
            </View>

            <Text style={styles.label}>Email address</Text>
            <View style={styles.inputShell}>
              <Text style={styles.inputIcon}>@</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#A99BB4"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                editable={!loading}
                selectionColor={PURPLE}
              />
            </View>

            <Text style={styles.label}>Phone number</Text>
            <View style={styles.inputShell}>
              <Text style={styles.inputIcon}>⌕</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter your phone number"
                placeholderTextColor="#A99BB4"
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                returnKeyType="next"
                editable={!loading}
                selectionColor={PURPLE}
              />
            </View>

            <View style={styles.passwordHeading}>
              <Text style={styles.label}>Password</Text>
              <Text style={styles.requiredTag}>6+ CHARACTERS</Text>
            </View>

            <View style={styles.inputShell}>
              <Text style={styles.inputIcon}>◆</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Create a strong password"
                placeholderTextColor="#A99BB4"
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                editable={!loading}
                selectionColor={PURPLE}
              />
              <Pressable
                onPress={() => setShowPassword((value) => !value)}
                style={styles.visibilityButton}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? "Hide password" : "Show password"
                }
                disabled={loading}
              >
                <Text style={styles.visibilityText}>
                  {showPassword ? "HIDE" : "SHOW"}
                </Text>
              </Pressable>
            </View>

            

            <Text style={styles.label}>Confirm password</Text>

            <View style={styles.inputShell}>
              <Text style={styles.inputIcon}>◆</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter your password"
                placeholderTextColor="#A99BB4"
                secureTextEntry={!showConfirmPassword}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                editable={!loading}
                selectionColor={PURPLE}
              />


              <Pressable
                onPress={() => setShowConfirmPassword((value) => !value)}
                style={styles.visibilityButton}
                accessibilityRole="button"
                accessibilityLabel={
                  showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                }
                disabled={loading}
              >
                <Text style={styles.visibilityText}>
                  {showConfirmPassword ? "HIDE" : "SHOW"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.passwordInfo}>
              <Text style={styles.infoIcon}>i</Text>
              <Text style={styles.passwordHint}>
                Use 6–128 characters, including at least one number and one special
                character. Your email must be verified before continuing.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !loading && styles.buttonPressed,
                loading && styles.disabled,
              ]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Create account</Text>
                  <Text style={styles.buttonArrow}>→</Text>
                </>
              )}
            </Pressable>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Pressable
                onPress={() => navigation.navigate("Login")}
                disabled={loading}
              >
                <Text style={styles.footerLink}>Sign in</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.bottomNote}>
            <Text style={styles.bottomNoteText}>
              SALEMA MEDICAL  ·  BEYOND EXPECTATIONS
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  hero: {
    backgroundColor: DEEP,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 55 : 35,
    paddingBottom: 46,
    overflow: "hidden",
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },
  orbOne: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    right: -110,
    top: 50,
    backgroundColor: "#51217A",
    opacity: 0.7,
  },
  orbTwo: {
    position: "absolute",
    width: 145,
    height: 145,
    borderRadius: 73,
    right: 15,
    bottom: -100,
    borderWidth: 27,
    borderColor: "#7B45A6",
    opacity: 0.4,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 27,
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
  eyebrow: {
    color: "#D6B8FF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.8,
    marginTop: 29,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
    marginTop: 9,
    letterSpacing: -0.6,
  },
  heroDescription: {
    color: "#D8C9E5",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 10,
    maxWidth: 285,
  },
  stepsRow: { flexDirection: "row", alignItems: "center", marginTop: 24 },
  stepActive: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#D6B8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  stepInactive: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#3B1B53",
    borderWidth: 1,
    borderColor: "#674481",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: { color: DEEP, fontSize: 10, fontWeight: "900" },
  stepNumberInactive: { color: "#C8B4D8", fontSize: 10, fontWeight: "900" },
  stepLine: { width: 23, height: 1, backgroundColor: "#76538F", marginHorizontal: 5 },
  stepCaption: {
    color: "#D8C9E5",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginLeft: 10,
    flexShrink: 1,
  },
  formArea: { paddingHorizontal: 19, marginTop: -23 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#EDE4F4",
    padding: 21,
    shadowColor: DEEP,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.11,
    shadowRadius: 18,
    elevation: 5,
  },
  heading: { color: DEEP, fontSize: 24, fontWeight: "900", letterSpacing: -0.4 },
  subtitle: { color: MUTED, fontSize: 12, lineHeight: 19, marginTop: 7 },
  sectionLabel: {
    color: PURPLE,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 2,
  },
  label: {
    color: "#51425E",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  inputShell: {
    minHeight: 53,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FBF9FD",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  inputIcon: {
    width: 25,
    color: PURPLE,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    marginRight: 6,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: TEXT,
    fontSize: 13,
    paddingVertical: 13,
  },
  passwordHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 1,
  },
  requiredTag: {
    color: PURPLE,
    backgroundColor: "#F1E8FA",
    overflow: "hidden",
    borderRadius: 6,
    fontSize: 8,
    fontWeight: "900",
    paddingHorizontal: 7,
    paddingVertical: 5,
    marginTop: 16,
    marginBottom: 8,
  },
  visibilityButton: { paddingLeft: 8, paddingVertical: 10 },
  visibilityText: { color: PURPLE, fontSize: 9, fontWeight: "900" },
  passwordInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
  },
  infoIcon: {
    width: 15,
    height: 15,
    lineHeight: 15,
    textAlign: "center",
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "#EDE2F7",
    color: PURPLE,
    fontSize: 10,
    fontWeight: "900",
    marginRight: 7,
    marginTop: 1,
  },
  passwordHint: { color: MUTED, fontSize: 10, lineHeight: 16, flex: 1 },
  primaryButton: {
    minHeight: 55,
    borderRadius: 15,
    backgroundColor: PURPLE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    paddingHorizontal: 18,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  buttonArrow: { color: "#FFFFFF", fontSize: 22, position: "absolute", right: 19 },
  buttonPressed: { backgroundColor: DEEP, opacity: 0.92 },
  disabled: { opacity: 0.65 },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  footerText: { color: MUTED, fontSize: 11 },
  footerLink: { color: PURPLE, fontSize: 11, fontWeight: "900" },
  bottomNote: { alignItems: "center", marginTop: 22 },
  bottomNoteText: {
    color: "#9688A1",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
  },
});
