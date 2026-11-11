import { Alert } from "../utils/salemaAlert";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/AppNavigator";
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PURPLE = "#461477";
const DEEP = "#191044";
const MUTED = "#73738A";
const RED = "#A30E35";

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const firstName = user?.fullName?.trim().split(" ")[0] || "there";

  const openEmergency = () => navigation.navigate("Emergency");
  const openTransport = () => navigation.navigate("Transport");

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
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.brandGroup}>
            <View style={styles.logo}>
              <Ionicons
                name="shield-checkmark"
                size={32}
                color={PURPLE}
              />
            </View>

            <View>
              <Text style={styles.brand}>SALEMA</Text>
              <Text style={styles.medical}>MEDICAL</Text>
              <Text style={styles.tagline}>BEYOND EXPECTATIONS</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="My medical requests"
            style={({ pressed }) => [
              styles.notificationButton,
              pressed && styles.pressed,
            ]}
            onPress={() => navigation.navigate("MedicalRequests")}
          >
            <Ionicons
              name="notifications-outline"
              size={23}
              color={DEEP}
            />
            <View style={styles.notificationDot} />
          </Pressable>
        </View>

        {/* WELCOME */}
        <LinearGradient
          colors={["#7540AD", "#461477", "#191044"]}
          locations={[0, 0.5, 1]}
          style={styles.welcomeCard}
        >
          <View style={styles.orbOne} />
          <View style={styles.orbTwo} />
          <View style={styles.orbThree} />

          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeLabel}>YOUR HEALTH, OUR PRIORITY</Text>

            <Text style={styles.greeting}>
              Hello, {firstName}
            </Text>

            <Text style={styles.welcomeSubtitle}>
              We're here whenever you need us.
            </Text>

            <View style={styles.welcomeBottom}>
              <View style={styles.memberTag}>
                <Ionicons
                  name="shield-checkmark"
                  size={14}
                  color="#FFFFFF"
                />
                <Text style={styles.memberTagText}>SAL​​EMA CARE</Text>
              </View>

              <Ionicons
                name="heart-circle"
                size={37}
                color="rgba(255,255,255,0.85)"
              />
            </View>
          </View>
        </LinearGradient>

        {/* SECTION TITLE */}
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Our Services</Text>
            <Text style={styles.sectionSubtitle}>
              Choose how we can assist you.
            </Text>
          </View>

          <View style={styles.serviceCount}>
            <Text style={styles.serviceCountText}>02</Text>
          </View>
        </View>

        {/* EMERGENCY SERVICE */}
        <View style={styles.emergencyCard}>
          <View style={styles.emergencyHeader}>
            <View style={styles.emergencyIcon}>
              <Ionicons name="medkit" size={29} color="#FFFFFF" />
            </View>

            <View style={styles.emergencyBadge}>
              <View style={styles.emergencyIndicator} />
              <Text style={styles.emergencyBadgeText}>EMERGENCY</Text>
            </View>
          </View>

          <Text style={styles.emergencyTitle}>
            Need urgent medical help?
          </Text>

          <Text style={styles.emergencyDescription}>
            Request ambulance assistance when every second matters.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Request emergency ambulance"
            style={({ pressed }) => [
              styles.emergencyButton,
              pressed && styles.pressed,
            ]}
            onPress={openEmergency}
          >
            <Text style={styles.emergencyButtonText}>
              REQUEST AMBULANCE
            </Text>
            <Ionicons name="arrow-forward" size={20} color={RED} />
          </Pressable>
        </View>

        {/* MEDICAL TRANSPORT */}
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.transportCard,
            pressed && styles.pressed,
          ]}
          onPress={openTransport}
        >
          <LinearGradient
            colors={["#F0E7FC", "#E5DDF0"]}
            style={styles.transportIcon}
          >
            <Ionicons name="car-sport" size={31} color={PURPLE} />
          </LinearGradient>

          <View style={styles.transportCopy}>
            <Text style={styles.transportLabel}>PLAN A JOURNEY</Text>
            <Text style={styles.transportTitle}>Medical Transport</Text>
            <Text style={styles.transportDescription}>
              Hospital visits, clinic appointments and more.
            </Text>
          </View>

          <View style={styles.transportArrow}>
            <Ionicons
              name="arrow-forward"
              size={19}
              color={PURPLE}
            />
          </View>
        </Pressable>

        {/* QUICK ACCESS */}
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <Text style={styles.sectionSubtitle}>
              Everything you need, within reach.
            </Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.quickCard,
              pressed && styles.pressed,
            ]}
            onPress={() => navigation.navigate("Location")}
          >
            <View style={[styles.quickIcon, styles.locationIcon]}>
              <Ionicons name="location" size={24} color={PURPLE} />
            </View>

            <Text style={styles.quickTitle}>My Location</Text>
            <Text style={styles.quickDescription}>
              Manage your pickup location.
            </Text>

            <View style={styles.quickArrow}>
              <Ionicons
                name="arrow-forward"
                size={17}
                color={PURPLE}
              />
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.quickCard,
              pressed && styles.pressed,
            ]}
            onPress={() => navigation.navigate("ControlRoom")}
          >
            <View style={[styles.quickIcon, styles.controlIcon]}>
              <Ionicons name="headset" size={24} color={PURPLE} />
            </View>

            <Text style={styles.quickTitle}>Control Room</Text>
            <Text style={styles.quickDescription}>
              Connect with our medical team.
            </Text>

            <View style={styles.quickArrow}>
              <Ionicons
                name="arrow-forward"
                size={17}
                color={PURPLE}
              />
            </View>
          </Pressable>
        </View>

        {/* ACCOUNT */}
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Your Profile</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.accountCard,
            pressed && styles.pressed,
          ]}
          onPress={() => navigation.navigate("MedicalAccount")}
        >
          <LinearGradient
            colors={["#7540AD", "#461477"]}
            style={styles.accountAvatar}
          >
            <Ionicons name="person" size={24} color="#FFFFFF" />
          </LinearGradient>

          <View style={styles.accountCopy}>
            <Text style={styles.accountName}>
              {user?.fullName || "Salema user"}
            </Text>
            <Text style={styles.accountEmail}>
              {user?.email || ""}
            </Text>
            <Text style={styles.accountLink}>VIEW ACCOUNT</Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={21}
            color={PURPLE}
          />
        </Pressable>

        {/* MEDICAL REQUESTS */}
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.requestsButton,
            pressed && styles.pressed,
          ]}
          onPress={() => navigation.navigate("MedicalRequests")}
        >
          <View style={styles.requestsIcon}>
            <Ionicons
              name="document-text-outline"
              size={22}
              color={PURPLE}
            />
          </View>

          <View style={styles.requestsCopy}>
            <Text style={styles.requestsTitle}>My Medical Requests</Text>
            <Text style={styles.requestsDescription}>
              View your request history and updates.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={PURPLE}
          />
        </Pressable>

        {/* LOGOUT */}
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.pressed,
          ]}
          onPress={confirmLogout}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={MUTED}
          />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>

        <Text style={styles.footer}>
          SALEMA MEDICAL · BEYOND EXPECTATIONS
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F6FC",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 23,
  },

  brandGroup: {
    flexDirection: "row",
    alignItems: "center",
  },

  logo: {
    width: 53,
    height: 53,
    borderRadius: 17,
    backgroundColor: "#EDE5F8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  brand: {
    color: PURPLE,
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: 2,
  },

  medical: {
    color: PURPLE,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 4,
  },

  tagline: {
    color: MUTED,
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1.1,
    marginTop: 3,
  },

  notificationButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EAE3F2",
  },

  notificationDot: {
    position: "absolute",
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: RED,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },

  welcomeCard: {
    minHeight: 178,
    borderRadius: 25,
    overflow: "hidden",
    marginBottom: 27,
  },

  welcomeContent: {
    padding: 21,
    zIndex: 2,
  },

  orbOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.07)",
    right: -65,
    top: -70,
  },

  orbTwo: {
    position: "absolute",
    width: 125,
    height: 125,
    borderRadius: 63,
    backgroundColor: "rgba(255,255,255,0.06)",
    right: 40,
    bottom: -85,
  },

  orbThree: {
    position: "absolute",
    width: 65,
    height: 65,
    borderRadius: 33,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    right: 13,
    bottom: 18,
  },

  welcomeLabel: {
    color: "#E2D2F5",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  greeting: {
    color: "#FFFFFF",
    fontSize: 29,
    fontWeight: "900",
    marginTop: 10,
  },

  welcomeSubtitle: {
    color: "#E8DDF4",
    fontSize: 13,
    marginTop: 5,
  },

  welcomeBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },

  memberTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
  },

  memberTagText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  sectionTitle: {
    color: DEEP,
    fontSize: 19,
    fontWeight: "900",
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 12,
    marginTop: 4,
  },

  serviceCount: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: "#EDE5F8",
    alignItems: "center",
    justifyContent: "center",
  },

  serviceCountText: {
    color: PURPLE,
    fontSize: 12,
    fontWeight: "900",
  },

  emergencyCard: {
    backgroundColor: RED,
    borderRadius: 23,
    padding: 18,
    marginBottom: 14,
    shadowColor: RED,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },

  emergencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 17,
  },

  emergencyIcon: {
    width: 53,
    height: 53,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  emergencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
  },

  emergencyIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },

  emergencyBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  emergencyTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
  },

  emergencyDescription: {
    color: "#F8E7EC",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 17,
  },

  emergencyButton: {
    minHeight: 51,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  emergencyButtonText: {
    color: RED,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  transportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E9E0F2",
    marginBottom: 27,
  },

  transportIcon: {
    width: 57,
    height: 57,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  transportCopy: {
    flex: 1,
  },

  transportLabel: {
    color: "#8B70A8",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 4,
  },

  transportTitle: {
    color: DEEP,
    fontSize: 15,
    fontWeight: "900",
  },

  transportDescription: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },

  transportArrow: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F1EAFB",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
  },

  quickActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 26,
  },

  quickCard: {
    flex: 1,
    minHeight: 158,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EAE3F2",
  },

  quickIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  locationIcon: {
    backgroundColor: "#EEE6FA",
  },

  controlIcon: {
    backgroundColor: "#E9E5F7",
  },

  quickTitle: {
    color: DEEP,
    fontSize: 13,
    fontWeight: "900",
  },

  quickDescription: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
    flex: 1,
  },

  quickArrow: {
    alignSelf: "flex-end",
    marginTop: 8,
  },

  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#EAE3F2",
    marginBottom: 12,
  },

  accountAvatar: {
    width: 49,
    height: 49,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  accountCopy: {
    flex: 1,
  },

  accountName: {
    color: DEEP,
    fontSize: 14,
    fontWeight: "900",
  },

  accountEmail: {
    color: MUTED,
    fontSize: 11,
    marginTop: 4,
  },

  accountLink: {
    color: PURPLE,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 7,
  },

  requestsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0EAF8",
    borderRadius: 17,
    padding: 13,
    marginBottom: 13,
  },

  requestsIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  requestsCopy: {
    flex: 1,
  },

  requestsTitle: {
    color: DEEP,
    fontSize: 13,
    fontWeight: "900",
  },

  requestsDescription: {
    color: MUTED,
    fontSize: 10,
    marginTop: 4,
  },

  logoutButton: {
    minHeight: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 5,
  },

  logoutText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
  },

  footer: {
    textAlign: "center",
    color: "#9290A5",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 13,
  },

  pressed: {
    opacity: 0.75,
  },
});