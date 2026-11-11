import { Alert } from "../utils/salemaAlert";
import { useState } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { apiRequest } from "../services/apiClient";

type Props = NativeStackScreenProps<RootStackParamList, "ResetPassword">;

const PURPLE = "#6425A5";
const DEEP = "#260B40";
const TEXT = "#261633";
const MUTED = "#82758D";

export default function ResetPasswordScreen({ route, navigation }: Props) {
  const { email } = route.params;

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function resetPassword() {
    if (!/^\d{6}$/.test(code)) {
      Alert.alert("Invalid code", "Enter the six-digit reset code.");
      return;
    }

    if (
      password.length < 6 ||
      password.length > 128 ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9\s]/.test(password)
    ) {
      Alert.alert(
        "Password requirements",
        "Use 6–128 characters, including at least one number and one special character."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Passwords do not match", "Enter the same password twice.");
      return;
    }

    setLoading(true);

    try {
      const result = await apiRequest<{ message?: string }>(
        "/auth/reset-password",
        {
          method: "POST",
          authenticated: false,
          body: { email, code, password },
        }
      );

      Alert.alert(
        "Password reset",
        result.message || "Your password has been reset. Please sign in.",
        [{ text: "Go to login", onPress: () => navigation.navigate("Login") }]
      );
    } catch (error) {
      Alert.alert(
        "Reset failed",
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
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#7540AD", "#461477", "#191044"]}
          locations={[0, 0.48, 1]}
          style={styles.hero}
        >
          <View style={styles.circleOne} />
          <View style={styles.circleTwo} />

          <Pressable
            style={styles.backButton}
            onPress={() =>
              navigation.navigate("ForgotPassword", { email })
            }
            disabled={loading}
          >
            <Text style={styles.backText}>‹  Back</Text>
          </Pressable>

          <View style={styles.brandSection}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>S+</Text>
            </View>

            <Text style={styles.brand}>SALEMA MEDICAL</Text>
            <Text style={styles.tagline}>BEYOND EXPECTATIONS</Text>
          </View>

          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Create a new password.</Text>
            <Text style={styles.heroDescription}>
              Enter your reset code and secure your account with a new
              password.
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.formPanel}>
          <Text style={styles.heading}>Reset your password</Text>
          <Text style={styles.subheading}>
            Code sent to {email}
          </Text>

          <Text style={styles.label}>SIX-DIGIT RESET CODE</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            value={code}
            onChangeText={(value) =>
              setCode(value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="000000"
            placeholderTextColor="#B5A9BE"
            keyboardType="number-pad"
            maxLength={6}
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            editable={!loading}
            selectionColor={PURPLE}
          />

          <Text style={styles.label}>NEW PASSWORD</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter new password"
              placeholderTextColor="#A99BB4"
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!loading}
              selectionColor={PURPLE}
            />

            <Pressable
              onPress={() => setShowPassword((value) => !value)}
              disabled={loading}
            >
              <Text style={styles.visibility}>
                {showPassword ? "HIDE" : "SHOW"}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.passwordInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Enter password again"
              placeholderTextColor="#A99BB4"
              secureTextEntry={!showConfirmPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!loading}
              selectionColor={PURPLE}
              onSubmitEditing={resetPassword}
            />

            <Pressable
              onPress={() =>
                setShowConfirmPassword((value) => !value)
              }
              disabled={loading}
            >
              <Text style={styles.visibility}>
                {showConfirmPassword ? "HIDE" : "SHOW"}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.hint}>
            6–128 characters, including at least one number and one special
            character.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={resetPassword}
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
                <Text style={styles.primaryText}>RESET PASSWORD</Text>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
            style={styles.loginLink}
            onPress={() => navigation.navigate("Login")}
            disabled={loading}
          >
            <Text style={styles.loginLinkText}>
              Back to <Text style={styles.loginLinkBold}>Sign In</Text>
            </Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>
          SALEMA MEDICAL · BEYOND EXPECTATIONS
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#DAD8DC",
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 25,
  },
  hero: {
    minHeight: 365,
    paddingHorizontal: 25,
    paddingTop: Platform.OS === "ios" ? 58 : 40,
    paddingBottom: 85,
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 38,
    overflow: "hidden",
  },
  circleOne: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -100,
    right: -75,
  },
  circleTwo: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: 5,
    left: -85,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingRight: 20,
    zIndex: 2,
  },
  backText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  brandSection: {
    alignItems: "center",
    marginTop: 12,
  },
  logo: {
    width: 55,
    height: 55,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.65)",
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 10,
  },
  tagline: {
    color: "#E2D1F4",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2.2,
    marginTop: 5,
  },
  heroText: {
    marginTop: 30,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "900",
  },
  heroDescription: {
    color: "#E1D5EC",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  formPanel: {
    backgroundColor: "#EDEBED",
    marginTop: -65,
    marginHorizontal: 0,
    paddingHorizontal: 25,
    paddingTop: 30,
    paddingBottom: 30,
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    minHeight: 430,
  },
  heading: {
    color: DEEP,
    fontSize: 23,
    fontWeight: "900",
  },
  subheading: {
    color: MUTED,
    fontSize: 12,
    marginTop: 6,
  },
  label: {
    color: "#51425E",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginTop: 21,
    marginBottom: 7,
  },
  input: {
    minHeight: 48,
    borderBottomWidth: 1.4,
    borderBottomColor: "#BEB1C9",
    color: TEXT,
    fontSize: 15,
    paddingHorizontal: 4,
  },
  codeInput: {
    textAlign: "center",
    letterSpacing: 10,
    fontSize: 21,
    fontWeight: "900",
  },
  inputRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1.4,
    borderBottomColor: "#BEB1C9",
  },
  passwordInput: {
    flex: 1,
    minWidth: 0,
    color: TEXT,
    fontSize: 14,
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  visibility: {
    color: PURPLE,
    fontSize: 10,
    fontWeight: "900",
    padding: 8,
  },
  hint: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 13,
  },
  primaryButton: {
    height: 54,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 25,
  },
  buttonGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  loginLink: {
    alignItems: "center",
    marginTop: 20,
  },
  loginLinkText: {
    color: MUTED,
    fontSize: 13,
  },
  loginLinkBold: {
    color: PURPLE,
    fontWeight: "900",
  },
  footer: {
    color: "#82758D",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    textAlign: "center",
    marginTop: 23,
  },
});