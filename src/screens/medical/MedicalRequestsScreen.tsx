import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Polyline } from "react-native-maps";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { io, type Socket } from "socket.io-client";

import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

const purple = "#461477";
const dark = "#191044";
const muted = "#626782";
const border = "#E5DDF0";
const green = "#19744A";
const red = "#A30E35";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type ProviderLocation = Coordinates & {
  updatedAt?: string;
};

type MedicalRequest = {
  requestId: string;
  serviceType: "EMERGENCY_AMBULANCE" | "MEDICAL_TRANSPORT";
  urgencyLevel?: string;
  description?: string;
  status: string;
  pickupAddress: string;
  pickupLocation?: Coordinates;
  pickupLocationVerified?: boolean;
  destinationAddress?: string;
  destinationLocation?: Coordinates;
  requestedDateTime?: string;
  dispatchConfirmedAt?: string;
  providerLocation?: ProviderLocation;
  createdAt: string;
  updatedAt: string;
};

type RequestsResponse = {
  success: boolean;
  message?: string;
  requests: MedicalRequest[];
};

type TrackingPayload = {
  requestId: string;
  status?: string;
  providerLocation?: ProviderLocation | null;
};

type ApiErrorPayload = {
  message?: string;
};

const ACTIVE_TRACKING_STATUSES = [
  "DISPATCHED",
  "ON_THE_WAY",
  "ARRIVED_AT_PICKUP",
  "PATIENT_TRANSPORTING",
];

const TRACKABLE_STATUSES = [
  ...ACTIVE_TRACKING_STATUSES,
  "COMPLETED",
];

function isTrackable(status: string): boolean {
  return TRACKABLE_STATUSES.includes(status);
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    REQUEST_SUBMITTED: "Request submitted",
    CONTROL_ROOM_REVIEWING: "Control room reviewing",
    PROVIDER_BEING_CONTACTED: "Finding a provider",
    PROVIDER_ACCEPTED: "Provider accepted",
    DISPATCHED: "Dispatched",
    ON_THE_WAY: "Provider on the way",
    ARRIVED_AT_PICKUP: "Arrived at pickup",
    PATIENT_TRANSPORTING: "Transport in progress",
    COMPLETED: "Completed",
    ASSISTANCE_NOT_CONFIRMED: "Assistance not confirmed",
    CANCELLED: "Cancelled",
  };

  return labels[status] ?? status.replace(/_/g, " ");
}

function getStatusColor(status: string): string {
  if (status === "COMPLETED") return green;
  if (
    status === "CANCELLED" ||
    status === "ASSISTANCE_NOT_CONFIRMED"
  ) {
    return red;
  }
  return purple;
}

function formatDate(value?: string): string {
  if (!value) return "Not provided";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString();
}

function validCoordinates(
  value?: Coordinates | ProviderLocation | null
): Coordinates | null {
  if (
    !value ||
    typeof value.latitude !== "number" ||
    typeof value.longitude !== "number" ||
    !Number.isFinite(value.latitude) ||
    !Number.isFinite(value.longitude) ||
    value.latitude < -90 ||
    value.latitude > 90 ||
    value.longitude < -180 ||
    value.longitude > 180
  ) {
    return null;
  }

  return {
    latitude: value.latitude,
    longitude: value.longitude,
  };
}


function decodeEncodedPolyline(encoded: string): Coordinates[] {
  const points: Coordinates[] = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let result = 0, shift = 0, byte: number;
    do {
      if (index >= encoded.length) throw new Error("Invalid encoded route.");
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 31) << shift;
      shift += 5;
    } while (byte >= 32);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      if (index >= encoded.length) throw new Error("Invalid encoded route.");
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 31) << shift;
      shift += 5;
    } while (byte >= 32);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

function distanceBetweenMeters(a: Coordinates, b: Coordinates): number {
  const rad = (n: number) => n * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const lat1 = rad(a.latitude), lat2 = rad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function formatRouteDuration(value: string): string {
  const seconds = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
  if (!Number.isFinite(seconds)) return value;
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} hr ${remaining} min` : `${hours} hr`;
}

export default function MedicalRequestsScreen() {
  const navigation = useNavigation();
  const { token, loading: authLoading } = useAuth();

  const [requests, setRequests] = useState<MedicalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingMessage, setTrackingMessage] = useState<string | null>(
    null
  );

  const [routeCoordinates, setRouteCoordinates] = useState<Coordinates[]>([]);
  const [routeDistanceMeters, setRouteDistanceMeters] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<string | null>(null);
  const [routeMessage, setRouteMessage] = useState("");
  const routeLastRequestedRef = useRef<{
    latitude: number; longitude: number; requestedAt: number;
  } | null>(null);
  const routeRequestInFlightRef = useRef(false);
  const routeRequestKeyRef = useRef("");

  const loadRequests = useCallback(
    async (manualRefresh = false) => {
      if (!token) return;

      if (manualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/medical-requests/patient/mine`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        const payload = (await response.json()) as RequestsResponse;

        if (!response.ok || !payload.success) {
          throw new Error(
            payload.message || "Unable to load your medical requests."
          );
        }

        setRequests(
          Array.isArray(payload.requests) ? payload.requests : []
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your medical requests."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      setLoading(false);
      setError("Please sign in again to view your medical requests.");
      return;
    }

    void loadRequests();
  }, [authLoading, token, loadRequests]);

  // Only track a request after dispatch has been confirmed.
  const trackingRequest =
    requests.find((request) =>
      ACTIVE_TRACKING_STATUSES.includes(request.status)
    ) ??
    requests.find((request) => request.status === "COMPLETED");

  const trackingRequestId = trackingRequest?.requestId;
  const trackingStatus = trackingRequest?.status;

  // Subscribe to status updates even before dispatch is confirmed.
  // Prefer the request already being tracked on the map.
  const statusSubscriptionRequest =
    trackingRequest ??
    requests.find(
      (request) =>
        !["COMPLETED", "CANCELLED", "ASSISTANCE_NOT_CONFIRMED"].includes(
          request.status
        )
    );

  const statusSubscriptionRequestId = statusSubscriptionRequest?.requestId;
  const statusSubscriptionStatus = statusSubscriptionRequest?.status;

  useEffect(() => {
    if (
      !token ||
      !statusSubscriptionRequestId ||
      !statusSubscriptionStatus
    ) {
      setTrackingMessage(null);
      return;
    }

    let socket: Socket | undefined;
    let disposed = false;

    setTrackingMessage("Connecting to live tracking…");

    const socketOrigin = API_BASE_URL.replace(/\/api\/?$/, "");

    socket = io(socketOrigin, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    const joinTrackingRoom = () => {
      socket?.emit("medical-request:join", {
        requestId: statusSubscriptionRequestId,
      });
    };

    const handleTrackingUpdate = (payload: TrackingPayload) => {
      if (payload?.requestId !== statusSubscriptionRequestId) return;

      setRequests((current) =>
        current.map((request) => {
          if (request.requestId !== statusSubscriptionRequestId) {
            return request;
          }

          return {
            ...request,
            ...(payload.status
              ? { status: payload.status }
              : {}),
            ...(Object.prototype.hasOwnProperty.call(
              payload,
              "providerLocation"
            )
              ? { providerLocation: payload.providerLocation ?? undefined }
              : {}),
          };
        })
      );

      setTrackingMessage(null);
    };

    const handleTrackingError = (payload: ApiErrorPayload) => {
      if (disposed) return;

      setTrackingMessage(
        payload?.message || "Live tracking is temporarily unavailable."
      );
    };

    const handleConnectionError = () => {
      if (!disposed) {
        setTrackingMessage(
          "Live tracking connection unavailable. You can refresh your requests."
        );
      }
    };

   socket.on("connect", joinTrackingRoom);
socket.on("medical-request:tracking-ready", handleTrackingUpdate);
socket.on("medical-request:location-updated", handleTrackingUpdate);
socket.on("medical-request:status-updated", handleTrackingUpdate);
socket.on("medical-request:error", handleTrackingError);
socket.on("connect_error", handleConnectionError);

    if (socket.connected) {
      joinTrackingRoom();
    }

    return () => {
      disposed = true;

     socket?.off("connect", joinTrackingRoom);
socket?.off("medical-request:tracking-ready", handleTrackingUpdate);
socket?.off("medical-request:location-updated", handleTrackingUpdate);
socket?.off("medical-request:status-updated", handleTrackingUpdate);
socket?.off("medical-request:error", handleTrackingError);
socket?.off("connect_error", handleConnectionError);
socket?.disconnect();
    };
  }, [token, statusSubscriptionRequestId, statusSubscriptionStatus]);

  const providerCoordinate = validCoordinates(
    trackingRequest?.providerLocation
  );

  const pickupCoordinate = validCoordinates(
    trackingRequest?.pickupLocation
  );

  const destinationCoordinate = validCoordinates(
    trackingRequest?.destinationLocation
  );

  const isDestinationLeg =
    (trackingRequest?.status === "PATIENT_TRANSPORTING" ||
      trackingRequest?.status === "COMPLETED") &&
    Boolean(destinationCoordinate);

  const routeDestination = isDestinationLeg
    ? destinationCoordinate
    : pickupCoordinate;

  const mapCoordinate = providerCoordinate ?? pickupCoordinate;

  useEffect(() => {
    const requestId = trackingRequest?.requestId;
    const origin = providerCoordinate;
    const destination = routeDestination;
    const leg = isDestinationLeg ? "destination" : "pickup";
    const key = requestId && destination
      ? `${requestId}:${leg}:${destination.latitude}:${destination.longitude}`
      : "";

    if (routeRequestKeyRef.current !== key) {
      routeRequestKeyRef.current = key;
      routeLastRequestedRef.current = null;
      setRouteCoordinates([]);
      setRouteDistanceMeters(null);
      setRouteDuration(null);
      setRouteMessage("");
    }
    if (!token || !origin || !destination || !requestId) return;

    const previous = routeLastRequestedRef.current;
    const elapsed = previous ? Date.now() - previous.requestedAt : Infinity;
    const moved = previous ? distanceBetweenMeters(previous, origin) : Infinity;
    if (previous && moved < 100 && elapsed < 30000) return;
    if (routeRequestInFlightRef.current) return;

    const start = { ...origin };
    routeLastRequestedRef.current = { ...start, requestedAt: Date.now() };
    routeRequestInFlightRef.current = true;
    setRouteMessage("Calculating driving route…");

    void (async () => {
      try {
        const query = new URLSearchParams({
          originLat: String(start.latitude),
          originLng: String(start.longitude),
          destinationLat: String(destination.latitude),
          destinationLng: String(destination.longitude),
        });
        const response = await fetch(
          `${API_BASE_URL}/places/directions?${query.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
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

        if (!response.ok || !data.success ||
            !data.route?.encodedPolyline ||
            typeof data.route.distanceMeters !== "number" ||
            typeof data.route.duration !== "string") {
          throw new Error(data.message || "Driving directions are unavailable.");
        }

        const points = decodeEncodedPolyline(data.route.encodedPolyline);
        if (points.length < 2) throw new Error("The driving route is incomplete.");
        if (routeRequestKeyRef.current !== key) return;

        setRouteCoordinates(points);
        setRouteDistanceMeters(data.route.distanceMeters);
        setRouteDuration(data.route.duration);
        setRouteMessage("");
      } catch (err) {
        if (routeRequestKeyRef.current === key) {
          setRouteCoordinates([]);
          setRouteDistanceMeters(null);
          setRouteDuration(null);
          setRouteMessage(
            err instanceof Error ? err.message : "Unable to calculate driving directions."
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
    isDestinationLeg,
    routeDestination?.latitude,
    routeDestination?.longitude,
    providerCoordinate?.latitude,
    providerCoordinate?.longitude,
  ]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadRequests(true)}
            tintColor={purple}
            colors={[purple]}
          />
        }
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={21} color={purple} />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons
              name="document-text-outline"
              size={29}
              color={purple}
            />
          </View>

          <Text style={styles.title}>My Medical Requests</Text>
          <Text style={styles.subtitle}>
            Follow your medical assistance requests and see their latest
            confirmed status.
          </Text>
        </View>

        {loading ? (
          <View style={styles.messageCard}>
            <ActivityIndicator size="large" color={purple} />
            <Text style={styles.messageText}>
              Loading your medical requests…
            </Text>
          </View>
        ) : error ? (
          <View style={styles.messageCard}>
            <Ionicons
              name="alert-circle-outline"
              size={35}
              color={red}
            />
            <Text style={styles.messageTitle}>
              Requests could not be loaded
            </Text>
            <Text style={styles.messageText}>{error}</Text>

            <Pressable
              onPress={() => void loadRequests()}
              style={styles.primaryButton}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.messageCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="clipboard-outline"
                size={37}
                color={purple}
              />
            </View>

            <Text style={styles.messageTitle}>
              No medical requests yet
            </Text>
            <Text style={styles.messageText}>
              Requests you submit using your account will appear here with
              their current status and reference number.
            </Text>

            <Pressable
              onPress={() => void loadRequests(true)}
              style={styles.secondaryButton}
              accessibilityRole="button"
            >
              <Ionicons name="refresh" size={17} color={purple} />
              <Text style={styles.secondaryButtonText}>Refresh requests</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.listHeading}>
              <Text style={styles.sectionTitle}>Your requests</Text>
              <Text style={styles.countText}>
                {requests.length} {requests.length === 1 ? "request" : "requests"}
              </Text>
            </View>

            {trackingRequest ? (
              <View style={styles.trackingCard}>
                <View style={styles.trackingHeading}>
                  <View style={styles.trackingHeadingIcon}>
                    <Ionicons
                      name="navigate-outline"
                      size={23}
                      color={purple}
                    />
                  </View>

                  <View style={styles.trackingHeadingText}>
                    <Text style={styles.trackingTitle}>Live tracking</Text>
                    <Text style={styles.trackingSubtitle}>
                      Reference {trackingRequest.requestId}
                    </Text>
                  </View>

                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>ACTIVE</Text>
                  </View>
                </View>

                <Text style={styles.trackingStatus}>
                  {getStatusLabel(trackingRequest.status)}
                </Text>

                {mapCoordinate ? (
                  <View style={styles.mapContainer}>
                <MapView
  style={styles.map}
  region={{
    ...mapCoordinate,
    latitudeDelta: 0.025,
    longitudeDelta: 0.025,
  }}
  scrollEnabled
  zoomEnabled
  showsCompass
  showsMyLocationButton
  accessibilityLabel="Medical request tracking map"
>
                      {pickupCoordinate ? (
                        <Marker
                          coordinate={pickupCoordinate}
                          title="Pickup location"
                          description={trackingRequest.pickupAddress}
                          pinColor={purple}
                        />
                      ) : null}

                      {destinationCoordinate ? (
                        <Marker
                          coordinate={destinationCoordinate}
                          title="Clinic / hospital"
                          description={trackingRequest.destinationAddress || "Destination"}
                          pinColor="#16845B"
                        />
                      ) : null}

                      {providerCoordinate ? (
                        <Marker
                          coordinate={providerCoordinate}
                          title="Ambulance / medical transport"
                          description="Latest reported vehicle GPS position"
                          anchor={{ x: 0.5, y: 0.5 }}
                        >
                          <View style={styles.vehicleMarker}>
                            <MaterialCommunityIcons
                              name="ambulance"
                              size={29}
                              color="#FFFFFF"
                            />
                          </View>
                        </Marker>
                      ) : null}

                      {routeCoordinates.length > 1 ? (
                        <Polyline
                          coordinates={routeCoordinates}
                          strokeColor={purple}
                          strokeWidth={5}
                          lineCap="round"
                          lineJoin="round"
                        />
                      ) : null}
                    </MapView>
                  </View>
                ) : (
                  <View style={styles.mapPlaceholder}>
                    <Ionicons
                      name="map-outline"
                      size={32}
                      color={purple}
                    />
                    <Text style={styles.mapPlaceholderTitle}>
                      Location not available yet
                    </Text>
                    <Text style={styles.mapPlaceholderText}>
                      The map will show available coordinates when the
                      provider's app reports its location. Your pickup
                      address is shown below.
                    </Text>
                  </View>
                )}

                {routeCoordinates.length > 1 &&
                routeDistanceMeters !== null && routeDuration !== null ? (
                  <View style={styles.routeSummary}>
                    <View style={styles.routeSummaryIcon}>
                      <MaterialCommunityIcons
                        name="map-marker-path"
                        size={22}
                        color={purple}
                      />
                    </View>
                    <View style={styles.routeSummaryText}>
                      <Text style={styles.routeSummaryTitle}>
                        {(routeDistanceMeters / 1000).toFixed(1)} km
                        {"  ·  "}
                        {formatRouteDuration(routeDuration)}
                      </Text>
                      <Text style={styles.routeSummaryCaption}>
                        Estimated driving distance and time to your pickup
                      </Text>
                    </View>
                  </View>
                ) : routeMessage ? (
                  <Text style={styles.routeMessage}>{routeMessage}</Text>
                ) : null}

                <View style={styles.locationLegend}>
                  <View style={styles.legendItem}>
                    <View style={styles.pickupLegendDot} />
                    <Text style={styles.legendText}>Pickup</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={styles.providerLegendDot} />
                    <Text style={styles.legendText}>Provider</Text>
                  </View>
                </View>

                <View style={styles.updateInfo}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={muted}
                  />
                  <Text style={styles.updateInfoText}>
                    {trackingRequest.providerLocation?.updatedAt
                      ? `Last location update: ${formatDate(
                          trackingRequest.providerLocation.updatedAt
                        )}`
                      : "No provider location update received yet."}
                  </Text>
                </View>

                {trackingMessage ? (
                  <View style={styles.trackingNotice}>
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color="#765516"
                    />
                    <Text style={styles.trackingNoticeText}>
                      {trackingMessage}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.trackingFootnote}>
                    The map shows reported coordinates, which may not reflect
                    the provider's exact current position.
                  </Text>
                )}
              </View>
            ) : null}

            {requests.map((request) => {
              const statusColor = getStatusColor(request.status);
              const emergency =
                request.serviceType === "EMERGENCY_AMBULANCE";

              return (
                <View key={request.requestId} style={styles.requestCard}>
                  <View style={styles.requestTopRow}>
                    <View
                      style={[
                        styles.serviceIcon,
                        emergency
                          ? styles.emergencyIcon
                          : styles.transportIcon,
                      ]}
                    >
                      <Ionicons
                        name={emergency ? "medical-outline" : "car-outline"}
                        size={23}
                        color={emergency ? red : purple}
                      />
                    </View>

                    <View style={styles.serviceDetails}>
                      <Text style={styles.serviceTitle}>
                        {emergency
                          ? "Emergency Ambulance"
                          : "Medical Transport"}
                      </Text>
                      <Text style={styles.referenceText}>
                        Ref: {request.requestId}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      { borderColor: statusColor + "40" },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: statusColor },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusLabel,
                        { color: statusColor },
                      ]}
                    >
                      {getStatusLabel(request.status)}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={muted}
                    />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Pickup</Text>
                      <Text style={styles.detailValue}>
                        {request.pickupAddress || "Not provided"}
                      </Text>
                    </View>
                  </View>

                  {request.destinationAddress ? (
                    <View style={styles.detailRow}>
                      <Ionicons
                        name="flag-outline"
                        size={18}
                        color={muted}
                      />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Destination</Text>
                        <Text style={styles.detailValue}>
                          {request.destinationAddress}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.detailRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={muted}
                    />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Submitted</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(request.createdAt)}
                      </Text>
                    </View>
                  </View>

                  {request.requestedDateTime ? (
                    <View style={styles.detailRow}>
                      <Ionicons
                        name="time-outline"
                        size={18}
                        color={muted}
                      />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>
                          Requested appointment
                        </Text>
                        <Text style={styles.detailValue}>
                          {formatDate(request.requestedDateTime)}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {isTrackable(request.status) ? (
                    <Text style={styles.dispatchNote}>
                      Dispatch has been confirmed. Provider location updates
                      depend on the provider's app and GPS availability.
                    </Text>
                  ) : request.status === "COMPLETED" ? (
                    <Text style={styles.completedNote}>
                      This request is marked as completed.
                    </Text>
                  ) : request.status === "CANCELLED" ||
                    request.status === "ASSISTANCE_NOT_CONFIRMED" ? (
                    <Text style={styles.dispatchNote}>
                      Live tracking is not active for this request.
                    </Text>
                  ) : (
                    <Text style={styles.dispatchNote}>
                      This request has not been confirmed as dispatched.
                    </Text>
                  )}
                </View>
              );
            })}
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>SALEMA MEDICAL</Text>
          <Text style={styles.footerText}>BEYOND EXPECTATIONS</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8F6FC" },
  content: { padding: 20, paddingBottom: 34 },
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
  header: { alignItems: "center", marginBottom: 24 },
  headerIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "#EEE5FA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    color: dark,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
  },
  listHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    color: dark,
    fontSize: 19,
    fontWeight: "900",
  },
  countText: {
    color: muted,
    fontSize: 12,
    fontWeight: "700",
  },
  messageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: border,
    padding: 23,
    alignItems: "center",
  },
  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: "#F1EAFB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  messageTitle: {
    color: dark,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 12,
  },
  messageText: {
    color: muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 9,
  },
  primaryButton: {
    backgroundColor: purple,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 13,
    marginTop: 19,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: border,
    paddingHorizontal: 17,
    paddingVertical: 11,
    marginTop: 18,
  },
  secondaryButtonText: {
    color: purple,
    fontWeight: "800",
    fontSize: 13,
  },
  trackingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: border,
    padding: 15,
    marginBottom: 18,
  },
  trackingHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trackingHeadingIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: "#F1EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  trackingHeadingText: { flex: 1 },
  trackingTitle: {
    color: dark,
    fontSize: 16,
    fontWeight: "900",
  },
  trackingSubtitle: {
    color: muted,
    fontSize: 11,
    marginTop: 4,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EAF6EF",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: green,
  },
  liveText: {
    color: green,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  trackingStatus: {
    color: purple,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 15,
    marginBottom: 12,
  },
  mapContainer: {
      height: 360,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "#F1EAFB",
  },
  map: { flex: 1 },
  vehicleMarker: {
    width: 46, height: 42, borderRadius: 14, backgroundColor: purple,
    borderWidth: 2, borderColor: "#FFFFFF", alignItems: "center",
    justifyContent: "center", elevation: 6,
  },
  routeSummary: {
    flexDirection: "row", alignItems: "center", gap: 11,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F0EBF6",
  },
  routeSummaryIcon: {
    width: 42, height: 42, borderRadius: 13, backgroundColor: "#F1EAFB",
    alignItems: "center", justifyContent: "center",
  },
  routeSummaryText: { flex: 1 },
  routeSummaryTitle: { color: dark, fontSize: 16, fontWeight: "900" },
  routeSummaryCaption: { color: muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  routeMessage: { color: muted, fontSize: 11, lineHeight: 17, marginTop: 9 },
  mapPlaceholder: {
    minHeight: 175,
    backgroundColor: "#F8F6FC",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: border,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  mapPlaceholderTitle: {
    color: dark,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 10,
    textAlign: "center",
  },
  mapPlaceholderText: {
    color: muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 7,
  },
  locationLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EBF6",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  pickupLegendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: purple,
  },
  providerLegendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: green,
  },
  legendText: { color: muted, fontSize: 11 },
  updateInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    marginTop: 12,
  },
  updateInfoText: {
    flex: 1,
    color: muted,
    fontSize: 11,
    lineHeight: 17,
  },
  trackingFootnote: {
    color: muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 9,
  },
  trackingNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 11,
    backgroundColor: "#FFF6DF",
    borderRadius: 10,
    marginTop: 12,
  },
  trackingNoticeText: {
    flex: 1,
    color: "#765516",
    fontSize: 11,
    lineHeight: 17,
  },
  requestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    borderWidth: 1,
    borderColor: border,
    padding: 16,
    marginBottom: 14,
  },
  requestTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  serviceIcon: {
    width: 47,
    height: 47,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  emergencyIcon: { backgroundColor: "#FBE9EE" },
  transportIcon: { backgroundColor: "#F1EAFB" },
  serviceDetails: { flex: 1 },
  serviceTitle: {
    color: dark,
    fontSize: 15,
    fontWeight: "900",
  },
  referenceText: {
    color: muted,
    fontSize: 10,
    marginTop: 5,
  },
  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 15,
    marginBottom: 14,
    backgroundColor: "#FCFAFF",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 12,
  },
  detailContent: { flex: 1 },
  detailLabel: {
    color: muted,
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
  },
  detailValue: {
    color: dark,
    fontSize: 12,
    lineHeight: 18,
  },
  dispatchNote: {
    color: muted,
    backgroundColor: "#F8F6FC",
    borderRadius: 10,
    padding: 11,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 16,
  },
  completedNote: {
    color: green,
    backgroundColor: "#EAF6EF",
    borderRadius: 10,
    padding: 11,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 16,
  },
  footer: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 6,
  },
  footerBrand: {
    color: purple,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  footerText: {
    color: muted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.3,
    marginTop: 5,
  },
});
