
import { Alert } from "../../utils/salemaAlert";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";
import PickupAddressAutocomplete, {
  type SelectedPickup,
} from "../../components/medical/PickupAddressAutocomplete";

const PURPLE = "#6425A5";
const DEEP = "#260B40";
const TEXT = "#261633";
const MUTED = "#82758D";

export default function TransportScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();

  const [pickup, setPickup] = useState("");
  const [selectedPickup, setSelectedPickup] =
    useState<SelectedPickup | null>(null);
  const [destination, setDestination] = useState("");
  const [selectedDestination, setSelectedDestination] =
    useState<SelectedPickup | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [phone, setPhone] = useState("");
  const [wheelchair, setWheelchair] = useState(false);
  const [companion, setCompanion] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitBooking = async () => {
    if (submitting) return;

    if (!token) {
      Alert.alert(
        "Sign in required",
        "Please sign in to submit a medical transport request.",
      );
      return;
    }

    if (
      !pickup.trim() ||
      !selectedPickup ||
      selectedPickup.address !== pickup.trim() ||
      !destination.trim() ||
      !selectedDestination ||
      selectedDestination.address !== destination.trim() ||
      !date.trim() ||
      !time.trim() ||
      !phone.trim()
    ) {
      Alert.alert(
        "Missing information",
        "Please provide your pickup, destination, date, time and callback number.",
      );
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert("Invalid date", "Use YYYY-MM-DD format.");
      return;
    }

    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      Alert.alert("Invalid time", "Use 24-hour HH:MM format.");
      return;
    }

    if (!/^[+\d\s()-]{7,20}$/.test(phone.trim())) {
      Alert.alert("Invalid number", "Please enter a valid callback number.");
      return;
    }

    const requestedDate = new Date(`${date}T${time}:00`);

    if (
      Number.isNaN(requestedDate.getTime()) ||
      requestedDate.getFullYear() !== Number(date.slice(0, 4)) ||
      requestedDate.getMonth() + 1 !== Number(date.slice(5, 7)) ||
      requestedDate.getDate() !== Number(date.slice(8, 10))
    ) {
      Alert.alert("Invalid date", "Please enter a valid calendar date.");
      return;
    }

    if (requestedDate.getTime() <= Date.now()) {
      Alert.alert(
        "Invalid appointment",
        "Please select a future date and time.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/medical-requests`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          serviceType: "MEDICAL_TRANSPORT",
          callbackNumber: phone.trim(),
          pickupAddress: pickup.trim(),
          pickupLocation: selectedPickup.location,
          destinationAddress: selectedDestination.address,
          destinationLocation: selectedDestination.location,
          requestedDateTime: requestedDate.toISOString(),
          wheelchairRequired: wheelchair,
          companionTravelling: companion,
          transportNotes: notes.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || result.success !== true) {
        throw new Error(
          result.message || "Unable to submit your transport request.",
        );
      }

      const requestId = result.request?.requestId;

      Alert.alert(
        "Request submitted",
        [
          result.message ||
            "Your medical transport request has been submitted.",
          requestId ? `Reference: ${requestId}` : "",
          "Your transport is not confirmed until a provider accepts it.",
        ]
          .filter(Boolean)
          .join("\n\n"),
        [
          {
            text: "OK",
            onPress: () => {
              setPickup("");
              setSelectedPickup(null);
              setDestination("");
              setSelectedDestination(null);
              setDate("");
              setTime("");
              setPhone("");
              setWheelchair(false);
              setCompanion(false);
              setNotes("");
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Request unsuccessful",
        error instanceof Error
          ? error.message
          : "Unable to contact the server. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#7540AD", "#461477", "#191044"]}
          locations={[0, 0.48, 1]}
          style={styles.header}
        >
          <View style={styles.decorCircleOne} />
          <View style={styles.decorCircleTwo} />
          <View style={styles.decorCircleThree} />

          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={21} color="#FFFFFF" />
            <Text style={styles.backButtonText}>BACK</Text>
          </Pressable>

          <View style={styles.heroContent}>
            <View style={styles.heroIcon}>
              <Ionicons name="car-sport" size={35} color="#FFFFFF" />
            </View>

            <Text style={styles.heroTitle}>Medical Transport</Text>
            <Text style={styles.heroText}>
              Arrange planned transport to a hospital, clinic or medical
              appointment.
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.formPanel}>
          <Text style={styles.sectionTitle}>TRANSPORT DETAILS</Text>

          <Text style={styles.label}>PICKUP ADDRESS *</Text>
          <PickupAddressAutocomplete
            value={pickup}
            onChangeText={setPickup}
            onSelect={setSelectedPickup}
            placeholder="Where should we collect you?"
            disabled={submitting}
          />

          <Text style={styles.label}>DESTINATION *</Text>
          <PickupAddressAutocomplete
            value={destination}
            onChangeText={setDestination}
            onSelect={setSelectedDestination}
            placeholder="Search for a hospital or clinic"
            disabled={submitting}
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>DATE *</Text>
              <View style={styles.inputShell}>
                <TextInput
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#918997"
                  style={styles.input}
                  autoCapitalize="none"
                  editable={!submitting}
                  selectionColor={PURPLE}
                />
              </View>
            </View>

            <View style={styles.half}>
              <Text style={styles.label}>TIME *</Text>
              <View style={styles.inputShell}>
                <TextInput
                  value={time}
                  onChangeText={setTime}
                  placeholder="HH:MM"
                  placeholderTextColor="#918997"
                  style={styles.input}
                  keyboardType="numbers-and-punctuation"
                  editable={!submitting}
                  selectionColor={PURPLE}
                />
              </View>
            </View>
          </View>

          <Text style={styles.label}>CALLBACK NUMBER *</Text>
          <View style={styles.inputShell}>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Your contact number"
              placeholderTextColor="#918997"
              keyboardType="phone-pad"
              style={styles.input}
              editable={!submitting}
              selectionColor={PURPLE}
            />
          </View>

          <View style={styles.sectionDivider} />

          <Text style={styles.sectionTitle}>ADDITIONAL ASSISTANCE</Text>

          <View style={styles.optionRow}>
            <View style={styles.optionIcon}>
              <Ionicons name="accessibility-outline" size={21} color={PURPLE} />
            </View>
            <View style={styles.optionCopy}>
              <Text style={styles.optionTitle}>Wheelchair assistance</Text>
              <Text style={styles.optionDescription}>
                Mobility assistance required
              </Text>
            </View>
            <Switch
              value={wheelchair}
              onValueChange={setWheelchair}
              disabled={submitting}
              trackColor={{ false: "#C9C4CC", true: "#BDA4E5" }}
              thumbColor={wheelchair ? PURPLE : "#FFFFFF"}
            />
          </View>

          <View style={styles.optionDivider} />

          <View style={styles.optionRow}>
            <View style={styles.optionIcon}>
              <Ionicons name="people-outline" size={21} color={PURPLE} />
            </View>
            <View style={styles.optionCopy}>
              <Text style={styles.optionTitle}>Travelling companion</Text>
              <Text style={styles.optionDescription}>
                Someone will travel with me
              </Text>
            </View>
            <Switch
              value={companion}
              onValueChange={setCompanion}
              disabled={submitting}
              trackColor={{ false: "#C9C4CC", true: "#BDA4E5" }}
              thumbColor={companion ? PURPLE : "#FFFFFF"}
            />
          </View>

          <Text style={styles.label}>ADDITIONAL NOTES</Text>
          <View style={[styles.inputShell, styles.notesShell]}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Any other transport requirements..."
              placeholderTextColor="#918997"
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.multiline]}
              editable={!submitting}
              selectionColor={PURPLE}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !submitting && styles.buttonPressed,
              submitting && styles.disabled,
            ]}
            onPress={submitBooking}
            disabled={submitting}
          >
            <LinearGradient
              colors={["#7540AD", "#461477", "#191044"]}
              locations={[0, 0.48, 1]}
              style={styles.buttonGradient}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="calendar-outline"
                    size={19}
                    color="#FFFFFF"
                  />
                  <Text style={styles.primaryButtonText}>
                    REQUEST TRANSPORT
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Text style={styles.disclaimer}>
            Your request is not confirmed until a transport provider accepts
            it.
          </Text>

          <Text style={styles.footerText}>
            SALEMA MEDICAL · BEYOND EXPECTATIONS
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    minHeight: 315,
    paddingTop: Platform.OS === "ios" ? 20 : 12,
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
    bottom: 35,
  },

  backButton: {
  alignSelf: "flex-start",
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 12,
  paddingRight: 20,
  marginTop: 25,
  zIndex: 10,
  elevation: 10,
},

  backButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginLeft: 8,
  },

  heroContent: {
    alignItems: "center",
    marginTop: 15,
    paddingBottom: 65,
  },

  heroIcon: {
    width: 65,
    height: 65,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  heroText: {
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 290,
  },

  formPanel: {
    flexGrow: 1,
    backgroundColor: "#EDEBED",
    marginTop: -45,
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    paddingHorizontal: 25,
    paddingTop: 34,
    paddingBottom: 28,
  },

  sectionTitle: {
    color: DEEP,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 9,
    marginTop: 3,
  },

  label: {
    color: PURPLE,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 19,
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
    paddingVertical: 10,
    color: TEXT,
    fontSize: 14,
  },

  row: {
    flexDirection: "row",
    gap: 15,
  },

  half: {
    flex: 1,
    minWidth: 0,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: "#C9C4CC",
    marginTop: 27,
    marginBottom: 24,
  },

  optionRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  optionIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: "rgba(100,37,165,0.09)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  optionCopy: {
    flex: 1,
    paddingRight: 8,
  },

  optionTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "800",
  },

  optionDescription: {
    color: MUTED,
    fontSize: 11,
    marginTop: 4,
  },

  optionDivider: {
    height: 1,
    backgroundColor: "#D5D0D8",
    marginLeft: 51,
  },

  notesShell: {
    minHeight: 85,
    alignItems: "flex-start",
  },

  multiline: {
    minHeight: 80,
    paddingTop: 12,
  },

  primaryButton: {
    height: 54,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 27,
  },

  buttonGradient: {
    flex: 1,
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
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

  disclaimer: {
    color: MUTED,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 14,
    paddingHorizontal: 8,
  },

  footerText: {
    color: "#918996",
    fontSize: 8,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 27,
    letterSpacing: 1,
  },
});
