
import { Alert } from "../utils/salemaAlert";
import React, { useState } from "react";
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
const TEXT = "#261633";
const MUTED = "#82758D";

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
        {/* Purple gradient header */}
        <LinearGradient
          colors={["#7540AD", "#461477", "#191044"]}
          locations={[0, 0.48, 1]}
          style={styles.header}
        >
          {/* Decorative shapes */}
          <View style={styles.decorCircleOne} />
          <View style={styles.decorCircleTwo} />
          <View style={styles.decorCircleThree} />

          <View style={styles.brandContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoLetter}>S+</Text>
            </View>

            <Text style={styles.brand}>SALEMA MEDICAL</Text>
            <Text style={styles.tagline}>BEYOND EXPECTATIONS</Text>
          </View>

          <View style={styles.welcomeContainer}>
            <Text style={styles.heading}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to access your account.
            </Text>
          </View>
        </LinearGradient>

        {/* Curved integrated form section */}
        <View style={styles.formPanel}>
          {/* Email */}
          <Text style={styles.label}>EMAIL ADDRESS</Text>

          <View style={styles.inputShell}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#918997"
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

          {/* Password */}
          <Text style={styles.label}>PASSWORD</Text>

          <View style={styles.inputShell}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#918997"
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
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={
                showPassword ? "Hide password" : "Show password"
              }
              style={styles.visibilityButton}
            >
              <Text style={styles.visibilityText}>
                {showPassword ? "HIDE" : "SHOW"}
              </Text>
            </Pressable>
          </View>

          {/* Forgot password */}
          <Pressable
            onPress={() =>
              navigation.navigate("ForgotPassword", {
                email: email.trim().toLowerCase(),
              })
            }
            style={styles.forgotPasswordLink}
            disabled={loading}
          >
            <Text style={styles.linkText}>Forgot password?</Text>
          </Pressable>

          {/* Sign in */}
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
            <LinearGradient
              colors={["#7540AD", "#461477", "#191044"]}
              locations={[0, 0.48, 1]}
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>SIGN IN</Text>
              )}
            </LinearGradient>
          </Pressable>

          {/* Registration */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>NEW TO SALEMA?</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryPressed,
              loading && styles.disabled,
            ]}
            onPress={() => navigation.navigate("Register")}
            disabled={loading}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>
              CREATE AN ACCOUNT
            </Text>
          </Pressable>

          {/* Provider registration */}
          <Pressable
            onPress={() => navigation.navigate("ProviderRegister")}
            disabled={loading}
            style={styles.providerLink}
          >
            <Text style={styles.providerText}>
              Medical provider? Apply to join Salema
            </Text>
          </Pressable>

          <Text style={styles.footerText}>
            SALEMA MEDICAL · BEYOND EXPECTATIONS
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#DAD8DC",
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 0,
  },

  // Gradient header
  header: {
    minHeight: 340,
    paddingTop: Platform.OS === "ios" ? 55 : 42,
    paddingHorizontal: 25,
    alignItems: "center",
    overflow: "hidden",
  },

  decorCircleOne: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#FFFFFF",
    opacity: 0.07,
    top: -65,
    right: -45,
  },

  decorCircleTwo: {
    position: "absolute",
    width: 105,
    height: 105,
    borderRadius: 53,
    backgroundColor: "#C6A0EA",
    opacity: 0.14,
    top: 115,
    left: -55,
  },

  decorCircleThree: {
    position: "absolute",
    width: 75,
    height: 75,
    borderRadius: 38,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    opacity: 0.15,
    right: 25,
    bottom: 45,
  },

  brandContainer: {
    alignItems: "center",
  },

  logo: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  logoLetter: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
  },

  brand: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 2,
  },

  tagline: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 5,
  },

  welcomeContainer: {
    alignItems: "center",
    marginTop: 37,
  },

  heading: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  subtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    marginTop: 8,
  },

  // Integrated grey form panel
  formPanel: {
    flexGrow: 1,
    backgroundColor: "#EDEBED",
    marginTop: -65,
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    paddingHorizontal: 29,
    paddingTop: 43,
    paddingBottom: 28,
    minHeight: 475,
  },

  label: {
    color: PURPLE,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 21,
    marginBottom: 3,
  },

  inputShell: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1.3,
    borderBottomColor: "#AAA5AE",
  },

  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 9,
    color: TEXT,
    fontSize: 14,
  },

  visibilityButton: {
    paddingLeft: 12,
    paddingVertical: 9,
  },

  visibilityText: {
    color: PURPLE,
    fontSize: 10,
    fontWeight: "800",
  },

  forgotPasswordLink: {
    alignSelf: "flex-end",
    paddingVertical: 18,
  },

  linkText: {
    color: PURPLE,
    fontSize: 12,
    fontWeight: "700",
  },

  primaryButton: {
    height: 54,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 18,
  },

  buttonGradient: {
    flex: 1,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  buttonPressed: {
    opacity: 0.8,
  },

  disabled: {
    opacity: 0.6,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 21,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#C9C4CC",
  },

  dividerText: {
    color: "#82758D",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginHorizontal: 12,
  },

  secondaryButton: {
    minHeight: 49,
    borderRadius: 999,
    borderWidth: 1.4,
    borderColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryPressed: {
    backgroundColor: "#DDD5E5",
  },

  secondaryButtonText: {
    color: DEEP,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.4,
  },

  providerLink: {
    alignItems: "center",
    paddingTop: 22,
    paddingBottom: 12,
  },

  providerText: {
    color: PURPLE,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },

  footerText: {
    color: "#918996",
    fontSize: 8,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 14,
    letterSpacing: 1,
  },
});
