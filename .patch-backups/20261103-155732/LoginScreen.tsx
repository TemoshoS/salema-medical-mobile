
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
import { useAuth, type AuthUser } from "../context/AuthContext";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

type LoginResponse = {
  success: boolean;
  token: string;
  refreshToken: string;
  user: AuthUser;
  message?: string;
};

const PURPLE = "#6425A5";
const DEEP = "#260B40";
const BG = "#F6F1FB";
const TEXT = "#261633";
const MUTED = "#82758D";
const BORDER = "#E8DDF1";

export default function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Missing details", "Enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const result = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        authenticated: false,
        body: {
          email: email.trim().toLowerCase(),
          password,
        },
      });

      if (!result.token || !result.refreshToken || !result.user) {
        throw new Error("The server returned an incomplete login response.");
      }

      await signIn(result.token, result.refreshToken, result.user);
    } catch (error) {
      Alert.alert(
        "Login failed",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleVerifyEmail() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      Alert.alert("Email required", "Enter your email address first.");
      return;
    }

    navigation.navigate("VerifyEmail", { email: normalizedEmail });
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

          <View style={styles.topRow}>
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

            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>CARE</Text>
            </View>
          </View>

          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>YOUR HEALTH. YOUR SAFETY.</Text>
            <Text style={styles.heroTitle}>
              Help is closer{"\n"}than you think.
            </Text>
            <Text style={styles.heroDescription}>
              Medical support starts with one simple step.
            </Text>
          </View>

          <View style={styles.heroBottom}>
            <View style={styles.heroLine} />
            <Text style={styles.heroBottomText}>
              BEYOND EXPECTATIONS
            </Text>
          </View>
        </View>

        <View style={styles.formArea}>
          <View style={styles.card}>
            <View style={styles.cardHeadingRow}>
              <View style={styles.headingAccent} />
              <View style={styles.headingCopy}>
                <Text style={styles.heading}>Welcome back</Text>
                <Text style={styles.subtitle}>
                  Sign in to continue to your account.
                </Text>
              </View>
            </View>

            <Text style={styles.label}>EMAIL ADDRESS</Text>
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

            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.inputShell}>
              <Text style={styles.inputIcon}>◆</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#A99BB4"
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                textContentType="password"
                onSubmitEditing={handleLogin}
                returnKeyType="go"
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

        

            <Pressable
              onPress={() =>
                navigation.navigate("ForgotPassword", {
                  email: email.trim().toLowerCase(),
                })
              }
              style={styles.forgotPasswordLink}
              disabled={loading}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !loading && styles.buttonPressed,
                loading && styles.disabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Sign in</Text>
                  
                </>
              )}
            </Pressable>

          

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>NEW TO SALEMA?</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => navigation.navigate("Register")}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>
                Create an account
              </Text>
        
            </Pressable>
          </View>

          <View style={styles.trustRow}>
            <View style={styles.trustMark}>
              <Text style={styles.trustCheck}>✓</Text>
            </View>
            <Text style={styles.trustText}>
              Medical support, connected when it matters.
            </Text>
          </View>

          <Text style={styles.footerText}>
            Ambulances  ·  Medical responders  ·  Hospitals
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
    paddingHorizontal: 25,
    paddingTop: Platform.OS === "ios" ? 60 : 42,
    paddingBottom: 44,
    overflow: "hidden",
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },
  orbOne: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    right: -110,
    top: 15,
    backgroundColor: "#51217A",
    opacity: 0.65,
  },
  orbTwo: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    right: 10,
    bottom: -95,
    borderWidth: 30,
    borderColor: "#7B45A6",
    opacity: 0.35,
  },
  topRow: { flexDirection: "row", alignItems: "center" },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: {
    fontSize: 36,
    lineHeight: 42,
    color: DEEP,
    fontWeight: "900",
  },
  plusBadge: {
    position: "absolute",
    right: -5,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#D6B8FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: DEEP,
  },
  plusText: { color: DEEP, fontSize: 17, fontWeight: "900" },
  brandCopy: { marginLeft: 13 },
  brand: { color: "#FFFFFF", fontSize: 20, fontWeight: "900", letterSpacing: 2 },
  brandSub: {
    color: "#D6B8FF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 4,
    marginTop: 3,
  },
  liveBadge: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#795596",
    backgroundColor: "#3A1755",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D6B8FF",
    marginRight: 6,
  },
  liveText: { color: "#F4E9FF", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  heroCopy: { marginTop: 35 },
  eyebrow: {
    color: "#D6B8FF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 35,
    lineHeight: 41,
    fontWeight: "900",
    marginTop: 11,
    letterSpacing: -0.8,
  },
  heroDescription: {
    color: "#D8C9E5",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  heroBottom: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 26,
  },
  heroLine: {
    width: 27,
    height: 3,
    backgroundColor: "#D6B8FF",
    borderRadius: 2,
    marginRight: 10,
  },
  heroBottomText: {
    color: "#E9DDF4",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  formArea: { paddingHorizontal: 20, marginTop: -22 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: "#EDE4F4",
    shadowColor: DEEP,
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },
  cardHeadingRow: { flexDirection: "row", marginBottom: 25 },
  headingAccent: {
    width: 4,
    borderRadius: 3,
    backgroundColor: PURPLE,
    marginRight: 12,
  },
  headingCopy: { flex: 1 },
  heading: { color: DEEP, fontSize: 25, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { color: MUTED, fontSize: 13, lineHeight: 19, marginTop: 5 },
  label: {
    color: "#51425E",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 9,
    marginTop: 17,
  },
 inputShell: {
  minHeight: 58,
  borderRadius: 999,
  borderWidth: 1.5,
  borderColor: "rgba(255, 255, 255, 0.55)",
  backgroundColor: "rgba(146, 91, 191, 0.16)",
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 18,
  shadowColor: "#FFFFFF",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
},
  inputIcon: {
    width: 26,
    color: PURPLE,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
    marginRight: 7,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    color: TEXT,
    fontSize: 14,
  },
  visibilityButton: { paddingVertical: 12, paddingLeft: 8 },
  visibilityText: {
    color: PURPLE,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  primaryButton: {
    minHeight: 40,
    borderRadius: 16,
    backgroundColor: PURPLE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 27,
    paddingHorizontal: 20,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 9,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  buttonArrow: {
    color: "#FFFFFF",
    fontSize: 23,
    position: "absolute",
    right: 20,
  },
  buttonPressed: { backgroundColor: DEEP, opacity: 0.92 },
  disabled: { opacity: 0.65 },
  verifyLink: { alignItems: "center", paddingVertical: 17 },
  forgotPasswordLink: {
    alignSelf: "flex-end",
    paddingTop: 13,
    paddingBottom: 2,
  },
  forgotPasswordText: {
    color: PURPLE,
    fontSize: 12,
    fontWeight: "800",
  },
  verifyLinkText: { color: MUTED, fontSize: 11, textAlign: "center" },
  linkStrong: { color: PURPLE, fontWeight: "900" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 5 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#EEE7F3" },
  dividerText: {
    color: "#9A8DA5",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginHorizontal: 12,
  },
  secondaryButton: {
    minHeight: 40,
    borderWidth: 1.5,
    borderColor: "#D9C6EA",
    borderRadius: 105,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  secondaryButtonText: { color: PURPLE, fontSize: 13, fontWeight: "900" },
  secondaryArrow: { color: PURPLE, fontSize: 17, marginLeft: 8 },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 23,
  },
  trustMark: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: "#E9DDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },
  trustCheck: { color: PURPLE, fontSize: 12, fontWeight: "900" },
  trustText: { color: "#71627D", fontSize: 11 },
  footerText: {
    color: "#9A8EA3",
    fontSize: 10,
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 10,
  },
});
