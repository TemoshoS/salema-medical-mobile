import { Alert } from "../../utils/salemaAlert";

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";
import PickupAddressAutocomplete, {
  type SelectedPickup,
} from "../../components/medical/PickupAddressAutocomplete";


const purple = "#461477";

type CreateRequestResponse = {
  success: boolean;
  message?: string;
  request?: {
    requestId: string;
    serviceType: string;
    status: string;
    createdAt: string;
  };
};

export default function EmergencyScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();

  const [location, setLocation] = useState("");
  const [selectedPickup, setSelectedPickup] = useState<SelectedPickup | null>(null);
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitRequest = async () => {
    if (!location.trim() || !selectedPickup || selectedPickup.address !== location.trim() || !phone.trim() || !description.trim()) {
      Alert.alert(
        "Missing information",
        "Please enter your pickup location, callback number and a short description.",
      );
      return;
    }

    if (!token) {
      Alert.alert(
        "Sign in required",
        "Please sign in to submit a medical request.",
      );
      return;
    }

    if (submitting) return;

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/medical-requests`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          callbackNumber: phone.trim(),
          pickupAddress: location.trim(),
          pickupLocation: selectedPickup.location,
          serviceType: "EMERGENCY_AMBULANCE",
          description: description.trim(),
        }),
      });

      const data = (await response.json()) as CreateRequestResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || `Request failed with status ${response.status}.`,
        );
      }

      const requestId = data.request?.requestId;

      setLocation("");
      setSelectedPickup(null);
      setPhone("");
      setDescription("");

      Alert.alert(
        "Request submitted",
        [
          data.message ||
          "Your emergency ambulance request has been submitted.",
          requestId ? `Reference: ${requestId}` : "",
          "",
          "An ambulance has not necessarily been confirmed or dispatched. If this is an immediate emergency, contact the appropriate emergency service now.",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    } catch (error) {
      Alert.alert(
        "Unable to submit request",
        error instanceof Error
          ? error.message
          : "A network error occurred. Please check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={purple} />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <View style={styles.warning}>
          <Ionicons name="alert-circle" size={27} color="#B42323" />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>Medical emergency?</Text>
            <Text style={styles.warningText}>
              If someone is in immediate danger, contact the appropriate
              emergency service now. Do not wait for this app.
            </Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="medkit" size={37} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>Emergency Ambulance</Text>
          <Text style={styles.heroText}>
            Provide your location and a callback number so the control room
            can identify the information needed for assistance.
          </Text>
        </View>

        <Text style={styles.label}>Pickup location *</Text>
        <PickupAddressAutocomplete
          value={location}
          onChangeText={setLocation}
          onSelect={setSelectedPickup}
          placeholder="Street, suburb, landmark or gate"
          disabled={submitting}
        />

        <Text style={styles.label}>Callback number *</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Your contact number"
          placeholderTextColor="#9290A5"
          keyboardType="phone-pad"
          style={styles.input}
          accessibilityLabel="Callback number"
          editable={!submitting}
        />

        <Text style={styles.label}>What assistance is needed? *</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Briefly describe the situation"
          placeholderTextColor="#9290A5"
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.multiline]}
          accessibilityLabel="Emergency description"
          editable={!submitting}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting, busy: submitting }}
          style={({ pressed }) => [
            styles.submitButton,
            (pressed || submitting) && { opacity: 0.8 },
          ]}
          onPress={submitRequest}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={19} color="#FFFFFF" />
          )}
          <Text style={styles.submitText}>
            {submitting ? "Submitting..." : "Submit Request"}
          </Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          Submitting a request does not confirm ambulance dispatch. If this is
          an immediate emergency, contact the appropriate emergency service.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F6FC" },
  content: { padding: 20, paddingBottom: 35 },
  warning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    padding: 15,
    borderRadius: 14,
    backgroundColor: "#FFF0F0",
    borderWidth: 1,
    borderColor: "#F4CCCC",
    marginBottom: 20,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingRight: 16,
    marginBottom: 12,
  },
  backButtonText: {
    color: purple,
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 6,
  },
  warningTitle: { color: "#9D2020", fontSize: 15, fontWeight: "900" },
  warningText: {
    color: "#762929",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  hero: {
    alignItems: "center",
    backgroundColor: purple,
    borderRadius: 20,
    padding: 23,
    marginBottom: 24,
  },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.17)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  heroText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10,
  },
  label: {
    color: "#191044",
    fontWeight: "800",
    fontSize: 14,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DED5EC",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: "#191044",
    fontSize: 15,
  },
  multiline: { minHeight: 110 },
  submitButton: {
    backgroundColor: "#A30E35",
    borderRadius: 13,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 24,
  },
  submitText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
  disclaimer: {
    color: "#73738A",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 15,
  },
});
