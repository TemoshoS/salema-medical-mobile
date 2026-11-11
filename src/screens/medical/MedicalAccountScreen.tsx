import { Alert } from "../../utils/salemaAlert";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

const purple = "#461477";

export default function MedicalAccountScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();

  const confirmLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => void signOut(),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
  onPress={() => navigation.goBack()}
  style={styles.backButton}
  accessibilityRole="button"
  accessibilityLabel="Go back"
>
  <Ionicons name="arrow-back" size={22} color={purple} />
  <Text style={styles.backButtonText}>Back</Text>
</Pressable>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={43} color={purple} />
          </View>
          <Text style={styles.name}>{user?.fullName || "Salema user"}</Text>
          <Text style={styles.email}>{user?.email || "No email available"}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={15} color={purple} />
            <Text style={styles.roleText}>Role: {user?.role || "User"}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Account information</Text>

        <View style={styles.infoCard}>
          <InfoRow
            icon="person-outline"
            label="Full name"
            value={user?.fullName || "Not available"}
          />
          <View style={styles.separator} />
          <InfoRow
            icon="mail-outline"
            label="Email address"
            value={user?.email || "Not available"}
          />
          <View style={styles.separator} />
          <InfoRow
            icon="shield-checkmark-outline"
            label="Account role"
            value={user?.role || "User"}
          />
        </View>

        <View style={styles.privacyCard}>
          <Ionicons name="lock-closed" size={22} color={purple} />
          <View style={styles.privacyCopy}>
            <Text style={styles.privacyTitle}>Your privacy matters</Text>
            <Text style={styles.privacyText}>
              Medical information should only be shared with authorised
              participants involved in your request.
            </Text>
          </View>
        </View>

        <Pressable style={styles.logoutButton} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={21} color="#A30E35" />
          <Text style={styles.logoutText}>Log out of Salema</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

type InfoRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={21} color={purple} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F6FC" },
  content: { padding: 20, paddingBottom: 35 },
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
  profile: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6DDF5",
    borderRadius: 20,
    padding: 24,
    marginBottom: 25,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 30,
    backgroundColor: "#F1EAFB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  name: {
    color: "#191044",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  email: { color: "#626782", fontSize: 13, marginTop: 7 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1EAFB",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 13,
  },
  roleText: { color: purple, fontSize: 12, fontWeight: "800" },
  sectionTitle: {
    color: "#191044",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6DDF5",
    borderRadius: 16,
    paddingHorizontal: 15,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  infoIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: "#F1EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  infoCopy: { flex: 1 },
  infoLabel: { color: "#77748A", fontSize: 12 },
  infoValue: {
    color: "#191044",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 5,
  },
  separator: { height: 1, backgroundColor: "#EEE8F5" },
  privacyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    backgroundColor: "#EEE8F7",
    borderRadius: 15,
    padding: 15,
    marginTop: 20,
  },
  privacyCopy: { flex: 1 },
  privacyTitle: { color: "#191044", fontSize: 14, fontWeight: "900" },
  privacyText: {
    color: "#626782",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 5,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E7BFC7",
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginTop: 24,
  },
  logoutText: { color: "#A30E35", fontSize: 14, fontWeight: "900" },
});