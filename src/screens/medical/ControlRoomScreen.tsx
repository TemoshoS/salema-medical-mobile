
import { Alert } from "../../utils/salemaAlert";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

const PURPLE = "#6425A5";
const DEEP = "#260B40";
const TEXT = "#261633";
const MUTED = "#82758D";

export default function ControlRoomScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { token } = useAuth();

  const [requestingVideoCall, setRequestingVideoCall] = useState(false);
  const [waitingCallId, setWaitingCallId] = useState("");

  useEffect(() => {
    if (!waitingCallId || !token) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const checkCallStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/call-sessions`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        const data = (await response.json()) as {
          success?: boolean;
          callSessions?: Array<{
            callSessionId: string;
            status: string;
            callType: "AUDIO" | "VIDEO";
          }>;
          sessions?: Array<{
            callSessionId: string;
            status: string;
            callType: "AUDIO" | "VIDEO";
          }>;
        };

        if (!active) return;

        const sessions = data.callSessions ?? data.sessions ?? [];
        const current = sessions.find(
          (item) => item.callSessionId === waitingCallId,
        );

        if (current?.status === "ACCEPTED") {
          setWaitingCallId("");
          navigation.navigate("Call", {
            callSessionId: waitingCallId,
            callType: current.callType || "VIDEO",
          });
          return;
        }

        if (
          current &&
          ["DECLINED", "ENDED", "CANCELLED"].includes(current.status)
        ) {
          setWaitingCallId("");
          Alert.alert(
            "Call not connected",
            "The Control Room did not accept the call invitation.",
          );
          return;
        }
      } catch {
        // Keep waiting after temporary network failures.
      }

      if (active) {
        timer = setTimeout(() => void checkCallStatus(), 3000);
      }
    };

    void checkCallStatus();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [waitingCallId, token, navigation]);

  const requestCall = async (callType: "AUDIO" | "VIDEO") => {
    if (!token) {
      Alert.alert(
        "Sign in required",
        "Please sign in before requesting a video call.",
      );
      return;
    }

    if (waitingCallId) {
      Alert.alert(
        "Invitation pending",
        "You already have a call invitation awaiting a response.",
      );
      return;
    }

    setRequestingVideoCall(true);

    try {
      const createResponse = await fetch(`${API_BASE_URL}/call-sessions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ callType }),
      });

      const createData = (await createResponse.json()) as {
        success?: boolean;
        message?: string;
        callSession?: { callSessionId?: string };
      };

      if (
        !createResponse.ok ||
        !createData.success ||
        !createData.callSession?.callSessionId
      ) {
        if (createResponse.status === 503) {
          Alert.alert(
            "Control Room unavailable",
            createData.message ||
              "No Control Room staff are online right now. You can submit a callback request instead.",
          );
          return;
        }

        throw new Error(
          createData.message || "Unable to send the call invitation.",
        );
      }

      setWaitingCallId(createData.callSession.callSessionId);

      Alert.alert(
        callType === "AUDIO"
          ? "Audio call invitation sent"
          : "Video call invitation sent",
        "The online Control Room team has been notified. You'll join automatically when a team member accepts.",
      );
    } catch (error) {
      Alert.alert(
        "Call request unsuccessful",
        error instanceof Error
          ? error.message
          : "Unable to send the video-call invitation.",
      );
    } finally {
      setRequestingVideoCall(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
              <Ionicons name="headset" size={35} color="#FFFFFF" />
            </View>

            <Text style={styles.heroTitle}>Medical Control Room</Text>

            <Text style={styles.heroDescription}>
              Medical assistance coordination and communication.
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.formPanel}>
          <Text style={styles.sectionTitle}>CONNECT WITH OUR TEAM</Text>

          <Text style={styles.sectionDescription}>
            Choose how you would like to communicate with the Medical Control
            Room.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.actionRow,
              pressed && styles.actionPressed,
            ]}
            onPress={() => void requestCall("AUDIO")}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="call" size={22} color={PURPLE} />
            </View>

            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Call the Control Room</Text>
              <Text style={styles.actionDescription}>
                Start a secure audio call with our team.
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={21} color={PURPLE} />
          </Pressable>

          <View style={styles.actionDivider} />

          <Pressable
            style={({ pressed }) => [
              styles.actionRow,
              pressed && styles.actionPressed,
              waitingCallId && styles.actionDisabled,
            ]}
            onPress={() => void requestCall("VIDEO")}
            disabled={requestingVideoCall || Boolean(waitingCallId)}
          >
            <View style={styles.actionIcon}>
              {requestingVideoCall ? (
                <ActivityIndicator color={PURPLE} />
              ) : (
                <Ionicons name="videocam" size={23} color={PURPLE} />
              )}
            </View>

            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>
                {waitingCallId
                  ? "Waiting for Control Room"
                  : "Request a Video Call"}
              </Text>

              <Text style={styles.actionDescription}>
                {waitingCallId
                  ? "Your invitation is pending. You'll join when accepted."
                  : "Send a secure video-call invitation to our team."}
              </Text>
            </View>

            {waitingCallId ? (
              <ActivityIndicator color={PURPLE} size="small" />
            ) : (
              <Ionicons
                name="chevron-forward"
                size={21}
                color={PURPLE}
              />
            )}
          </Pressable>

         
            
          

          <View style={styles.notice}>
            <Ionicons
              name="shield-checkmark"
              size={21}
              color={PURPLE}
            />
            <Text style={styles.noticeText}>
              Medical information should only be shared with authorised
              participants. Do not use this screen to report an active
              emergency.
            </Text>
          </View>

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
    paddingVertical: 10,
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
    fontSize: 23,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.3,
  },

  heroDescription: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
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
    paddingTop: 37,
    paddingBottom: 28,
  },

  sectionTitle: {
    color: DEEP,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  sectionDescription: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 19,
  },

  actionRow: {
    minHeight: 83,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },

  actionIcon: {
    width: 47,
    height: 47,
    borderRadius: 16,
    backgroundColor: "rgba(100,37,165,0.09)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  actionCopy: {
    flex: 1,
    paddingRight: 8,
  },

  actionTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "900",
  },

  actionDescription: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  actionDivider: {
    height: 1,
    backgroundColor: "#D5D0D8",
    marginLeft: 60,
  },

  actionPressed: {
    opacity: 0.7,
  },

  actionDisabled: {
    opacity: 0.65,
  },

  waitingNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(100,37,165,0.07)",
    borderRadius: 13,
    padding: 13,
    marginTop: 13,
  },

  waitingText: {
    flex: 1,
    color: PURPLE,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "700",
  },

  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    backgroundColor: "rgba(100,37,165,0.07)",
    borderRadius: 14,
    padding: 15,
    marginTop: 27,
  },

  noticeText: {
    flex: 1,
    color: "#51465C",
    fontSize: 11,
    lineHeight: 18,
  },

  footerText: {
    color: "#918996",
    fontSize: 8,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 30,
    letterSpacing: 1,
  },
});
