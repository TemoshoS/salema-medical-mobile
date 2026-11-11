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

type Props = NativeStackScreenProps<RootStackParamList, "ProviderRegister">;
type ProviderType =
  | "AMBULANCE_COMPANY"
  | "MEDICAL_TRANSPORT_COMPANY"
  | "INDIVIDUAL_DRIVER";

const PURPLE = "#461477";
const INK = "#191044";
const MUTED = "#73738A";

const categories: { value: ProviderType; label: string; detail: string }[] = [
  {
    value: "AMBULANCE_COMPANY",
    label: "Ambulance company",
    detail: "Emergency ambulance services",
  },
  {
    value: "MEDICAL_TRANSPORT_COMPANY",
    label: "Medical transport company",
    detail: "Non-emergency patient transport",
  },
  {
    value: "INDIVIDUAL_DRIVER",
    label: "Individual driver",
    detail: "Eligible non-emergency medical transport",
  },
];

type ResponseData = { message?: string; email?: string };

export default function ProviderRegistrationScreen({ navigation }: Props) {
  const [providerType, setProviderType] =
    useState<ProviderType>("AMBULANCE_COMPANY");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [businessRegistrationNumber, setBusinessRegistrationNumber] =
    useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleRegistrationNumber, setVehicleRegistrationNumber] =
    useState("");
  const [operatingLicenceNumber, setOperatingLicenceNumber] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [qualificationsSummary, setQualificationsSummary] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const isCompany = providerType !== "INDIVIDUAL_DRIVER";

  function validate() {
    if (
      !fullName.trim() ||
      !email.trim() ||
      !phoneNumber.trim() ||
      !password ||
      !confirmPassword ||
      !vehicleType.trim() ||
      !vehicleRegistrationNumber.trim() ||
      !serviceArea.trim()
    ) {
      Alert.alert("Missing information", "Complete all required fields.");
      return false;
    }

    if (isCompany && !organisationName.trim()) {
      Alert.alert("Organisation required", "Enter your organisation name.");
      return false;
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
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("Passwords do not match", "Check your password confirmation.");
      return false;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      Alert.alert("Invalid email", "Enter a valid email address.");
      return false;
    }

    return true;
  }

  async function submitApplication() {
    if (loading || !validate()) return;

    setLoading(true);
    try {
      const result = await apiRequest<ResponseData>(
        "/providers/applications",
        {
          method: "POST",
          authenticated: false,
          body: {
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            phoneNumber: phoneNumber.trim(),
            password,
            providerType,
            ...(isCompany
              ? {
                  organisationName: organisationName.trim(),
                  businessRegistrationNumber:
                    businessRegistrationNumber.trim(),
                }
              : {}),
            vehicleType: vehicleType.trim(),
            vehicleRegistrationNumber: vehicleRegistrationNumber.trim(),
            operatingLicenceNumber: operatingLicenceNumber.trim(),
            serviceArea: serviceArea.trim(),
            qualificationsSummary: qualificationsSummary.trim(),
            additionalNotes: additionalNotes.trim(),
          },
        }
      );

      Alert.alert(
        "Application submitted",
        result.message ||
          "Your application was received. Verify your email to continue.",
        [{
          text: "Continue",
          onPress: () =>
            navigation.navigate("VerifyEmail", {
              email: email.trim().toLowerCase(),
            }),
        }]
      );
    } catch (error) {
      Alert.alert(
        "Application not submitted",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function field(
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    options: {
      optional?: boolean;
      secure?: boolean;
      multiline?: boolean;
      keyboardType?: "default" | "email-address" | "phone-pad";
      autoCapitalize?: "none" | "sentences";
      placeholder?: string;
    } = {}
  ) {
    return (
      <View style={styles.field} key={label}>
        <Text style={styles.label}>
          {label}{options.optional ? " (optional)" : " *"}
        </Text>
        <TextInput
          style={[styles.input, options.multiline && styles.multiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={options.placeholder || label}
          placeholderTextColor="#9994A8"
          secureTextEntry={options.secure}
          multiline={options.multiline}
          keyboardType={options.keyboardType || "default"}
          autoCapitalize={options.autoCapitalize || "sentences"}
          editable={!loading}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹  Back</Text>
        </Pressable>

        <Text style={styles.eyebrow}>SALEMA MEDICAL PROVIDER NETWORK</Text>
        <Text style={styles.title}>Apply to become a provider</Text>
        <Text style={styles.subtitle}>
          Submit your details for review. Email verification and approval are
          required before you can provide services.
        </Text>

        <Text style={styles.sectionTitle}>1. Provider category</Text>
        {categories.map((item) => {
          const selected = providerType === item.value;
          return (
            <Pressable
              key={item.value}
              onPress={() => setProviderType(item.value)}
              disabled={loading}
              style={[styles.choice, selected && styles.choiceSelected]}
            >
              <View style={styles.choiceInfo}>
                <Text style={[styles.choiceTitle, selected && styles.selected]}>
                  {item.label}
                </Text>
                <Text style={styles.choiceDetail}>{item.detail}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
            </Pressable>
          );
        })}

        <Text style={styles.sectionTitle}>2. Applicant details</Text>
        {field("Full name", fullName, setFullName)}
        {field("Email address", email, setEmail, {
          keyboardType: "email-address",
          autoCapitalize: "none",
        })}
        {field("Contact number", phoneNumber, setPhoneNumber, {
          keyboardType: "phone-pad",
        })}
        {field("Password", password, setPassword, {
          secure: true,
          autoCapitalize: "none",
        })}
        {field("Confirm password", confirmPassword, setConfirmPassword, {
          secure: true,
          autoCapitalize: "none",
        })}
        <Text style={styles.helper}>
          Password must be 6–128 characters and include a number and a special character.
        </Text>

        <Text style={styles.sectionTitle}>3. Organisation and vehicle</Text>
        {isCompany
          ? field("Organisation name", organisationName, setOrganisationName)
          : null}
        {isCompany
          ? field(
              "Business registration number",
              businessRegistrationNumber,
              setBusinessRegistrationNumber,
              { optional: true }
            )
          : null}
        {field("Vehicle type", vehicleType, setVehicleType, {
          placeholder: "e.g. Ambulance or wheelchair vehicle",
        })}
        {field(
          "Vehicle registration number",
          vehicleRegistrationNumber,
          setVehicleRegistrationNumber
        )}
        {field(
          "Operating licence number",
          operatingLicenceNumber,
          setOperatingLicenceNumber,
          { optional: true }
        )}

        <Text style={styles.sectionTitle}>4. Service information</Text>
        {field("Service area", serviceArea, setServiceArea, {
          placeholder: "e.g. Benoni, Johannesburg, Gauteng",
        })}
        {field(
          "Qualifications / certifications",
          qualificationsSummary,
          setQualificationsSummary,
          { optional: true, multiline: true }
        )}
        {field("Additional notes", additionalNotes, setAdditionalNotes, {
          optional: true,
          multiline: true,
        })}

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Application review</Text>
          <Text style={styles.noticeText}>
            Submitting this form does not activate a provider account.
            Verification and Salema Medical approval are required before
            provider services can be accessed.
          </Text>
        </View>

        <Pressable
          style={[styles.submit, loading && styles.disabled]}
          onPress={submitApplication}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>Submit provider application</Text>
          )}
        </Pressable>

        <Text style={styles.footer}>SALEMA MEDICAL  ·  BEYOND EXPECTATIONS</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F6FC" },
  content: { padding: 22, paddingBottom: 42 },
  back: { paddingVertical: 8, marginBottom: 18 },
  backText: { color: PURPLE, fontSize: 15, fontWeight: "800" },
  eyebrow: {
    color: PURPLE,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: { color: INK, fontSize: 27, fontWeight: "900", marginBottom: 9 },
  subtitle: { color: MUTED, fontSize: 14, lineHeight: 21, marginBottom: 24 },
  sectionTitle: {
    color: INK,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 22,
    marginBottom: 12,
  },
  choice: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5DDF0",
    borderRadius: 13,
    padding: 15,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
  },
  choiceSelected: { borderColor: PURPLE, backgroundColor: "#F4EFFA" },
  choiceInfo: { flex: 1 },
  choiceTitle: { color: INK, fontSize: 14, fontWeight: "800" },
  selected: { color: PURPLE },
  choiceDetail: { color: MUTED, fontSize: 12, marginTop: 4 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#B9AEC8",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  radioSelected: { borderColor: PURPLE },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PURPLE },
  field: { marginBottom: 13 },
  label: { color: INK, fontSize: 12, fontWeight: "800", marginBottom: 7 },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5DDF0",
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: INK,
    fontSize: 14,
  },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  helper: { color: MUTED, fontSize: 11, lineHeight: 17, marginTop: -4 },
  notice: { backgroundColor: "#F0EAF7", borderRadius: 13, padding: 15, marginTop: 22 },
  noticeTitle: { color: PURPLE, fontSize: 13, fontWeight: "900", marginBottom: 6 },
  noticeText: { color: INK, fontSize: 12, lineHeight: 18 },
  submit: {
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  disabled: { opacity: 0.65 },
  submitText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  footer: {
    color: MUTED,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 28,
  },
});
