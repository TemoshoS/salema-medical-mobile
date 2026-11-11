
import { Alert } from "../utils/salemaAlert";
import React, { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { apiUpload } from "../services/apiClient";

type Props = NativeStackScreenProps<RootStackParamList, "ProviderRegister">;

type ProviderType =
  | "AMBULANCE_COMPANY"
  | "MEDICAL_TRANSPORT_COMPANY"
  | "INDIVIDUAL_DRIVER";

type ProviderDocumentType =
  | "IDENTITY_DOCUMENT"
  | "DRIVERS_LICENCE"
  | "VEHICLE_REGISTRATION_OR_OWNERSHIP"
  | "INSURANCE"
  | "ROADWORTHINESS"
  | "PRDP"
  | "OPERATING_PERMIT";

type PickedDocument = DocumentPicker.DocumentPickerAsset;
type ResponseData = { message?: string; email?: string };

const PURPLE = "#6425A5";
const DEEP = "#260B40";
const TEXT = "#261633";
const MUTED = "#82758D";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const categories: {
  value: ProviderType;
  label: string;
  detail: string;
}[] = [
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
      detail: "Non-emergency medical transport",
    },
  ];

const documentOptions: {
  type: ProviderDocumentType;
  label: string;
  required: boolean;
  detail: string;
}[] = [
    {
      type: "IDENTITY_DOCUMENT",
      label: "Identity document",
      required: true,
      detail: "Identity document or accepted identity evidence",
    },
    {
      type: "DRIVERS_LICENCE",
      label: "Driver's licence",
      required: true,
      detail: "A clear copy of the driver's licence",
    },
    {
      type: "VEHICLE_REGISTRATION_OR_OWNERSHIP",
      label: "Vehicle registration / ownership",
      required: true,
      detail: "Registration, ownership or permission evidence",
    },
    {
      type: "INSURANCE",
      label: "Vehicle insurance",
      required: true,
      detail: "Current insurance evidence",
    },
    {
      type: "ROADWORTHINESS",
      label: "Roadworthiness certificate",
      required: false,
      detail: "Upload where applicable",
    },
    {
      type: "PRDP",
      label: "PrDP",
      required: false,
      detail: "Upload where applicable",
    },
    {
      type: "OPERATING_PERMIT",
      label: "Operating permit",
      required: false,
      detail: "Upload where applicable",
    },
  ];

const allowedMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

function documentMimeType(asset: PickedDocument): string | null {
  if (asset.mimeType && allowedMimeTypes.includes(asset.mimeType)) {
    return asset.mimeType;
  }

  const extension = asset.name.split(".").pop()?.toLowerCase();

  if (extension === "pdf") return "application/pdf";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";

  return null;
}

export default function ProviderRegistrationScreen({
  navigation,
}: Props) {
  const [providerType, setProviderType] =
    useState<ProviderType>("AMBULANCE_COMPANY");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [residentialAddress, setResidentialAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [organisationName, setOrganisationName] = useState("");
  const [businessRegistrationNumber, setBusinessRegistrationNumber] =
    useState("");

  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [passengerSeats, setPassengerSeats] = useState("");
  const [vehicleColour, setVehicleColour] = useState("");
  const [wheelchairAccessible, setWheelchairAccessible] = useState(false);
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleRegistrationNumber, setVehicleRegistrationNumber] =
    useState("");
  const [operatingLicenceNumber, setOperatingLicenceNumber] = useState("");

  const [serviceArea, setServiceArea] = useState("");
  const [qualificationsSummary, setQualificationsSummary] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const [documents, setDocuments] = useState<
    Partial<Record<ProviderDocumentType, PickedDocument>>
  >({});

  const [loading, setLoading] = useState(false);

  const isCompany = providerType !== "INDIVIDUAL_DRIVER";

  function validate(): boolean {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !identityNumber.trim() ||
      !residentialAddress.trim() ||
      !email.trim() ||
      !phoneNumber.trim() ||
      !password ||
      !confirmPassword ||
      !vehicleMake.trim() ||
      !vehicleModel.trim() ||
      !vehicleYear.trim() ||
      !passengerSeats.trim() ||
      !vehicleColour.trim() ||
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

    const year = Number(vehicleYear);
    const seats = Number(passengerSeats);

    if (
      !Number.isInteger(year) ||
      year < 1950 ||
      year > new Date().getFullYear() + 1
    ) {
      Alert.alert("Invalid vehicle year", "Enter a valid vehicle year.");
      return false;
    }

    if (!Number.isInteger(seats) || seats < 1 || seats > 100) {
      Alert.alert("Invalid passenger seats", "Enter a valid seat count.");
      return false;
    }

    const missing = documentOptions
      .filter((item) => item.required && !documents[item.type])
      .map((item) => item.label);

    if (missing.length) {
      Alert.alert(
        "Required documents missing",
        `Please upload:\n\n${missing.join("\n")}`
      );
      return false;
    }

    return true;
  }

  async function pickDocument(type: ProviderDocumentType) {
    if (loading) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: allowedMimeTypes,
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const mimeType = documentMimeType(asset);

      if (!mimeType) {
        Alert.alert("Unsupported document", "Choose a PDF, JPG or PNG file.");
        return;
      }

      if (asset.size !== undefined && asset.size > MAX_FILE_SIZE) {
        Alert.alert(
          "File too large",
          "Each document must be 10 MB or smaller."
        );
        return;
      }

      if (asset.size === 0) {
        Alert.alert("Empty document", "Choose a document containing data.");
        return;
      }

      setDocuments((current) => ({
        ...current,
        [type]: { ...asset, mimeType },
      }));
    } catch {
      Alert.alert("Document picker", "Unable to select that document.");
    }
  }

  function removeDocument(type: ProviderDocumentType) {
    setDocuments((current) => {
      const updated = { ...current };
      delete updated[type];
      return updated;
    });
  }

  async function submitApplication() {
    if (loading || !validate()) return;

    setLoading(true);

    try {
      const formData = new FormData();

      const fields: Record<string, string> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        identityNumber: identityNumber.trim(),
        residentialAddress: residentialAddress.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim(),
        password,
        providerType,
        vehicleMake: vehicleMake.trim(),
        vehicleModel: vehicleModel.trim(),
        vehicleYear: vehicleYear.trim(),
        passengerSeats: passengerSeats.trim(),
        vehicleColour: vehicleColour.trim(),
        wheelchairAccessible: String(wheelchairAccessible),
        vehicleType: vehicleType.trim(),
        vehicleRegistrationNumber: vehicleRegistrationNumber.trim(),
        operatingLicenceNumber: operatingLicenceNumber.trim(),
        serviceArea: serviceArea.trim(),
        qualificationsSummary: qualificationsSummary.trim(),
        additionalNotes: additionalNotes.trim(),
      };

      if (isCompany) {
        fields.organisationName = organisationName.trim();
        fields.businessRegistrationNumber =
          businessRegistrationNumber.trim();
      }

      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const selectedTypes: ProviderDocumentType[] = [];

      documentOptions.forEach((item) => {
        const asset = documents[item.type];
        if (!asset) return;

        const mimeType = documentMimeType(asset);
        if (!mimeType) {
          throw new Error(`Unsupported file: ${asset.name}`);
        }

        selectedTypes.push(item.type);

        const uploadFile = new File(asset.uri);

        if (!uploadFile.exists) {
          throw new Error(`Unable to access document: ${asset.name}`);
        }

        formData.append("documents", uploadFile, asset.name);
      });

      formData.append("documentTypes", JSON.stringify(selectedTypes));

      const result = await apiUpload<ResponseData>(
        "/providers/applications",
        formData
      );

      Alert.alert(
        "Application submitted",
        result.message ||
        "Your application was received. Verify your email to continue.",
        [
          {
            text: "Continue",
            onPress: () =>
              navigation.navigate("VerifyEmail", {
                email: email.trim().toLowerCase(),
              }),
          },
        ]
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
      keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
      autoCapitalize?: "none" | "sentences" | "characters";
      placeholder?: string;
      passwordVisibility?: boolean;
      onTogglePassword?: () => void;
    } = {}
  ) {
    return (
      <View style={styles.field} key={label}>
        <Text style={styles.label}>
          {label}
          {options.optional ? " (optional)" : " *"}
        </Text>

        <View
          style={[
            styles.inputShell,
            options.multiline && styles.multilineShell,
          ]}
        >
          <TextInput
            style={[styles.input, options.multiline && styles.multiline]}
            value={value}
            onChangeText={onChangeText}
            placeholder={options.placeholder || label}
            placeholderTextColor="#918997"
            secureTextEntry={options.secure}
            multiline={options.multiline}
            keyboardType={options.keyboardType || "default"}
            autoCapitalize={options.autoCapitalize || "sentences"}
            autoCorrect={!options.secure}
            editable={!loading}
            selectionColor={PURPLE}
          />

          {options.onTogglePassword ? (
            <Pressable
              onPress={options.onTogglePassword}
              disabled={loading}
              style={styles.visibilityButton}
            >
              <Text style={styles.visibilityText}>
                {options.passwordVisibility ? "HIDE" : "SHOW"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  function section(number: string, title: string) {
    return (
      <View style={styles.sectionHeading}>
        <View style={styles.sectionNumber}>
          <Text style={styles.sectionNumberText}>{number}</Text>
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionLine} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={["#7540AD", "#461477", "#191044"]}
            locations={[0, 0.48, 1]}
            style={styles.hero}
          >
            <View pointerEvents="none" style={styles.decorCircleOne} />
            <View pointerEvents="none" style={styles.decorCircleTwo} />
            <View pointerEvents="none" style={styles.decorCircleThree} />

           

            <View style={styles.brandContainer}>
              <View style={styles.logo}>
                <Text style={styles.logoLetter}>S+</Text>
              </View>

              <Text style={styles.brand}>SALEMA MEDICAL</Text>
              <Text style={styles.tagline}>BEYOND EXPECTATIONS</Text>
            </View>

            <View style={styles.welcomeContainer}>
              <Text style={styles.eyebrow}>PROVIDER NETWORK</Text>
              <Text style={styles.heroTitle}>Join Our Network</Text>
              <Text style={styles.heroDescription}>
                Apply to provide trusted medical transport services.
              </Text>
            </View>
          </LinearGradient>

          <View style={styles.formPanel}>
            {section("01", "Provider category")}

            <Text style={styles.helper}>
              Select the type of service you provide.
            </Text>

            {categories.map((item) => {
              const selected = providerType === item.value;

              return (
                <Pressable
                  key={item.value}
                  onPress={() => setProviderType(item.value)}
                  disabled={loading}
                  style={[
                    styles.choice,
                    selected && styles.choiceSelected,
                  ]}
                >
                  <View style={styles.choiceInfo}>
                    <Text
                      style={[
                        styles.choiceTitle,
                        selected && styles.selected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text style={styles.choiceDetail}>{item.detail}</Text>
                  </View>

                  <View
                    style={[
                      styles.radio,
                      selected && styles.radioSelected,
                    ]}
                  >
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              );
            })}

            {section("02", "Applicant details")}

            {field("First name", firstName, setFirstName)}
            {field("Last name", lastName, setLastName)}
            {field("Identity number", identityNumber, setIdentityNumber, {
              autoCapitalize: "none",
            })}
            {field(
              "Residential address",
              residentialAddress,
              setResidentialAddress,
              { multiline: true }
            )}
            {field("Email address", email, setEmail, {
              keyboardType: "email-address",
              autoCapitalize: "none",
            })}
            {field("Contact number", phoneNumber, setPhoneNumber, {
              keyboardType: "phone-pad",
              autoCapitalize: "none",
            })}
            {field("Password", password, setPassword, {
              secure: !showPassword,
              autoCapitalize: "none",
              passwordVisibility: showPassword,
              onTogglePassword: () => setShowPassword((value) => !value),
            })}
            {field("Confirm password", confirmPassword, setConfirmPassword, {
              secure: !showConfirmPassword,
              autoCapitalize: "none",
              passwordVisibility: showConfirmPassword,
              onTogglePassword: () =>
                setShowConfirmPassword((value) => !value),
            })}

            <Text style={styles.helper}>
              6–128 characters, including a number and special character.
            </Text>

            {section("03", "Organisation details")}

            {isCompany ? (
              <>
                {field(
                  "Organisation name",
                  organisationName,
                  setOrganisationName
                )}
                {field(
                  "Business registration number",
                  businessRegistrationNumber,
                  setBusinessRegistrationNumber,
                  { optional: true }
                )}
              </>
            ) : (
              <Text style={styles.helper}>
                Individual driver applications do not require organisation details.
              </Text>
            )}

            {section("04", "Vehicle details")}

            {field("Vehicle make", vehicleMake, setVehicleMake, {
              placeholder: "e.g. Toyota",
            })}
            {field("Vehicle model", vehicleModel, setVehicleModel, {
              placeholder: "e.g. Quantum",
            })}
            {field("Vehicle year", vehicleYear, setVehicleYear, {
              keyboardType: "numeric",
              autoCapitalize: "none",
            })}
            {field("Passenger seats", passengerSeats, setPassengerSeats, {
              keyboardType: "numeric",
              autoCapitalize: "none",
            })}
            {field("Vehicle colour", vehicleColour, setVehicleColour)}
            {field("Vehicle type", vehicleType, setVehicleType, {
              placeholder: "e.g. Ambulance or wheelchair vehicle",
            })}
            {field(
              "Vehicle registration number",
              vehicleRegistrationNumber,
              setVehicleRegistrationNumber,
              { autoCapitalize: "characters" }
            )}
            {field(
              "Operating licence number",
              operatingLicenceNumber,
              setOperatingLicenceNumber,
              { optional: true }
            )}

            <View style={styles.accessibilityRow}>
              <View style={styles.choiceInfo}>
                <Text style={styles.choiceTitle}>Wheelchair accessible</Text>
                <Text style={styles.choiceDetail}>
                  Can this vehicle accommodate a wheelchair?
                </Text>
              </View>

              <Pressable
                disabled={loading}
                onPress={() =>
                  setWheelchairAccessible((value) => !value)
                }
                style={[
                  styles.toggle,
                  wheelchairAccessible && styles.toggleSelected,
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    wheelchairAccessible && styles.toggleTextSelected,
                  ]}
                >
                  {wheelchairAccessible ? "Yes" : "No"}
                </Text>
              </Pressable>
            </View>

            {section("05", "Supporting documents")}

            <Text style={styles.helper}>
              PDF, JPG or PNG · Maximum 10 MB per document.
            </Text>

            {documentOptions.map((item, index) => {
              const selected = documents[item.type];

              return (
                <View
                  key={item.type}
                  style={[
                    styles.documentRow,
                    index === documentOptions.length - 1 &&
                    styles.documentLast,
                  ]}
                >
                  <View style={styles.documentTop}>
                    <View
                      style={[
                        styles.documentIcon,
                        selected && styles.documentIconSelected,
                      ]}
                    >
                      <Text style={styles.documentIconText}>
                        {selected ? "✓" : "PDF"}
                      </Text>
                    </View>

                    <View style={styles.documentInfo}>
                      <Text style={styles.documentTitle}>
                        {item.label}
                        {item.required ? " *" : " (optional)"}
                      </Text>
                      <Text style={styles.documentDetail}>
                        {item.detail}
                      </Text>
                      <Text
                        style={[
                          styles.documentStatus,
                          selected && styles.documentSelected,
                        ]}
                        numberOfLines={2}
                      >
                        {selected ? selected.name : "No document selected"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.documentActions}>
                    <Pressable
                      onPress={() => pickDocument(item.type)}
                      disabled={loading}
                      style={styles.documentButton}
                    >
                      <Text style={styles.documentButtonText}>
                        {selected ? "Replace" : "Choose file"}
                      </Text>
                    </Pressable>

                    {selected ? (
                      <Pressable
                        onPress={() => removeDocument(item.type)}
                        disabled={loading}
                        style={styles.removeButton}
                      >
                        <Text style={styles.removeButtonText}>Remove</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}

            {section("06", "Service information")}

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
              <View style={styles.noticeMark}>
                <Text style={styles.noticeMarkText}>i</Text>
              </View>
              <View style={styles.noticeCopy}>
                <Text style={styles.noticeTitle}>Application review</Text>
                <Text style={styles.noticeText}>
                  Your account becomes active only after email verification
                  and Salema Medical approval.
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.submit,
                pressed && !loading && styles.submitPressed,
                loading && styles.disabled,
              ]}
              onPress={submitApplication}
              disabled={loading}
            >
              <LinearGradient
                colors={["#7540AD", "#6425A5", "#260B40"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.submitGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.submitText}>
                      SUBMIT APPLICATION
                    </Text>
                    <Text style={styles.submitArrow}>→</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate("Login")}
              disabled={loading}
              style={styles.loginLink}
            >
              <Text style={styles.loginText}>
                Already registered?{" "}
                <Text style={styles.loginStrong}>Sign in</Text>
              </Text>
            </Pressable>

            <Text style={styles.footer}>
              SALEMA MEDICAL · BEYOND EXPECTATIONS
            </Text>
          </View>
        </ScrollView>
        <Pressable
          onPressIn={() => console.log("BACK BUTTON TOUCH RECEIVED")}
          onPress={() => {
            console.log("BACK BUTTON PRESSED");
            navigation.goBack();
          }}
          style={styles.backOverlay}
        >
          <Text style={styles.backText}>‹  Back</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#7540AD",
  },
  keyboard: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 0,
  },

  hero: {
    minHeight: 335,
    paddingHorizontal: 25,
    paddingTop: Platform.OS === "ios" ? 30 : 22,
    paddingBottom: 70,
    alignItems: "center",
    overflow: "hidden",
  },
  decorCircleOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#FFFFFF",
    opacity: 0.07,
    top: -75,
    right: -55,
  },
  decorCircleTwo: {
    position: "absolute",
    width: 125,
    height: 125,
    borderRadius: 63,
    backgroundColor: "#C6A0EA",
    opacity: 0.13,
    top: 125,
    left: -65,
  },
  decorCircleThree: {
    position: "absolute",
    width: 85,
    height: 85,
    borderRadius: 43,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    opacity: 0.17,
    right: 20,
    bottom: 35,
  },
  back: {
    alignSelf: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 13,
    marginLeft: -12,
    zIndex: 20,
    elevation: 20,
  },
  backOverlay: {
  position: "absolute",
  top: Platform.OS === "ios" ? 90 : 50,
  left: 25,
  zIndex: 9999,
  elevation: 9999,
  paddingVertical: 15,
  paddingHorizontal: 15,
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
    width: 56,
    height: 56,
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
    marginTop: 27,
  },
  eyebrow: {
    color: "#D6B8FF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  heroDescription: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 280,
  },

  formPanel: {
    flexGrow: 1,
    backgroundColor: "#EDEBED",
    marginTop: -48,
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    paddingHorizontal: 25,
    paddingTop: 34,
    paddingBottom: 30,
    minHeight: 600,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 27,
    marginBottom: 15,
  },
  sectionNumber: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  sectionNumberText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  sectionTitle: {
    color: DEEP,
    fontSize: 15,
    fontWeight: "900",
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#C8B8D5",
    marginLeft: 10,
  },

  helper: {
    color: MUTED,
    fontSize: 10,
    lineHeight: 16,
    marginTop: -4,
    marginBottom: 10,
  },

  choice: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#C9C3CD",
  },
  choiceSelected: {
    backgroundColor: "#E2D7ED",
    borderRadius: 11,
    borderBottomWidth: 0,
    marginBottom: 4,
  },
  choiceInfo: {
    flex: 1,
  },
  choiceTitle: {
    color: DEEP,
    fontSize: 12,
    fontWeight: "900",
  },
  selected: {
    color: PURPLE,
  },
  choiceDetail: {
    color: MUTED,
    fontSize: 10,
    marginTop: 4,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#A99BB4",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  radioSelected: {
    borderColor: PURPLE,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PURPLE,
  },

  field: {
    marginBottom: 13,
  },
  label: {
    color: PURPLE,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: 2,
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
    fontSize: 13,
  },
  multilineShell: {
    alignItems: "flex-start",
    minHeight: 85,
  },
  multiline: {
    minHeight: 78,
    textAlignVertical: "top",
  },
  visibilityButton: {
    paddingLeft: 12,
    paddingVertical: 9,
  },
  visibilityText: {
    color: PURPLE,
    fontSize: 9,
    fontWeight: "900",
  },

  accessibilityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginTop: 8,
    backgroundColor: "#E3DDE7",
    borderRadius: 12,
  },
  toggle: {
    borderWidth: 1,
    borderColor: "#A99BB4",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginLeft: 12,
  },
  toggleSelected: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  toggleText: {
    color: DEEP,
    fontSize: 11,
    fontWeight: "900",
  },
  toggleTextSelected: {
    color: "#FFFFFF",
  },

  documentRow: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#C9C3CD",
  },
  documentLast: {
    borderBottomWidth: 0,
  },
  documentTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  documentIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: "#DDD0E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  documentIconSelected: {
    backgroundColor: PURPLE,
  },
  documentIconText: {
    color: PURPLE,
    fontSize: 10,
    fontWeight: "900",
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    color: DEEP,
    fontSize: 12,
    fontWeight: "900",
  },
  documentDetail: {
    color: MUTED,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  documentStatus: {
    color: MUTED,
    fontSize: 10,
    marginTop: 5,
  },
  documentSelected: {
    color: PURPLE,
    fontWeight: "800",
  },
  documentActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginLeft: 51,
  },
  documentButton: {
    borderWidth: 1,
    borderColor: PURPLE,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  documentButtonText: {
    color: PURPLE,
    fontSize: 10,
    fontWeight: "900",
  },
  removeButton: {
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  removeButtonText: {
    color: "#A30E35",
    fontSize: 10,
    fontWeight: "900",
  },

  notice: {
    backgroundColor: "#E2D7ED",
    borderRadius: 13,
    padding: 14,
    marginTop: 23,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  noticeMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  noticeMarkText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  noticeCopy: {
    flex: 1,
  },
  noticeTitle: {
    color: PURPLE,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 4,
  },
  noticeText: {
    color: DEEP,
    fontSize: 10,
    lineHeight: 16,
  },

  submit: {
    minHeight: 53,
    borderRadius: 30,
    overflow: "hidden",
    marginTop: 23,
  },
  submitGradient: {
    flex: 1,
    minHeight: 53,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  submitArrow: {
    position: "absolute",
    right: 19,
    color: "#FFFFFF",
    fontSize: 21,
  },
  submitPressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },

  loginLink: {
    alignItems: "center",
    paddingVertical: 19,
  },
  loginText: {
    color: MUTED,
    fontSize: 11,
  },
  loginStrong: {
    color: PURPLE,
    fontWeight: "900",
  },
  footer: {
    color: "#918996",
    fontSize: 8,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 10,
    letterSpacing: 1,
  },
});
