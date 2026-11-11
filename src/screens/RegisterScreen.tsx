
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

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

type RegisterResponse = {
  success: boolean;
  message: string;
};

const PURPLE = "#6425A5";
const DEEP = "#260B40";
const TEXT = "#261633";
const MUTED = "#82758D";

export default function RegisterScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      Alert.alert(
        "Passwords do not match",
        "Please make sure both passwords are identical."
      );
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
        {/* Gradient header */}
        <LinearGradient
          colors={["#7540AD", "#461477", "#191044"]}
          locations={[0, 0.48, 1]}
          style={styles.header}
        >
          {/* Decorative shapes */}
          <View style={styles.decorCircleOne} />
          <View style={styles.decorCircleTwo} />
          <View style={styles.decorCircleThree} />

          <Pressable
            onPress={() => navigation.navigate("Login")}
            style={styles.backButton}
            disabled={loading}
          >
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backText}>Back to login</Text>
          </Pressable>

          {/* Branding */}
          <View style={styles.brandContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoLetter}>S+</Text>
            </View>

            <Text style={styles.brand}>SALEMA MEDICAL</Text>
            <Text style={styles.tagline}>BEYOND EXPECTATIONS</Text>
          </View>

          <View style={styles.welcomeContainer}>
            <Text style={styles.heading}>Create Your Account</Text>
            <Text style={styles.subtitle}>
              Join Salema Medical today.
            </Text>
          </View>
        </LinearGradient>

        {/* Curved registration section */}
        <View style={styles.formPanel}>
          {/* Full name */}
          <Text style={styles.label}>FULL NAME</Text>

          <View style={styles.inputShell}>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor="#918997"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              editable={!loading}
              selectionColor={PURPLE}
            />
          </View>

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

          {/* Phone */}
          <Text style={styles.label}>PHONE NUMBER</Text>

          <View style={styles.inputShell}>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Enter your phone number"
              placeholderTextColor="#918997"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
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
              placeholder="Create a password"
              placeholderTextColor="#918997"
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
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

          {/* Confirm password */}
          <Text style={styles.label}>CONFIRM PASSWORD</Text>

          <View style={styles.inputShell}>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              placeholderTextColor="#918997"
              secureTextEntry={!showConfirmPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              editable={!loading}
              selectionColor={PURPLE}
            />

            <Pressable
              onPress={() =>
                setShowConfirmPassword((value) => !value)
              }
              style={styles.visibilityButton}
              accessibilityRole="button"
              accessibilityLabel={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
              disabled={loading}
            >
              <Text style={styles.visibilityText}>
                {showConfirmPassword ? "HIDE" : "SHOW"}
              </Text>
            </Pressable>
          </View>

          {/* Password requirement */}
          <Text style={styles.passwordHint}>
            6–128 characters, with at least one number and one special character.
          </Text>

          {/* Create account */}
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
            <LinearGradient
              colors={["#7540AD", "#461477", "#191044"]}
              locations={[0, 0.48, 1]}
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  CREATE ACCOUNT
                </Text>
              )}
            </LinearGradient>
          </Pressable>

          {/* Provider registration */}
          <Pressable
            onPress={() => navigation.navigate("ProviderRegister")}
            disabled={loading}
            style={styles.providerLink}
          >
            <Text style={styles.providerText}>
              Register as a medical provider
            </Text>
          </Pressable>

          {/* Existing account */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?
            </Text>

            <Pressable
              onPress={() => navigation.navigate("Login")}
              disabled={loading}
            >
              <Text style={styles.footerLink}> Sign in</Text>
            </Pressable>
          </View>

          <Text style={styles.bottomNote}>
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
    minHeight: 305,
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
    bottom: 30,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 20,
    paddingVertical: 5,
  },

  backArrow: {
    color: "#FFFFFF",
    fontSize: 29,
    marginRight: 7,
    lineHeight: 30,
  },

  backText: {
    color: "#E5D6F1",
    fontSize: 12,
    fontWeight: "700",
  },

  brandContainer: {
    alignItems: "center",
  },

  logo: {
    width: 54,
    height: 54,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  logoLetter: {
    color: "#FFFFFF",
    fontSize: 26,
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
    marginTop: 28,
    marginBottom: 25,
  },

  heading: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    textAlign: "center",
  },

  subtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    marginTop: 8,
  },

  // Integrated form panel
  formPanel: {
    flexGrow: 1,
    backgroundColor: "#EDEBED",
    marginTop: -48,
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    paddingHorizontal: 29,
    paddingTop: 31,
    paddingBottom: 28,
    minHeight: 570,
  },

  label: {
    color: PURPLE,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 3,
  },

  inputShell: {
    minHeight: 43,
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

  passwordHint: {
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 13,
  },

  primaryButton: {
    height: 54,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 23,
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
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  buttonPressed: {
    opacity: 0.8,
  },

  disabled: {
    opacity: 0.6,
  },

  providerLink: {
    alignItems: "center",
    paddingTop: 23,
    paddingBottom: 13,
  },

  providerText: {
    color: PURPLE,
    fontSize: 12,
    fontWeight: "800",
  },

  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  footerText: {
    color: MUTED,
    fontSize: 11,
  },

  footerLink: {
    color: PURPLE,
    fontSize: 11,
    fontWeight: "900",
  },

  bottomNote: {
    color: "#918996",
    fontSize: 8,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 25,
    letterSpacing: 1,
  },
});
