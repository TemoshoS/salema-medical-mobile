import { Alert } from "../../utils/salemaAlert";
import { useCallback, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { io } from "socket.io-client";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import {
  LiveKitRoom,
  VideoTrack,
  useLocalParticipant,
  useTracks,
} from "@livekit/react-native";
import { Track } from "livekit-client";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import type { RootStackParamList } from "../../navigation/AppNavigator";
type CallRoute = RouteProp<RootStackParamList, "Call">;
type TokenResponse = {
  success: boolean;
  message?: string;
  livekitUrl?: string;
  token?: string;
};
export default function CallScreen() {
  const route = useRoute<CallRoute>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { token: authToken, user } = useAuth();
  const { callSessionId, callType } = route.params;
  const [livekitUrl, setLivekitUrl] = useState("");
  const [roomToken, setRoomToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("Connecting");
  const hasNavigatedAway = useRef(false);
  const returnToPreviousScreen = useCallback(() => {
    if (hasNavigatedAway.current) return;
    hasNavigatedAway.current = true;
    navigation.goBack();
  }, [navigation]);
  // Both participants receive this event when either person ends the call.
  useEffect(() => {
    if (!authToken) return;
    const socket = io(API_BASE_URL.replace(/\/api\/?$/, ""), {
      auth: { token: authToken },
      transports: ["websocket", "polling"],
    });
    const onCallUpdated = (payload: {
      callSessionId?: string;
      status?: string;
    }) => {
      if (payload?.callSessionId !== callSessionId) return;
      if (payload.status === "ENDED" || payload.status === "CANCELLED") {
        returnToPreviousScreen();
      }
    };
    socket.on("call-session:updated", onCallUpdated);
    return () => {
      socket.off("call-session:updated", onCallUpdated);
      socket.disconnect();
    };
  }, [authToken, callSessionId, returnToPreviousScreen]);
  useEffect(() => {
    let active = true;
    const prepareCall = async () => {
      if (!authToken) {
        setError("Please sign in again to join this call.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(
          `${API_BASE_URL}/call-sessions/${encodeURIComponent(callSessionId)}/token`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${authToken}`,
              Accept: "application/json",
            },
          }
        );
        const data = (await response.json()) as TokenResponse;
        if (!response.ok || !data.success || !data.livekitUrl || !data.token) {
          throw new Error(data.message || "Unable to join this call.");
        }
        if (active) {
          setLivekitUrl(data.livekitUrl);
          setRoomToken(data.token);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to prepare the secure call."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void prepareCall();
    return () => {
      active = false;
    };
  }, [authToken, callSessionId]);
  const endCall = useCallback(async () => {
    if (ending) return;
    setEnding(true);
    try {
      if (authToken) {
        const response = await fetch(
          `${API_BASE_URL}/call-sessions/${encodeURIComponent(callSessionId)}/end`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${authToken}`,
              Accept: "application/json",
            },
          }
        );
        if (!response.ok) {
          if (response.status === 409) {
            // The other participant may already have ended this call.
            returnToPreviousScreen();
            return;
          }
          const data = (await response.json()) as { message?: string };
          throw new Error(data.message || "Unable to end the call.");
        }
      }
      returnToPreviousScreen();
    } catch (err) {
      // A remote end event may have closed this screen while the request
      // was still in flight. Do not show an alert after leaving the call.
      if (hasNavigatedAway.current) return;
      Alert.alert(
        "Call",
        err instanceof Error ? err.message : "Unable to end the call."
      );
      setEnding(false);
    }
  }, [authToken, callSessionId, ending, returnToPreviousScreen]);
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#461477" />
        <Text style={styles.helper}>Securing your call...</Text>
      </SafeAreaView>
    );
  }
  if (error || !livekitUrl || !roomToken) {
    return (
      <SafeAreaView style={styles.centered}>
        <View style={styles.errorIcon}>
          <Text style={styles.errorIconText}>!</Text>
        </View>
        <Text style={styles.title}>Unable to join call</Text>
        <Text style={styles.helper}>{error || "Call connection unavailable."}</Text>
        <Pressable style={styles.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>SALEMA MEDICAL</Text>
          <Text style={styles.headerTitle}>
            {callType === "VIDEO" ? "Video consultation" : "Audio consultation"}
          </Text>
        </View>
        <View style={styles.secureBadge}>
          <View style={styles.secureDot} />
          <Text style={styles.secureText}>Secure call</Text>
        </View>
      </View>
      <LiveKitRoom
        serverUrl={livekitUrl}
        token={roomToken}
        connect={true}
        audio={true}
        video={callType === "VIDEO"}
        onConnected={() => setConnectionStatus("Connected")}
        onDisconnected={() => setConnectionStatus("Disconnected")}
        onError={(err) => {
          setConnectionStatus("Connection issue");
          setError(err.message || "Call connection failed.");
        }}
      >
        <CallRoomControls
          callType={callType}
          ending={ending}
          connectionStatus={connectionStatus}
          remoteRole={
            user?.role === "PATIENT"
              ? "Control Room team"
              : user?.role === "CONTROL_ROOM"
                ? "Patient"
                : "Medical team"
          }
          onEnd={() => void endCall()}
        />
      </LiveKitRoom>
    </SafeAreaView>
  );
}
function CallRoomControls({
  callType,
  ending,
  connectionStatus,
  remoteRole,
  onEnd,
}: {
  callType: "AUDIO" | "VIDEO";
  ending: boolean;
  connectionStatus: string;
  remoteRole: string;
  onEnd: () => void;
}) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } =
    useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone], { onlySubscribed: false });
  const remoteParticipant = tracks.find(
    (trackRef) => trackRef.participant.identity !== localParticipant.identity
  )?.participant;

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [someoneSpeaking, setSomeoneSpeaking] = useState(false);

  useEffect(() => {
    if (connectionStatus !== "Connected") return;
    const interval = setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
      setSomeoneSpeaking(
        Boolean(localParticipant.isSpeaking || remoteParticipant?.isSpeaking)
      );
    }, 250);
    return () => clearInterval(interval);
  }, [connectionStatus, localParticipant, remoteParticipant]);

  const formattedTime = `${Math.floor(elapsedSeconds / 60)
    .toString()
    .padStart(2, "0")}:${(elapsedSeconds % 60).toString().padStart(2, "0")}`;
  const remoteTrack = tracks.find(
    (trackRef) =>
      trackRef.source === Track.Source.Camera &&
      trackRef.participant.identity !== localParticipant.identity
  );
  const localTrack = tracks.find(
    (trackRef) =>
      trackRef.source === Track.Source.Camera &&
      trackRef.participant.identity === localParticipant.identity
  );

  useEffect(() => {
    console.log("[Salema call] Local camera diagnostics", {
      cameraEnabled: isCameraEnabled,
      localIdentity: localParticipant.identity,
      localTrackFound: Boolean(localTrack),
      cameraTracksFound: tracks.filter(
        (trackRef) => trackRef.source === Track.Source.Camera
      ).length,
      trackParticipants: tracks.map((trackRef) => ({
        identity: trackRef.participant.identity,
        source: trackRef.source,
      })),
    });

    console.log(
      "[Salema call] Local camera publications",
      Array.from(localParticipant.videoTrackPublications.values()).map(
        (publication) => ({
          source: publication.source,
          hasTrack: Boolean(publication.track),
          muted: publication.isMuted,
        })
      )
    );
  }, [isCameraEnabled, localParticipant, localTrack, tracks]);

  useEffect(() => {
    console.log("[Salema call] Local camera diagnostics", {
      cameraEnabled: isCameraEnabled,
      localIdentity: localParticipant.identity,
      localTrackFound: Boolean(localTrack),
      cameraTracksFound: tracks.filter(
        (trackRef) => trackRef.source === Track.Source.Camera
      ).length,
      trackParticipants: tracks.map((trackRef) => ({
        identity: trackRef.participant.identity,
        source: trackRef.source,
      })),
    });

    console.log(
      "[Salema call] Local camera publications",
      Array.from(localParticipant.videoTrackPublications.values()).map(
        (publication) => ({
          source: publication.source,
          hasTrack: Boolean(publication.track),
          muted: publication.isMuted,
        })
      )
    );
  }, [isCameraEnabled, localParticipant, localTrack, tracks]);
  const [controlBusy, setControlBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const toggleMicrophone = async () => {
    if (controlBusy) return;
    setControlBusy(true);
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch {
      Alert.alert("Microphone", "Unable to change microphone settings.");
    } finally {
      setControlBusy(false);
    }
  };
  const toggleCamera = async () => {
    if (controlBusy) return;
    setControlBusy(true);
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch {
      Alert.alert("Camera", "Unable to change camera settings.");
    } finally {
      setControlBusy(false);
    }
  };
  return (
    <View style={styles.callBody}>
      <View style={styles.connectionBanner}>
        <View
          style={[
            styles.secureDot,
            connectionStatus !== "Connected" && styles.connectionDotInactive,
          ]}
        />
        <Text style={styles.connectionText}>{connectionStatus}</Text>
      </View>
      <Text style={styles.participantIdentity}>
        {remoteParticipant?.name
          ? `${remoteParticipant.name} · ${remoteRole}`
          : `Waiting for ${remoteRole}`}
      </Text>
      <Text style={styles.callTimer}>{formattedTime}</Text>
      <SpeakingWaves active={someoneSpeaking} />
      {callType === "VIDEO" ? (
        <View style={styles.videoArea}>
          {remoteTrack ? (
            <VideoTrack
              key={`remote-${remoteTrack.participant.identity}`}
              trackRef={remoteTrack}
              style={styles.remoteVideoTrack}
              objectFit="cover"
              mirror={false}
            />
          ) : (
            <View style={styles.videoPlaceholder}>
              <Text style={styles.placeholderTitle}>
                Waiting for the other participant
              </Text>
              <Text style={styles.placeholderText}>
                Their video will appear here when their camera is connected.
              </Text>
            </View>
          )}
          {localTrack ? (
            <View style={styles.localPreview}>
              <VideoTrack
                key={`local-${localTrack.participant.identity}`}
                trackRef={localTrack}
                style={styles.localVideoTrack}
                objectFit="cover"
                mirror={true}
              />
              <View style={styles.localPreviewLabel}>
                <Text style={styles.localPreviewLabelText}>You</Text>
              </View>
            </View>
          ) : (
            <View style={styles.localPreviewPlaceholder}>
              <Text style={styles.localPreviewPlaceholderText}>
                Camera off
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.audioArea}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>S</Text>
          </View>
          <Text style={styles.audioTitle}>Salema Medical</Text>
          <Text style={styles.audioSubtitle}>Audio call in progress</Text>
        </View>
      )}
      <View style={styles.controls}>
        <Pressable
          style={[styles.controlButton, !isMicrophoneEnabled && styles.controlDisabled]}
          onPress={() => void toggleMicrophone()}
          accessibilityRole="button"
          accessibilityLabel={isMicrophoneEnabled ? "Mute microphone" : "Enable microphone"}
        >
          <Ionicons
            name={isMicrophoneEnabled ? "mic" : "mic-off"}
            size={25}
            color={isMicrophoneEnabled ? "#461477" : "#A30E35"}
          />
        </Pressable>
        {callType === "VIDEO" ? (
          <Pressable
            style={[styles.controlButton, !isCameraEnabled && styles.controlDisabled]}
            onPress={() => void toggleCamera()}
            accessibilityRole="button"
            accessibilityLabel={isCameraEnabled ? "Turn camera off" : "Turn camera on"}
          >
            <Ionicons
              name={isCameraEnabled ? "videocam" : "videocam-off"}
              size={25}
              color={isCameraEnabled ? "#461477" : "#A30E35"}
            />
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.endButton, ending && styles.controlDisabled]}
          onPress={onEnd}
          disabled={ending}
          accessibilityRole="button"
          accessibilityLabel="End call"
        >
          {ending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Ionicons name="call" size={25} color="#FFFFFF" />
          )}
        </Pressable>
      </View>
      <Text style={styles.footer}>SALEMA MEDICAL · BEYOND EXPECTATIONS</Text>
    </View>
  );
}
function SpeakingWaves({ active }: { active: boolean }) {
  const bars = useRef(
    Array.from({ length: 5 }, () => new Animated.Value(0.2))
  ).current;

  useEffect(() => {
    const animations = bars.map((bar, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: 1,
            duration: 180 + index * 35,
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.2,
            duration: 180 + index * 35,
            useNativeDriver: true,
          }),
        ])
      )
    );

    if (active) animations.forEach((animation) => animation.start());
    else {
      animations.forEach((animation) => animation.stop());
      bars.forEach((bar) => bar.setValue(0.2));
    }

    return () => animations.forEach((animation) => animation.stop());
  }, [active, bars]);

  return (
    <View style={styles.waveform} accessibilityLabel={active ? "Speaking" : "Not speaking"}>
      {bars.map((bar, index) => (
        <Animated.View
          key={index}
          style={[
            styles.waveBar,
            { transform: [{ scaleY: bar }] },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F6FC" },
  centered: {
    flex: 1,
    backgroundColor: "#F8F6FC",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5DDF0",
  },
  brand: { color: "#73738A", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  headerTitle: { color: "#191044", fontSize: 19, fontWeight: "900", marginTop: 5 },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EEE8F7",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
  },
  secureDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#27835D" },
  secureText: { color: "#461477", fontSize: 11, fontWeight: "800" },
  callBody: { flex: 1, padding: 16 },
  connectionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5DDF0",
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  connectionText: { color: "#626782", fontSize: 12, fontWeight: "700" },
  connectionDotInactive: { backgroundColor: "#D49A22" },
  callTimer: {
    color: "#626782",
    fontSize: 15,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
    marginTop: 6,
  },
  waveform: {
    height: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 6,
  },
  waveBar: {
    width: 4,
    height: 24,
    borderRadius: 3,
    backgroundColor: "#461477",
  },
  participantIdentity: {
    color: "#191044",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 10,
  },
  videoArea: {
    flex: 1,
    marginTop: 16,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#191044",
    minHeight: 220,
  },
  remoteVideoTrack: {
    width: "100%",
    height: "100%",
  },
  localPreview: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 80,
    height: 110,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#34304C",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    elevation: 8,
    zIndex: 5,
  },
  localVideoTrack: {
    width: "100%",
    height: "100%",
  },
  localPreviewLabel: {
    position: "absolute",
    left: 7,
    bottom: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(25,16,68,0.78)",
  },
  localPreviewLabelText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  localPreviewPlaceholder: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 112,
    height: 158,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#34304C",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    elevation: 8,
    zIndex: 5,
  },
  localPreviewPlaceholderText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  videoPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  placeholderTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  placeholderText: { color: "#D9D3E7", fontSize: 13, textAlign: "center", marginTop: 8 },
  audioArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 36,
    backgroundColor: "#461477",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontSize: 42, fontWeight: "900" },
  audioTitle: { color: "#191044", fontSize: 22, fontWeight: "900", marginTop: 22 },
  audioSubtitle: { color: "#626782", fontSize: 14, marginTop: 8 },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingVertical: 20,
    flexWrap: "wrap",
  },
  controlButton: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5DDF0",
    borderRadius: 29,
    padding: 0,
  },
  controlDisabled: { opacity: 0.55 },
  controlSymbol: { color: "#461477", fontSize: 13, fontWeight: "900" },
  controlLabel: { color: "#626782", fontSize: 10, fontWeight: "700", marginTop: 5 },
  endButton: {
    width: 62,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#A30E35",
    borderRadius: 31,
    paddingHorizontal: 0,
  },
  endButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  primaryButton: {
    marginTop: 22,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: "#461477",
    borderRadius: 13,
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  errorIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#F7E7EC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  errorIconText: { color: "#A30E35", fontSize: 26, fontWeight: "900" },
  title: { color: "#191044", fontSize: 21, fontWeight: "900", textAlign: "center" },
  helper: { color: "#626782", fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 10 },
  footer: {
    color: "#89849A",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
    paddingVertical: 12,
  },
});
