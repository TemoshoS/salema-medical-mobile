import { Alert } from "../../utils/salemaAlert";

import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import MapView, { Marker, Polyline } from "react-native-maps";
import { MaterialCommunityIcons } from "@expo/vector-icons";


import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

type ProviderRequest = {
  requestId: string;
  callbackNumber?: string;
  serviceType: "EMERGENCY_AMBULANCE" | "MEDICAL_TRANSPORT";
  urgencyLevel?: string;
  description?: string;
  pickupAddress: string;
  pickupLocation?: { latitude?: number; longitude?: number };
  destinationAddress?: string;
  destinationLocation?: { latitude?: number; longitude?: number };
  requestedDateTime?: string;
  wheelchairRequired?: boolean;
  companionTravelling?: boolean;
  transportNotes?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

type AssignedRequestsResponse = {
  success: boolean;
  message?: string;
  requests?: ProviderRequest[];
};

type RequestActionResponse = {
  success: boolean;
  message?: string;
  request?: {
    requestId: string;
    status: string;
  };
};

type ProgressAction = {
  status: string;
  label: string;
  confirmationTitle: string;
  confirmationMessage: string;
  successMessage: string;
};

const PROGRESS_ACTIONS: Record<string, ProgressAction> = {
  DISPATCHED: {
    status: "ON_THE_WAY",
    label: "Start journey",
    confirmationTitle: "Start journey?",
    confirmationMessage:
      "Confirm that you are beginning the journey to the pickup location.",
    successMessage: "Your journey has been marked as started.",
  },
  ON_THE_WAY: {
    status: "ARRIVED_AT_PICKUP",
    label: "Confirm arrival",
    confirmationTitle: "Confirm arrival?",
    confirmationMessage:
      "Confirm that you have arrived at the pickup location.",
    successMessage: "Your arrival has been recorded.",
  },
  ARRIVED_AT_PICKUP: {
    status: "PATIENT_TRANSPORTING",
    label: "Start patient transport",
    confirmationTitle: "Start patient transport?",
    confirmationMessage:
      "Confirm that the patient is now being transported.",
    successMessage: "Patient transport has been marked as started.",
  },
  PATIENT_TRANSPORTING: {
    status: "COMPLETED",
    label: "Complete transport",
    confirmationTitle: "Complete this request?",
    confirmationMessage:
      "Only confirm completion after the transport service has finished.",
    successMessage: "The transport has been marked as completed.",
  },
};


type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

function decodeEncodedPolyline(encoded: string): RouteCoordinate[] {
  const coordinates: RouteCoordinate[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      if (index >= encoded.length) {
        throw new Error("Invalid encoded route.");
      }
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    latitude += (result & 1) ? ~(result >> 1) : (result >> 1);

    result = 0;
    shift = 0;

    do {
      if (index >= encoded.length) {
        throw new Error("Invalid encoded route.");
      }
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitude += (result & 1) ? ~(result >> 1) : (result >> 1);

    coordinates.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    });
  }

  return coordinates;
}

function distanceBetweenMeters(
  first: RouteCoordinate,
  second: RouteCoordinate,
): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDifference = radians(second.latitude - first.latitude);
  const longitudeDifference = radians(second.longitude - first.longitude);
  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(radians(first.latitude)) *
      Math.cos(radians(second.latitude)) *
      Math.sin(longitudeDifference / 2) ** 2;

  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatRouteDuration(duration: string): string {
  const seconds = Number.parseFloat(duration.replace(/s$/, ""));

  if (!Number.isFinite(seconds) || seconds < 0) {
    return "Time unavailable";
  }

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes
    ? `${hours} hr ${remainingMinutes} min`
    : `${hours} hr`;
}

export default function ProviderDashboardScreen() {
  const { token, user, signOut } = useAuth();

  const [requests, setRequests] = useState<ProviderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [progressingId, setProgressingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [providerLocation, setProviderLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [trackingMessage, setTrackingMessage] = useState("");
  const locationUpdateInFlight = useRef(false);
  const mapRef = useRef<MapView | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const [routeCoordinates, setRouteCoordinates] =
    useState<RouteCoordinate[]>([]);
  const [routeDistanceMeters, setRouteDistanceMeters] =
    useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<string | null>(null);
  const [routeMessage, setRouteMessage] = useState("");
  const routeLastRequestedRef = useRef<{
    latitude: number;
    longitude: number;
    requestedAt: number;
  } | null>(null);
  const routeRequestInFlightRef = useRef(false);
  const routeRequestKeyRef = useRef("");

  const loadRequests = useCallback(async (isRefresh = false) => {
    if (!token) {
      setRequests([]);
      setError("Please sign in again to view assigned requests.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/medical-requests/provider/assigned`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const data =
        (await response.json()) as AssignedRequestsResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load your assigned requests."
        );
      }

      const assignedRequests = data.requests ?? [];
      setRequests(assignedRequests);

      // Subscribe to each assigned request so dispatch/progress changes arrive live.
      assignedRequests.forEach((request) => {
        socketRef.current?.emit("medical-request:join", {
          requestId: request.requestId,
        });
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load assigned requests. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const socket = io(API_BASE_URL.replace(/\/api\/?$/, ""), {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      // Reload and join assigned request rooms after every connection/reconnection.
      void loadRequests();
    });

    socket.on(
      "medical-request:status-updated",
      (payload: { requestId?: string; status?: string }) => {
        if (!payload?.requestId || !payload.status) return;

        // Update the visible status immediately; then sync the full server record.
        setRequests((current) =>
          current.map((request) =>
            request.requestId === payload.requestId
              ? { ...request, status: payload.status! }
              : request
          )
        );

        void loadRequests(true);
      }
    );

    return () => {
      socket.off("connect");
      socket.off("medical-request:status-updated");
      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [token, loadRequests]);

  // Share foreground GPS only for a confirmed, active dispatch.
  // If more than one request is active, track the newest one only.
  const trackingRequest = requests.find(
    (request) =>
      request.status === "DISPATCHED" ||
      request.status === "ON_THE_WAY" ||
      request.status === "ARRIVED_AT_PICKUP" ||
      request.status === "PATIENT_TRANSPORTING"
  );


  // Fetch real road directions only when pickup GPS is available.
  // Refresh after 100 metres of movement or 30 seconds.
  useEffect(() => {
    if (!trackingRequest) {
      routeRequestKeyRef.current = "";
      routeLastRequestedRef.current = null;
      setRouteCoordinates([]);
      setRouteDistanceMeters(null);
      setRouteDuration(null);
      setRouteMessage("");
      return;
    }

    const isPatientTransporting =
      trackingRequest.status === "PATIENT_TRANSPORTING";

    const targetLocation = isPatientTransporting
      ? trackingRequest.destinationLocation
      : trackingRequest.pickupLocation;

    const targetLat = targetLocation?.latitude;
    const targetLng = targetLocation?.longitude;

    const validTarget =
      typeof targetLat === "number" &&
      typeof targetLng === "number" &&
      Number.isFinite(targetLat) &&
      Number.isFinite(targetLng) &&
      targetLat >= -90 &&
      targetLat <= 90 &&
      targetLng >= -180 &&
      targetLng <= 180;

    const requestKey = validTarget
      ? `${trackingRequest.requestId}:${isPatientTransporting ? "destination" : "pickup"}:${targetLat}:${targetLng}`
      : `${trackingRequest.requestId}:${isPatientTransporting ? "no-destination" : "no-pickup"}`;

    if (routeRequestKeyRef.current !== requestKey) {
      routeRequestKeyRef.current = requestKey;
      routeLastRequestedRef.current = null;
      setRouteCoordinates([]);
      setRouteDistanceMeters(null);
      setRouteDuration(null);
      setRouteMessage("");
    }

    if (!validTarget || !providerLocation || !token) {
      return;
    }

    const previous = routeLastRequestedRef.current;
    const elapsed = previous ? Date.now() - previous.requestedAt : Infinity;
    const moved = previous
      ? distanceBetweenMeters(previous, providerLocation)
      : Infinity;

    if (previous && moved < 100 && elapsed < 30000) {
      return;
    }

    if (routeRequestInFlightRef.current) {
      return;
    }

    const origin = { ...providerLocation };
    routeLastRequestedRef.current = {
      ...origin,
      requestedAt: Date.now(),
    };
    routeRequestInFlightRef.current = true;
    setRouteMessage("Calculating driving route…");

    void (async () => {
      try {
        const query = new URLSearchParams({
          originLat: String(origin.latitude),
          originLng: String(origin.longitude),
          destinationLat: String(targetLat),
          destinationLng: String(targetLng),
        });

        const response = await fetch(
          `${API_BASE_URL}/places/directions?${query.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          },
        );

        const data = (await response.json()) as {
          success?: boolean;
          message?: string;
          route?: {
            encodedPolyline?: string;
            distanceMeters?: number;
            duration?: string;
          };
        };

        if (
          !response.ok ||
          !data.success ||
          !data.route?.encodedPolyline ||
          typeof data.route.distanceMeters !== "number" ||
          typeof data.route.duration !== "string"
        ) {
          throw new Error(
            data.message || "Driving directions are unavailable.",
          );
        }

        const decoded = decodeEncodedPolyline(data.route.encodedPolyline);

        if (decoded.length < 2) {
          throw new Error("Google returned an incomplete driving route.");
        }

        if (routeRequestKeyRef.current !== requestKey) {
          return;
        }

        setRouteCoordinates(decoded);
        setRouteDistanceMeters(data.route.distanceMeters);
        setRouteDuration(data.route.duration);
        setRouteMessage("");
      } catch (err) {
        if (routeRequestKeyRef.current === requestKey) {
          setRouteCoordinates([]);
          setRouteDistanceMeters(null);
          setRouteDuration(null);
          setRouteMessage(
            err instanceof Error
              ? err.message
              : "Unable to calculate driving directions.",
          );
        }
      } finally {
        routeRequestInFlightRef.current = false;
      }
    })();
  }, [
    token,
    trackingRequest?.requestId,
    trackingRequest?.status,
    trackingRequest?.pickupLocation?.latitude,
    trackingRequest?.pickupLocation?.longitude,
    trackingRequest?.destinationLocation?.latitude,
    trackingRequest?.destinationLocation?.longitude,
    providerLocation?.latitude,
    providerLocation?.longitude,
  ]);

  useEffect(() => {
  if (!trackingRequest || !providerLocation) return;

  const isPatientTransporting =
    trackingRequest.status === "PATIENT_TRANSPORTING";

  const targetLocation = isPatientTransporting
    ? trackingRequest.destinationLocation
    : trackingRequest.pickupLocation;

  const targetLat = targetLocation?.latitude;
  const targetLng = targetLocation?.longitude;

  const targetIsValid =
    typeof targetLat === "number" &&
    typeof targetLng === "number" &&
    Number.isFinite(targetLat) &&
    Number.isFinite(targetLng) &&
    targetLat >= -90 &&
    targetLat <= 90 &&
    targetLng >= -180 &&
    targetLng <= 180;

  const coordinates = targetIsValid
    ? [providerLocation, { latitude: targetLat!, longitude: targetLng! }]
    : [providerLocation];

  mapRef.current?.fitToCoordinates(coordinates, {
    edgePadding: {
      top: 110,
      right: 55,
      bottom: 300,
      left: 55,
    },
    animated: true,
  });
}, [
  trackingRequest?.requestId,
  providerLocation?.latitude,
  providerLocation?.longitude,
  trackingRequest?.pickupLocation?.latitude,
  trackingRequest?.pickupLocation?.longitude,
  trackingRequest?.destinationLocation?.latitude,
  trackingRequest?.destinationLocation?.longitude,
  trackingRequest?.status,
]);

  useEffect(() => {
    let active = true;
    let subscription: Location.LocationSubscription | null = null;

    if (!token || !trackingRequest) {
      setProviderLocation(null);
      setTrackingMessage("");
      return () => {
        active = false;
      };
    }

    setTrackingMessage("Requesting foreground location permission…");

    const startTracking = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!active) return;

        if (permission.status !== "granted") {
          setTrackingMessage(
            "Location permission is off. Enable location access to share your vehicle position during this dispatch."
          );
          return;
        }

        setTrackingMessage("Starting vehicle location sharing…");
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (position) => {
            if (!active) return;

            const coords = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setProviderLocation(coords);
            setTrackingMessage("Location sharing is active for this dispatch.");

            if (locationUpdateInFlight.current) return;
            locationUpdateInFlight.current = true;

            void (async () => {
              try {
                const response = await fetch(
                  `${API_BASE_URL}/medical-requests/${encodeURIComponent(
                    trackingRequest.requestId
                  )}/location`,
                  {
                    method: "PATCH",
                    headers: {
                      Authorization: `Bearer ${token}`,
                      Accept: "application/json",
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(coords),
                  }
                );

                const result = await response.json();
                if (!response.ok || !result.success) {
                  throw new Error(
                    result.message || "Unable to send vehicle location."
                  );
                }
              } catch (err) {
                if (active) {
                  setTrackingMessage(
                    err instanceof Error
                      ? `Location update issue: ${err.message}`
                      : "Unable to send vehicle location. Check your connection."
                  );
                }
              } finally {
                locationUpdateInFlight.current = false;
              }
            })();
          }
        );
        if (!active) subscription.remove();
      } catch (err) {
        if (active) {
          setTrackingMessage(
            err instanceof Error
              ? `Location unavailable: ${err.message}`
              : "Unable to start location sharing."
          );
        }
      }
    };

    void startTracking();

    return () => {
      active = false;
      subscription?.remove();
      locationUpdateInFlight.current = false;
    };
  }, [token, trackingRequest?.requestId, trackingRequest?.status]);

  // PROVIDER PRESENCE HEARTBEAT
  // Reports the provider's latest GPS independently of an active dispatch.
  // The existing request-specific tracking effect remains unchanged.
  useEffect(() => {
    let active = true;
    let subscription: Location.LocationSubscription | null = null;
    let updateInFlight = false;

    if (!token || user?.role !== "PROVIDER") {
      return () => {
        active = false;
      };
    }

    const startPresence = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (!active || permission.status !== "granted") {
          return;
        }

        const sendPresence = async (
          latitude: number,
          longitude: number
        ) => {
          if (!active || updateInFlight) return;

          updateInFlight = true;
          try {
            const response = await fetch(
              `${API_BASE_URL}/medical-requests/providers/presence`,
              {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: "application/json",
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ latitude, longitude }),
              }
            );

            if (!response.ok) {
              const result = await response.json().catch(() => null);
              if (active) {
                console.warn(
                  "Provider presence update failed:",
                  result?.message || response.status
                );
              }
            }
          } catch (error) {
            if (active) {
              console.warn("Provider presence could not be updated:", error);
            }
          } finally {
            updateInFlight = false;
          }
        };

        const initialPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!active) return;

        void sendPresence(
          initialPosition.coords.latitude,
          initialPosition.coords.longitude
        );

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 15000,
            distanceInterval: 25,
          },
          (position) => {
            if (!active) return;

            void sendPresence(
              position.coords.latitude,
              position.coords.longitude
            );
          }
        );

        if (!active) subscription.remove();
      } catch (error) {
        if (active) {
          console.warn("Unable to start provider presence sharing:", error);
        }
      }
    };

    void startPresence();

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [token, user?.role]);

  const acceptRequest = async (request: ProviderRequest) => {
    if (!token || acceptingId || progressingId) {
      return;
    }

    Alert.alert(
      "Accept medical request?",
      `Confirm that you can take responsibility for request ${request.requestId}?`,
      [
        {
          text: "Not now",
          style: "cancel",
        },
        {
          text: "Accept request",
          onPress: () => {
            void submitAcceptance(request);
          },
        },
      ]
    );
  };

  const submitAcceptance = async (request: ProviderRequest) => {
    if (!token || acceptingId || progressingId) {
      return;
    }

    setAcceptingId(request.requestId);

    try {
      const response = await fetch(
        `${API_BASE_URL}/medical-requests/${encodeURIComponent(
          request.requestId
        )}/accept`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const data = (await response.json()) as RequestActionResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to accept this request."
        );
      }

      setRequests((current) =>
        current.map((item) =>
          item.requestId === request.requestId
            ? {
                ...item,
                status: data.request?.status ?? "PROVIDER_ACCEPTED",
              }
            : item
        )
      );

      Alert.alert(
        "Request accepted",
        "The request has been accepted. The Control Room can now see the updated status."
      );
    } catch (err) {
      Alert.alert(
        "Could not accept request",
        err instanceof Error ? err.message : "Please try again."
      );

      void loadRequests(true);
    } finally {
      setAcceptingId(null);
    }
  };

  const progressRequest = async (
    request: ProviderRequest,
    action: ProgressAction
  ) => {
    if (!token || acceptingId || progressingId) {
      return;
    }

    Alert.alert(
      action.confirmationTitle,
      action.confirmationMessage,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm",
          onPress: () => {
            void submitProgress(request, action);
          },
        },
      ]
    );
  };

  const submitProgress = async (
    request: ProviderRequest,
    action: ProgressAction
  ) => {
    if (!token || acceptingId || progressingId) {
      return;
    }

    setProgressingId(request.requestId);

    try {
      const response = await fetch(
        `${API_BASE_URL}/medical-requests/${encodeURIComponent(
          request.requestId
        )}/progress`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: action.status,
          }),
        }
      );

      const data = (await response.json()) as RequestActionResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to update request progress."
        );
      }

      const updatedStatus = data.request?.status ?? action.status;

      setRequests((current) =>
        current.map((item) =>
          item.requestId === request.requestId
            ? { ...item, status: updatedStatus }
            : item
        )
      );

      Alert.alert("Progress updated", action.successMessage);
    } catch (err) {
      Alert.alert(
        "Could not update progress",
        err instanceof Error
          ? err.message
          : "Please try again."
      );

      void loadRequests(true);
    } finally {
      setProgressingId(null);
    }
  };

  const formatDate = (value?: string) => {
    if (!value) {
      return "Not specified";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  const serviceLabel = (serviceType: string) =>
    serviceType === "EMERGENCY_AMBULANCE"
      ? "Emergency ambulance"
      : "Medical transport";

  const renderRequest = ({ item }: { item: ProviderRequest }) => {
    const canAccept = item.status === "PROVIDER_BEING_CONTACTED";
    const progressAction = PROGRESS_ACTIONS[item.status];
    const isAccepting = acceptingId === item.requestId;
    const isProgressing = progressingId === item.requestId;
    const actionBusy =
      acceptingId !== null || progressingId !== null;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.service}>
              {serviceLabel(item.serviceType)}
            </Text>
            <Text style={styles.reference}>
              Reference: {item.requestId}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              canAccept ? styles.pendingBadge : styles.otherBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                canAccept ? styles.pendingText : styles.otherText,
              ]}
            >
              {item.status.replace(/_/g, " ")}
            </Text>
          </View>
        </View>

        {item.urgencyLevel === "EMERGENCY" && (
          <View style={styles.emergencyBanner}>
            <Text style={styles.emergencyText}>
              Emergency request
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <Text style={styles.fieldLabel}>Pickup location</Text>
        <Text style={styles.fieldValue}>
          {item.pickupAddress || "Not provided"}
        </Text>

        {item.destinationAddress ? (
          <>
            <Text style={styles.fieldLabel}>Destination</Text>
            <Text style={styles.fieldValue}>
              {item.destinationAddress}
            </Text>
          </>
        ) : null}

        {item.callbackNumber ? (
          <>
            <Text style={styles.fieldLabel}>Callback number</Text>
            <Text style={styles.fieldValue}>
              {item.callbackNumber}
            </Text>
          </>
        ) : null}

        {item.description ? (
          <>
            <Text style={styles.fieldLabel}>Request notes</Text>
            <Text style={styles.fieldValue}>
              {item.description}
            </Text>
          </>
        ) : null}

        {item.transportNotes ? (
          <>
            <Text style={styles.fieldLabel}>Transport notes</Text>
            <Text style={styles.fieldValue}>
              {item.transportNotes}
            </Text>
          </>
        ) : null}

        {item.requestedDateTime ? (
          <>
            <Text style={styles.fieldLabel}>
              Requested date and time
            </Text>
            <Text style={styles.fieldValue}>
              {formatDate(item.requestedDateTime)}
            </Text>
          </>
        ) : null}

        {item.wheelchairRequired ? (
          <Text style={styles.extraInfo}>
            Wheelchair assistance requested
          </Text>
        ) : null}

        {item.companionTravelling ? (
          <Text style={styles.extraInfo}>
            Patient will travel with a companion
          </Text>
        ) : null}

        <Text style={styles.createdAt}>
          Submitted: {formatDate(item.createdAt)}
        </Text>

        {canAccept ? (
          <Pressable
            accessibilityRole="button"
            disabled={actionBusy}
            onPress={() => void acceptRequest(item)}
            style={({ pressed }) => [
              styles.acceptButton,
              pressed && styles.buttonPressed,
              actionBusy && styles.buttonDisabled,
            ]}
          >
            {isAccepting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.acceptButtonText}>
                Accept request
              </Text>
            )}
          </Pressable>
        ) : null}

        {item.status === "PROVIDER_ACCEPTED" ? (
          <Text style={styles.acceptedMessage}>
            You have accepted this request. Await dispatch confirmation
            from the Control Room before starting your journey.
          </Text>
        ) : null}

        {progressAction ? (
          <Pressable
            accessibilityRole="button"
            disabled={actionBusy}
            onPress={() =>
              void progressRequest(item, progressAction)
            }
            style={({ pressed }) => [
              styles.progressButton,
              pressed && styles.buttonPressed,
              actionBusy && styles.buttonDisabled,
            ]}
          >
            {isProgressing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.progressButtonText}>
                {progressAction.label}
              </Text>
            )}
          </Pressable>
        ) : null}

        {item.status === "COMPLETED" ? (
          <Text style={styles.completedMessage}>
            This request has been marked as completed.
          </Text>
        ) : null}

        {item.status === "ASSISTANCE_NOT_CONFIRMED" ||
        item.status === "CANCELLED" ? (
          <Text style={styles.closedMessage}>
            This request is closed. No further progress updates are available.
          </Text>
        ) : null}
      </View>
    );
  };

  
  return (
    <SafeAreaView style={styles.safeArea}>
      {trackingRequest && !loading && !error ? (
        <View style={styles.dispatchScreen}>
          {providerLocation ? (
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: providerLocation.latitude,
                longitude: providerLocation.longitude,
                latitudeDelta: 0.025,
                longitudeDelta: 0.025,
              }}
              showsUserLocation
              showsCompass
              showsMyLocationButton
              mapPadding={{ top: 110, right: 24, bottom: 310, left: 24 }}
            >
              <Marker
                coordinate={providerLocation}
                title="Your ambulance"
                description="Latest vehicle GPS position"
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
              >
                <View
                  style={{
                    width: 46,
                    height: 42,
                    borderRadius: 14,
                    backgroundColor: "#461477",
                    borderWidth: 2,
                    borderColor: "#FFFFFF",
                    alignItems: "center",
                    justifyContent: "center",
                    elevation: 6,
                    shadowColor: "#191044",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                  }}
                >
                  <MaterialCommunityIcons
                    name="ambulance"
                    size={29}
                    color="#FFFFFF"
                  />
                </View>
              </Marker>
              {typeof trackingRequest.pickupLocation?.latitude === "number" &&
              typeof trackingRequest.pickupLocation?.longitude === "number" &&
              trackingRequest.pickupLocation.latitude >= -90 &&
              trackingRequest.pickupLocation.latitude <= 90 &&
              trackingRequest.pickupLocation.longitude >= -180 &&
              trackingRequest.pickupLocation.longitude <= 180 ? (
                <Marker
                  coordinate={{
                    latitude: trackingRequest.pickupLocation.latitude,
                    longitude: trackingRequest.pickupLocation.longitude,
                  }}
                  title="Patient pickup"
                  description={trackingRequest.pickupAddress}
                  pinColor="#A30E35"
                />
              ) : null}
              {typeof trackingRequest.destinationLocation?.latitude === "number" &&
              typeof trackingRequest.destinationLocation?.longitude === "number" &&
              trackingRequest.destinationLocation.latitude >= -90 &&
              trackingRequest.destinationLocation.latitude <= 90 &&
              trackingRequest.destinationLocation.longitude >= -180 &&
              trackingRequest.destinationLocation.longitude <= 180 ? (
                <Marker
                  coordinate={{
                    latitude: trackingRequest.destinationLocation.latitude,
                    longitude: trackingRequest.destinationLocation.longitude,
                  }}
                  title="Clinic / hospital"
                  description={trackingRequest.destinationAddress || "Medical destination"}
                  pinColor="#16845B"
                />
              ) : null}
              {routeCoordinates.length > 1 ? (
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor="#461477"
                  strokeWidth={5}
                  lineCap="round"
                  lineJoin="round"
                />
              ) : null}
            </MapView>
          ) : (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color="#461477" />
              <Text style={styles.mapPlaceholderText}>
                Waiting for your GPS position…
              </Text>
            </View>
          )}

          <View style={styles.mapTopBar}>
            <View style={styles.brandMark}>
              <Text style={styles.eyebrow}>SALEMA MEDICAL</Text>
              <Text style={styles.mapTopTitle}>Active dispatch</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadRequests(true)}
              disabled={loading || refreshing}
              style={styles.mapRefreshButton}
            >
              {refreshing ? (
                <ActivityIndicator color="#461477" />
              ) : (
                <Text style={styles.mapRefreshText}>Refresh</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.dispatchPanel}>
            <View style={styles.panelHandle} />

            <View style={styles.panelHeadingRow}>
              <View style={styles.panelHeadingText}>
                <Text style={styles.trackingTitle}>
                  {trackingRequest.serviceType === "EMERGENCY_AMBULANCE"
                    ? "Emergency ambulance"
                    : "Medical transport"}
                </Text>
                <Text style={styles.trackingReference}>
                  Reference: {trackingRequest.requestId}
                </Text>
              </View>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>
                  {trackingRequest.status.replace(/_/g, " ")}
                </Text>
              </View>
            </View>

            <View style={styles.panelDivider} />

            <Text style={styles.panelLabel}>PICKUP LOCATION</Text>
            <Text style={styles.panelAddress}>
              {trackingRequest.pickupAddress || "Pickup address not provided"}
            </Text>

            <Text style={styles.trackingMessage}>{trackingMessage}</Text>
            {routeCoordinates.length > 1 &&
            routeDistanceMeters !== null &&
            routeDuration !== null ? (
              <Text style={styles.routeSummary}>
                Driving route: {(routeDistanceMeters / 1000).toFixed(1)} km
                {"  ·  "}
                {formatRouteDuration(routeDuration)}
              </Text>
            ) : routeMessage ? (
              <Text style={styles.mapNote}>{routeMessage}</Text>
            ) : null}

            {typeof trackingRequest.pickupLocation?.latitude !== "number" ||
            typeof trackingRequest.pickupLocation?.longitude !== "number" ||
            trackingRequest.pickupLocation.latitude < -90 ||
            trackingRequest.pickupLocation.latitude > 90 ||
            trackingRequest.pickupLocation.longitude < -180 ||
            trackingRequest.pickupLocation.longitude > 180 ? (
              <Text style={styles.mapNote}>
                Exact pickup pin unavailable because this request has no valid GPS coordinates.
              </Text>
            ) : null}

            {PROGRESS_ACTIONS[trackingRequest.status] ? (
              <Pressable
                accessibilityRole="button"
                disabled={
                  acceptingId !== null || progressingId !== null
                }
                onPress={() =>
                  void progressRequest(
                    trackingRequest,
                    PROGRESS_ACTIONS[trackingRequest.status]
                  )
                }
                style={({ pressed }) => [
                  styles.progressButton,
                  pressed && styles.buttonPressed,
                  (acceptingId !== null || progressingId !== null) &&
                    styles.buttonDisabled,
                ]}
              >
                {progressingId === trackingRequest.requestId ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.progressButtonText}>
                    {PROGRESS_ACTIONS[trackingRequest.status].label}
                  </Text>
                )}
              </Pressable>
            ) : (
              <Text style={styles.dispatchInfo}>
                {trackingRequest.status === "PROVIDER_ACCEPTED"
                  ? "Waiting for Control Room dispatch confirmation."
                  : "Location sharing is available during an active dispatch."}
              </Text>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={() => void signOut()}
              style={styles.panelSignOut}
            >
              <Text style={styles.panelSignOutText}>Sign out</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>SALEMA MEDICAL</Text>
              <Text style={styles.heading}>Provider dashboard</Text>
              <Text style={styles.welcome}>
                Welcome{user?.fullName ? `, ${user.fullName}` : ""}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                Alert.alert("Sign out?", "Do you want to sign out?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Sign out",
                    style: "destructive",
                    onPress: () => void signOut(),
                  },
                ]);
              }}
              style={styles.signOutButton}
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Assigned requests</Text>
              <Text style={styles.sectionSubtitle}>
                Requests assigned to your provider account
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => void loadRequests(true)}
              disabled={loading || refreshing}
              style={styles.refreshButton}
            >
              <Text style={styles.refreshText}>
                {refreshing ? "Refreshing…" : "Refresh"}
              </Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color="#461477" />
              <Text style={styles.stateText}>
                Loading assigned requests…
              </Text>
            </View>
          ) : error ? (
            <View style={styles.centerState}>
              <Text style={styles.errorTitle}>Could not load requests</Text>
              <Text style={styles.stateText}>{error}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void loadRequests()}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={requests}
              keyExtractor={(item) => item.requestId}
              renderItem={renderRequest}
              contentContainerStyle={
                requests.length === 0
                  ? styles.emptyList
                  : styles.listContent
              }
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => void loadRequests(true)}
                  tintColor="#461477"
                  colors={["#461477"]}
                />
              }
              ListEmptyComponent={
                <View style={styles.centerState}>
                  <Text style={styles.emptyTitle}>
                    No assigned requests yet
                  </Text>
                  <Text style={styles.stateText}>
                    Requests assigned to your account by the Control Room
                    will appear here.
                  </Text>
                </View>
              }
            />
          )}

          <Text style={styles.footer}>
            SALEMA MEDICAL · BEYOND EXPECTATIONS
          </Text>
        </>
      )}
    </SafeAreaView>
  );

}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F6FC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5DDF0",
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
    color: "#461477",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  heading: {
    color: "#191044",
    fontSize: 24,
    fontWeight: "800",
  },
  welcome: {
    color: "#626782",
    fontSize: 13,
    marginTop: 5,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: "#E5DDF0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  signOutText: {
    color: "#461477",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 12,
  },
  sectionTitle: {
    color: "#191044",
    fontSize: 18,
    fontWeight: "800",
  },
  sectionSubtitle: {
    color: "#73738A",
    fontSize: 12,
    marginTop: 4,
  },
  refreshButton: {
    borderRadius: 10,
    backgroundColor: "#EEE6F7",
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  refreshText: {
    color: "#461477",
    fontSize: 12,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5DDF0",
    padding: 17,
    marginBottom: 14,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  cardTitleWrap: {
    flex: 1,
  },
  service: {
    color: "#191044",
    fontSize: 16,
    fontWeight: "800",
  },
  reference: {
    color: "#73738A",
    fontSize: 11,
    marginTop: 5,
  },
  statusBadge: {
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 7,
    maxWidth: "48%",
  },
  pendingBadge: {
    backgroundColor: "#FFF1E5",
  },
  otherBadge: {
    backgroundColor: "#EEE6F7",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  pendingText: {
    color: "#8A4700",
  },
  otherText: {
    color: "#461477",
  },
  emergencyBanner: {
    alignSelf: "flex-start",
    backgroundColor: "#FBE9EE",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 12,
  },
  emergencyText: {
    color: "#A30E35",
    fontSize: 12,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: "#EEE8F4",
    marginVertical: 15,
  },
  fieldLabel: {
    color: "#73738A",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 11,
    marginBottom: 4,
  },
  fieldValue: {
    color: "#191044",
    fontSize: 14,
    lineHeight: 20,
  },
  extraInfo: {
    color: "#461477",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 10,
  },
  createdAt: {
    color: "#73738A",
    fontSize: 11,
    marginTop: 16,
  },
  acceptButton: {
    minHeight: 48,
    backgroundColor: "#461477",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 17,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  acceptButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  progressButton: {
    minHeight: 48,
    backgroundColor: "#461477",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 17,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  progressButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  acceptedMessage: {
    color: "#461477",
    backgroundColor: "#F1EAF8",
    borderRadius: 11,
    padding: 12,
    marginTop: 15,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  completedMessage: {
    color: "#276749",
    backgroundColor: "#E8F5EC",
    borderRadius: 11,
    padding: 12,
    marginTop: 15,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  closedMessage: {
    color: "#A30E35",
    backgroundColor: "#FBE9EE",
    borderRadius: 11,
    padding: 12,
    marginTop: 15,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 26,
  },
  stateText: {
    color: "#626782",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 10,
  },
  errorTitle: {
    color: "#A30E35",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyTitle: {
    color: "#191044",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#461477",
    borderRadius: 11,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 18,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  trackingCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5DDF0",
    borderRadius: 18,
    padding: 15,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  trackingTitle: {
    color: "#191044",
    fontSize: 16,
    fontWeight: "800",
  },
  trackingReference: {
    color: "#73738A",
    fontSize: 11,
    marginTop: 4,
  },
  trackingMessage: {
    color: "#461477",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 10,
  },
 
  dispatchScreen: {
    flex: 1,
    backgroundColor: "#F8F6FC",
    position: "relative",
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  mapLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F6FC",
  },
  mapTopBar: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 13,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5DDF0",
  },
  brandMark: {
    flex: 1,
  },
  mapTopTitle: {
    color: "#191044",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 4,
  },
  mapRefreshButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#F1EAF8",
    alignItems: "center",
    justifyContent: "center",
  },
  mapRefreshText: {
    color: "#461477",
    fontWeight: "800",
  },
  dispatchPanel: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5DDF0",
    elevation: 12,
    shadowColor: "#191044",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
  },
  panelHandle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#D9D0E5",
    marginBottom: 16,
  },
  panelHeadingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  panelHeadingText: {
    flex: 1,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1EAF8",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 8,
    maxWidth: "48%",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#461477",
  },
  liveText: {
    color: "#461477",
    fontSize: 9,
    fontWeight: "800",
  },
  panelDivider: {
    height: 1,
    backgroundColor: "#EEE8F4",
    marginVertical: 15,
  },
  panelLabel: {
    color: "#73738A",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 6,
  },
  panelAddress: {
    color: "#191044",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  dispatchInfo: {
    color: "#626782",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  panelSignOut: {
    alignSelf: "center",
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginTop: 5,
  },
  panelSignOutText: {
    color: "#73738A",
    fontSize: 12,
    fontWeight: "700",
  },

  mapPlaceholder: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F6FC",
    borderRadius: 12,
  },
  mapPlaceholderText: {
    color: "#626782",
    fontSize: 12,
    marginTop: 10,
  },
  pickupAddress: {
    color: "#191044",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  routeSummary: {
    color: "#461477",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,
  },
  mapNote: {
    color: "#73738A",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  footer: {
    color: "#73738A",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.1,
    textAlign: "center",
    paddingVertical: 13,
    paddingHorizontal: 8,
  },
});
