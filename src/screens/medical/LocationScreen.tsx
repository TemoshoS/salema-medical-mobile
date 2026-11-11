import { Alert } from "../../utils/salemaAlert";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const purple = "#461477";

export default function LocationScreen() {
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [callback, setCallback] = useState("");
  const navigation = useNavigation();

  const confirmLocation = () => {
    if (!address.trim()) {
      Alert.alert("Location required", "Please enter your pickup address.");
      return;
    }

    Alert.alert(
      "Address entered",
      "Your address is currently only stored on this screen. GPS verification and saving to a medical request are not connected yet.",
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <Pressable
  onPress={() => navigation.goBack()}
  style={styles.backButton}
  accessibilityRole="button"
  accessibilityLabel="Go back"
>
  <Ionicons name="arrow-back" size={22} color={purple} />
  <Text style={styles.backButtonText}>Back</Text>
</Pressable>
        <View style={styles.mapPlaceholder}>
          <View style={styles.mapCircle}>
            <Ionicons name="location" size={38} color="#461477" />
          </View>
          <Text style={styles.mapTitle}>Pickup Location</Text>
          <Text style={styles.mapDescription}>
            GPS and interactive map have not been connected.
          </Text>
        </View>

        <Text style={styles.heading}>Confirm your location</Text>
        <Text style={styles.subtitle}>
          Enter enough detail for a responder to identify your pickup point.
        </Text>

        <Text style={styles.label}>Street address or area *</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Street, suburb or township"
          placeholderTextColor="#9290A5"
          style={styles.input}
        />

        <Text style={styles.label}>Landmark, building or gate</Text>
        <TextInput
          value={landmark}
          onChangeText={setLandmark}
          placeholder="e.g. Main entrance, Gate 2"
          placeholderTextColor="#9290A5"
          style={styles.input}
        />

        <Text style={styles.label}>Callback number</Text>
        <TextInput
          value={callback}
          onChangeText={setCallback}
          placeholder="Contact number"
          placeholderTextColor="#9290A5"
          keyboardType="phone-pad"
          style={styles.input}
        />

        <View style={styles.notice}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color="#765516"
          />
          <Text style={styles.noticeText}>
            This address has not been GPS-verified. Confirm it with the control
            room when requesting assistance.
          </Text>
        </View>

        <Pressable style={styles.button} onPress={confirmLocation}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Confirm Address</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F6FC" },
  content: { padding: 20 },
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
  mapPlaceholder: {
    height: 185,
    backgroundColor: "#EEE8F7",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    padding: 18,
  },
  mapCircle: {
    width: 67,
    height: 67,
    borderRadius: 34,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  mapTitle: { color: "#191044", fontWeight: "900", fontSize: 17 },
  mapDescription: {
    color: "#626782",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
  },
  heading: { color: "#191044", fontSize: 23, fontWeight: "900" },
  subtitle: {
    color: "#626782",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 13,
  },
  label: {
    color: "#191044",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 7,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DED5EC",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 13,
    color: "#191044",
    fontSize: 14,
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 13,
    backgroundColor: "#FFF6DF",
    borderRadius: 12,
    marginTop: 19,
  },
  noticeText: {
    flex: 1,
    color: "#765516",
    fontSize: 12,
    lineHeight: 18,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "#461477",
    borderRadius: 13,
    padding: 16,
    marginTop: 22,
  },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
});