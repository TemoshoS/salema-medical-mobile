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

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

const PURPLE = "#6425A5";
const DEEP = "#260B40";
const TEXT = "#261633";
const MUTED = "#82758D";

export default function ForgotPasswordScreen({
  route,
  navigation,
}: Props) {
  const [email, setEmail] = useState(route.params?.email ?? "");
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      Alert.alert("Invalid email", "Enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const result = await apiRequest<{ message?: string }>(
        "/auth/forgot-password",
        {
          method: "POST",
          authenticated: false,
          body: { email: normalizedEmail },
        }
      );

      Alert.alert(
        "Check your email",
        result.message ||
          "If an account exists for that email, a reset code has been sent.",
        [
          {
            text: "Continue",
            onPress: () =>
              navigation.navigate("ResetPassword", {
                email: normalizedEmail,
              }),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Request failed",
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
        <LinearGradient
          colors={["#7540AD", "#461477", "#191044"]}
          locations={[0, 0.48, 1]}
          style={styles.header}
        >
          <View pointerEvents="none" style={styles.decorCircleOne} />
          <View pointerEvents="none" style={styles.decorCircleTwo} />
          <View pointerEvents="none" style={styles.decorCircleThree} />

          <Pressable
            onPress={() => navigation.navigate("Login")}
            disabled={loading}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹  Back to login</Text>
          </Pressable>

          <View style={styles.brandContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoLetter}>S+</Text>
            </View>

            <Text style={styles.brand}>SALEMA MEDICAL</Text>
            <Text style={styles.tagline}>BEYOND EXPECTATIONS</Text>
          </View>

          <View style={styles.welcomeContainer}>
            <Text style={styles.heading}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Recover access to your account.
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.formPanel}>
          <Text style={styles.sectionHeading}>Reset your password</Text>

          <Text style={styles.description}>
            Enter your registered email address and we'll send you a secure
            reset code.
          </Text>

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
              editable={!loading}
              selectionColor={PURPLE}
              returnKeyType="send"
              onSubmitEditing={sendCode}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !loading && styles.buttonPressed,
              loading && styles.disabled,
            ]}
            onPress={sendCode}
            disabled={loading}
          >
            <LinearGradient
              colors={["#7540AD", "#6425A5", "#260B40"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  SEND RESET CODE
                </Text>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
            style={styles.backLink}
            onPress={() => navigation.navigate("Login")}
            disabled={loading}
          >
            <Text style={styles.backLinkText}>RETURN TO SIGN IN</Text>
          </Pressable>

          <Text style={styles.footer}>
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

  header: {
    minHeight: 340,
    paddingTop: Platform.OS === "ios" ? 55 : 42,
    paddingHorizontal: 25,
    paddingBottom: 70,
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

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 12,
  },

  backText: {
    color: "#E8D9F5",
    fontSize: 13,
    fontWeight: "800",
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
    marginTop: 30,
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

  formPanel: {
    flexGrow: 1,
    backgroundColor: "#EDEBED",
    marginTop: -65,
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    paddingHorizontal: 29,
    paddingTop: 43,
    paddingBottom: 28,
    minHeight: 390,
  },

  sectionHeading: {
    color: DEEP,
    fontSize: 23,
    fontWeight: "900",
  },

  description: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },

  label: {
    color: PURPLE,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 28,
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

  primaryButton: {
    minHeight: 51,
    borderRadius: 30,
    overflow: "hidden",
    marginTop: 30,
  },

  buttonGradient: {
    flex: 1,
    minHeight: 51,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
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

  backLink: {
    alignItems: "center",
    paddingTop: 22,
    paddingBottom: 12,
  },

  backLinkText: {
    color: PURPLE,
    fontSize: 12,
    fontWeight: "800",
  },

  footer: {
    color: "#918996",
    fontSize: 8,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 22,
    letterSpacing: 1,
  },
});
