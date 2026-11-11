import { Alert } from "../../utils/salemaAlert";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { io } from "socket.io-client";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/AppNavigator";
import { useCallback, useEffect, useState } from "react";
import MapView, { Marker, type Region } from "react-native-maps";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

type MedicalRequest = {
    requestId: string;
    serviceType: "EMERGENCY_AMBULANCE" | "MEDICAL_TRANSPORT";
    urgencyLevel: "EMERGENCY" | "NON_EMERGENCY";
    description?: string;
    callbackNumber: string;
    pickupAddress: string;
    destinationAddress?: string;
    requestedDateTime?: string;
    status: string;
    createdAt: string;
    assignedProviderId?: string;
    dispatchConfirmedAt?: string | null;
    pickupLocation?: {
        latitude: number;
        longitude: number;
    };
    providerLocation?: {
        latitude: number;
        longitude: number;
        updatedAt?: string;
    };
};

type ProviderType =
    | "AMBULANCE_COMPANY"
    | "MEDICAL_TRANSPORT_COMPANY"
    | "INDIVIDUAL_DRIVER";

type MedicalProvider = {
    id: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
    providerType: ProviderType;
    organisationName?: string;
    serviceArea: string;
};

type ProvidersResponse = {
    success: boolean;
    message?: string;
    providers?: MedicalProvider[];
};

type RequestsResponse = {
    success: boolean;
    message?: string;
    requests?: MedicalRequest[];
};

type UpdateResponse = {
    success: boolean;
    message?: string;
    request?: {
        requestId: string;
        status: string;
    };
};

const PURPLE = "#461477";
const DARK = "#191044";
const BACKGROUND = "#F8F6FC";
const MUTED = "#626782";
const BORDER = "#E5DDF0";
const RED = "#A30E35";

const STATUS_LABELS: Record<string, string> = {
    REQUEST_SUBMITTED: "Submitted",
    CONTROL_ROOM_REVIEWING: "Under review",
    PROVIDER_BEING_CONTACTED: "Contacting provider",
    PROVIDER_ACCEPTED: "Provider accepted",
    DISPATCHED: "Dispatched",
    ON_THE_WAY: "On the way",
    ARRIVED_AT_PICKUP: "Arrived at pickup",
    PATIENT_TRANSPORTING: "Transporting patient",
    COMPLETED: "Completed",
    ASSISTANCE_NOT_CONFIRMED: "Assistance not confirmed",
    CANCELLED: "Cancelled",
};

const NEXT_ACTIONS: Record<
    string,
    { status: string; label: string } | undefined
> = {
    REQUEST_SUBMITTED: {
        status: "CONTROL_ROOM_REVIEWING",
        label: "Start reviewing",
    },
    PROVIDER_BEING_CONTACTED: {
        status: "PROVIDER_ACCEPTED",
        label: "Record provider acceptance",
    },
    DISPATCHED: {
        status: "ON_THE_WAY",
        label: "Mark provider on the way",
    },
    ON_THE_WAY: {
        status: "ARRIVED_AT_PICKUP",
        label: "Mark arrived at pickup",
    },
    ARRIVED_AT_PICKUP: {
        status: "PATIENT_TRANSPORTING",
        label: "Start patient transport",
    },
    PATIENT_TRANSPORTING: {
        status: "COMPLETED",
        label: "Complete request",
    },
};

function hasValidCoordinates(
    point?: { latitude: number; longitude: number } | null
): boolean {
    return Boolean(
        point &&
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude) &&
        point.latitude >= -90 &&
        point.latitude <= 90 &&
        point.longitude >= -180 &&
        point.longitude <= 180
    );
}

function getMapRegion(requests: MedicalRequest[]): Region {
    const point =
        requests.find((request) => hasValidCoordinates(request.pickupLocation))
            ?.pickupLocation ??
        requests.find((request) => hasValidCoordinates(request.providerLocation))
            ?.providerLocation;

    return {
        latitude: point?.latitude ?? -26.2041,
        longitude: point?.longitude ?? 28.0473,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
    };
}

function formatDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Date unavailable"
        : date.toLocaleString();
}

function statusColor(status: string) {
    if (status === "COMPLETED") return "#18794E";

    if (
        status === "CANCELLED" ||
        status === "ASSISTANCE_NOT_CONFIRMED"
    ) {
        return RED;
    }

    if (
        status === "DISPATCHED" ||
        status === "ON_THE_WAY" ||
        status === "ARRIVED_AT_PICKUP" ||
        status === "PATIENT_TRANSPORTING"
    ) {
        return "#175CD3";
    }

    return PURPLE;
}

function isTerminal(status: string) {
    return [
        "COMPLETED",
        "CANCELLED",
        "ASSISTANCE_NOT_CONFIRMED",
    ].includes(status);
}

export default function ControlRoomDashboardScreen() {
    const { token, user, signOut } = useAuth();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const [requests, setRequests] = useState<MedicalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [busyRequestId, setBusyRequestId] = useState("");
    const [providers, setProviders] = useState<MedicalProvider[]>([]);
    const [selectedProviderIds, setSelectedProviderIds] = useState<
        Record<string, string>
    >({});
    const [providersLoading, setProvidersLoading] = useState(false);
    const [providersError, setProvidersError] = useState("");
    const [incomingCall, setIncomingCall] = useState<{
        callSessionId: string;
        callType: "VIDEO" | "AUDIO";
    } | null>(null);
    const [respondingCall, setRespondingCall] = useState(false);


    const respondToIncomingCall = async (
        response: "ACCEPT" | "DECLINE"
    ) => {
        if (!token || !incomingCall || respondingCall) return;

        const call = incomingCall;
        setRespondingCall(true);

        try {
            const result = await fetch(
                `${API_BASE_URL}/call-sessions/${encodeURIComponent(call.callSessionId)}/respond`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({ response }),
                }
            );

            const data = await result.json();
            if (!result.ok || data.success === false) {
                throw new Error(
                    data.message || "Unable to respond to this call."
                );
            }

            setIncomingCall((current) =>
                current?.callSessionId === call.callSessionId
                    ? null
                    : current
            );

            if (response === "ACCEPT") {
                navigation.navigate("Call", {
                    callSessionId: call.callSessionId,
                    callType: call.callType,
                });
            }
        } catch (error) {
            Alert.alert(
                "Call unavailable",
                error instanceof Error
                    ? error.message
                    : "Unable to respond to the incoming call."
            );
        } finally {
            setRespondingCall(false);
        }
    };

    const loadRequests = useCallback(async (isRefresh = false) => {
        if (!token) {
            setError("Please sign in to access the control room.");
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
                `${API_BASE_URL}/medical-requests`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                }
            );

            const data = (await response.json()) as RequestsResponse;

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Unable to load medical requests."
                );
            }

            setRequests(data.requests ?? []);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "A network error occurred. Please try again."
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);


    const loadProviders = useCallback(async () => {
        if (!token) return;

        setProvidersLoading(true);
        setProvidersError("");

        try {
            const response = await fetch(
                `${API_BASE_URL}/medical-requests/providers/approved`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                }
            );

            const data = (await response.json()) as ProvidersResponse;

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Unable to load approved providers."
                );
            }

            setProviders(data.providers ?? []);
        } catch (err) {
            setProvidersError(
                err instanceof Error
                    ? err.message
                    : "Unable to load providers. Please try again."
            );
        } finally {
            setProvidersLoading(false);
        }
    }, [token]);

    useEffect(() => {
        void loadRequests();
        void loadProviders();
    }, [loadRequests, loadProviders]);

    const updateRequest = async (
        request: MedicalRequest,
        status: string,
        options?: {
            assignedProviderId?: string;
            dispatchConfirmed?: boolean;
        }
    ) => {
        if (!token || busyRequestId) return;

        setBusyRequestId(request.requestId);

        try {
            const response = await fetch(
                `${API_BASE_URL}/medical-requests/${encodeURIComponent(
                    request.requestId
                )}/status`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        status,
                        ...options,
                    }),
                }
            );

            const data = (await response.json()) as UpdateResponse;

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Unable to update this medical request."
                );
            }

            Alert.alert(
                "Request updated",
                data.message || "The request status has been updated."
            );

            await loadRequests(true);
        } catch (err) {
            Alert.alert(
                "Update unsuccessful",
                err instanceof Error
                    ? err.message
                    : "A network error occurred. Please try again."
            );
        } finally {
            setBusyRequestId("");
        }
    };

    const assignProvider = (request: MedicalRequest) => {
        const providerId = selectedProviderIds[request.requestId];

        if (!providerId) {
            Alert.alert(
                "Select a provider",
                "Please select an approved provider before assigning this request."
            );
            return;
        }

        const provider = providers.find((item) => item.id === providerId);

        if (!provider) {
            Alert.alert(
                "Provider unavailable",
                "This provider is no longer in the available list. Refresh and try again."
            );
            return;
        }

        const categoryAllowed =
            request.serviceType === "EMERGENCY_AMBULANCE"
                ? provider.providerType === "AMBULANCE_COMPANY"
                : provider.providerType === "MEDICAL_TRANSPORT_COMPANY" ||
                  provider.providerType === "INDIVIDUAL_DRIVER";

        if (!categoryAllowed) {
            setSelectedProviderIds((previous) => ({
                ...previous,
                [request.requestId]: "",
            }));
            Alert.alert(
                "Provider category not eligible",
                "Choose an eligible provider category for this request."
            );
            return;
        }

        Alert.alert(
            "Confirm provider assignment",
            `Assign ${provider.fullName} to this medical request?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Assign provider",
                    onPress: () => {
                        void updateRequest(
                            request,
                            "PROVIDER_BEING_CONTACTED",
                            { assignedProviderId: provider.id }
                        );
                    },
                },
            ]
        );
    };

    const confirmDispatch = (request: MedicalRequest) => {
        Alert.alert(
            "Confirm dispatch",
            "Confirm that dispatch has actually been arranged before marking this request as dispatched.",
            [
                { text: "Go back", style: "cancel" },
                {
                    text: "Confirm dispatch",
                    onPress: () => {
                        void updateRequest(request, "DISPATCHED", {
                            dispatchConfirmed: true,
                        });
                    },
                },
            ]
        );
    };

    const handleNextAction = (request: MedicalRequest) => {
        if (request.status === "CONTROL_ROOM_REVIEWING") {
            Alert.alert(
                "Assign a provider",
                "Enter the provider ID below the request card, then select Assign provider."
            );
            return;
        }

        if (request.status === "PROVIDER_ACCEPTED") {
            confirmDispatch(request);
            return;
        }

        const action = NEXT_ACTIONS[request.status];

        if (!action) return;

        const messages: Record<string, string> = {
            PROVIDER_ACCEPTED:
                "Only record acceptance after the assigned provider has accepted the request.",
            ON_THE_WAY:
                "Confirm with the provider before recording that they are on the way.",
            ARRIVED_AT_PICKUP:
                "Confirm that the provider has arrived at the pickup location.",
            PATIENT_TRANSPORTING:
                "Confirm that the patient has begun transport.",
            COMPLETED:
                "Confirm that the transport or assistance has been completed.",
        };

        Alert.alert(
            action.label,
            messages[action.status] ??
            "Confirm this status update before continuing.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: () => {
                        void updateRequest(request, action.status);
                    },
                },
            ]
        );
    };

    const activeCount = requests.filter(
        (request) => !isTerminal(request.status)
    ).length;

    const emergencyCount = requests.filter(
        (request) =>
            request.serviceType === "EMERGENCY_AMBULANCE" &&
            !isTerminal(request.status)
    ).length;

    const renderRequest = ({ item }: { item: MedicalRequest }) => {
        const busy = busyRequestId === item.requestId;
        const nextAction = NEXT_ACTIONS[item.status];
        const needsProvider =
            item.status === "CONTROL_ROOM_REVIEWING";
        const hasAssignedProvider = Boolean(item.assignedProviderId);

        const eligibleProviders = providers.filter((provider) =>
            item.serviceType === "EMERGENCY_AMBULANCE"
                ? provider.providerType === "AMBULANCE_COMPANY"
                : provider.providerType === "MEDICAL_TRANSPORT_COMPANY" ||
                  provider.providerType === "INDIVIDUAL_DRIVER"
        );

        return (
            <View style={styles.requestCard}>
                <View style={styles.cardTop}>
                    <View style={styles.serviceIcon}>
                        <Ionicons
                            name={
                                item.serviceType === "EMERGENCY_AMBULANCE"
                                    ? "medkit"
                                    : "car"
                            }
                            size={22}
                            color={PURPLE}
                        />
                    </View>

                    <View style={styles.cardHeading}>
                        <Text style={styles.serviceTitle}>
                            {item.serviceType === "EMERGENCY_AMBULANCE"
                                ? "Emergency ambulance"
                                : "Medical transport"}
                        </Text>
                        <Text style={styles.requestId}>
                            Ref: {item.requestId}
                        </Text>
                    </View>

                    <View
                        style={[
                            styles.statusBadge,
                            { backgroundColor: `${statusColor(item.status)}15` },
                        ]}
                    >
                        <Text
                            style={[
                                styles.statusText,
                                { color: statusColor(item.status) },
                            ]}
                        >
                            {STATUS_LABELS[item.status] ?? item.status}
                        </Text>
                    </View>
                </View>

                {item.serviceType === "EMERGENCY_AMBULANCE" && (
                    <View style={styles.emergencyBanner}>
                        <Ionicons name="alert-circle" size={16} color={RED} />
                        <Text style={styles.emergencyBannerText}>
                            Emergency request — review promptly
                        </Text>
                    </View>
                )}

                <View style={styles.divider} />

                <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={18} color={MUTED} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Pickup</Text>
                        <Text style={styles.detailValue}>
                            {item.pickupAddress}
                        </Text>
                    </View>
                </View>

                {item.destinationAddress ? (
                    <View style={styles.detailRow}>
                        <Ionicons
                            name="navigate-outline"
                            size={18}
                            color={MUTED}
                        />
                        <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Destination</Text>
                            <Text style={styles.detailValue}>
                                {item.destinationAddress}
                            </Text>
                        </View>
                    </View>
                ) : null}

                <View style={styles.detailRow}>
                    <Ionicons name="call-outline" size={18} color={MUTED} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Callback number</Text>
                        <Text style={styles.detailValue}>
                            {item.callbackNumber}
                        </Text>
                    </View>
                </View>

                {item.requestedDateTime ? (
                    <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={18} color={MUTED} />
                        <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>
                                Requested transport time
                            </Text>
                            <Text style={styles.detailValue}>
                                {formatDate(item.requestedDateTime)}
                            </Text>
                        </View>
                    </View>
                ) : null}

                {item.description ? (
                    <View style={styles.descriptionBox}>
                        <Text style={styles.detailLabel}>Description</Text>
                        <Text style={styles.detailValue}>
                            {item.description}
                        </Text>
                    </View>
                ) : null}

                {item.assignedProviderId ? (
                    <View style={styles.providerInfo}>
                        <Text style={styles.detailLabel}>Assigned provider ID</Text>
                        <Text selectable style={styles.providerId}>
                            {item.assignedProviderId}
                        </Text>
                    </View>
                ) : null}

                {needsProvider && (
                    <View style={styles.providerSection}>
                        <Text style={styles.providerSectionTitle}>
                            Assign an approved provider
                        </Text>

                        <Text style={styles.helperText}>
                            Select the provider who will be contacted about this request.
                        </Text>

                        {providersLoading ? (
                            <View style={styles.providerLoading}>
                                <ActivityIndicator color={PURPLE} />
                                <Text style={styles.helperText}>
                                    Loading approved providers...
                                </Text>
                            </View>
                        ) : providersError ? (
                            <View>
                                <Text style={styles.warningText}>
                                    {providersError}
                                </Text>

                                <Pressable
                                    style={styles.secondaryButton}
                                    onPress={() => void loadProviders()}
                                >
                                    <Text style={styles.secondaryButtonText}>
                                        Retry loading providers
                                    </Text>
                                </Pressable>
                            </View>
                        ) : eligibleProviders.length === 0 ? (
                            <View style={styles.noProvidersBox}>
                                <Ionicons
                                    name="people-outline"
                                    size={24}
                                    color={MUTED}
                                />
                                <Text style={styles.noProvidersTitle}>
                                    No eligible providers available
                                </Text>
                                <Text style={styles.helperText}>
                                    {item.serviceType === "EMERGENCY_AMBULANCE"
                                        ? "An approved ambulance company must be available for an emergency request."
                                        : "An approved medical transport company or individual driver must be available for this request."}
                                </Text>

                                <Pressable
                                    style={styles.secondaryButton}
                                    onPress={() => void loadProviders()}
                                >
                                    <Text style={styles.secondaryButtonText}>
                                        Refresh providers
                                    </Text>
                                </Pressable>
                            </View>
                        ) : (
                            <>
                                {eligibleProviders.map((provider) => {
                                    const selected =
                                        selectedProviderIds[item.requestId] === provider.id;

                                    return (
                                        <Pressable
                                            key={provider.id}
                                            disabled={busy}
                                            onPress={() =>
                                                setSelectedProviderIds((previous) => ({
                                                    ...previous,
                                                    [item.requestId]: provider.id,
                                                }))
                                            }
                                            style={[
                                                styles.providerOption,
                                                selected && styles.providerOptionSelected,
                                                busy && styles.disabledButton,
                                            ]}
                                            accessibilityRole="radio"
                                            accessibilityState={{ selected }}
                                        >
                                            <View style={styles.providerOptionIcon}>
                                                <Ionicons
                                                    name="person-outline"
                                                    size={20}
                                                    color={PURPLE}
                                                />
                                            </View>

                                            <View style={styles.providerOptionDetails}>
                                                <Text style={styles.providerOptionName}>
                                                    {provider.fullName}
                                                </Text>
                                                <Text style={styles.providerOptionContact}>
                                                    {provider.providerType === "AMBULANCE_COMPANY"
                                                        ? "Ambulance company"
                                                        : provider.providerType === "MEDICAL_TRANSPORT_COMPANY"
                                                            ? "Medical transport company"
                                                            : "Individual driver"}
                                                </Text>
                                                {provider.organisationName ? (
                                                    <Text style={styles.providerOptionContact}>
                                                        {provider.organisationName}
                                                    </Text>
                                                ) : null}
                                                <Text style={styles.providerOptionContact}>
                                                    Service area: {provider.serviceArea}
                                                </Text>
                                                <Text style={styles.providerOptionContact}>
                                                    {provider.email}
                                                </Text>
                                                {provider.phoneNumber ? (
                                                    <Text style={styles.providerOptionContact}>
                                                        {provider.phoneNumber}
                                                    </Text>
                                                ) : null}
                                            </View>

                                            <Ionicons
                                                name={
                                                    selected
                                                        ? "checkmark-circle"
                                                        : "ellipse-outline"
                                                }
                                                size={23}
                                                color={selected ? PURPLE : MUTED}
                                            />
                                        </Pressable>
                                    );
                                })}

                                <Pressable
                                    disabled={
                                        busy || !selectedProviderIds[item.requestId]
                                    }
                                    onPress={() => assignProvider(item)}
                                    style={[
                                        styles.primaryButton,
                                        (busy || !selectedProviderIds[item.requestId]) &&
                                        styles.disabledButton,
                                    ]}
                                >
                                    {busy ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.primaryButtonText}>
                                            Assign selected provider
                                        </Text>
                                    )}
                                </Pressable>
                            </>
                        )}
                    </View>
                )}

                {item.status === "PROVIDER_BEING_CONTACTED" &&
                    !hasAssignedProvider && (
                        <Text style={styles.warningText}>
                            No assigned provider is shown. Check the request before
                            recording acceptance.
                        </Text>
                    )}


                {!isTerminal(item.status) && (
                    <>
                        {item.status === "REQUEST_SUBMITTED" && (
                            <Pressable
                                disabled={busy}
                                onPress={() =>
                                    Alert.alert(
                                        "Start reviewing",
                                        "Start reviewing this medical request?",
                                        [
                                            { text: "Cancel", style: "cancel" },
                                            {
                                                text: "Continue",
                                                onPress: () =>
                                                    void updateRequest(
                                                        item,
                                                        "CONTROL_ROOM_REVIEWING"
                                                    ),
                                            },
                                        ]
                                    )
                                }
                                style={[
                                    styles.primaryButton,
                                    busy && styles.disabledButton,
                                ]}
                            >
                                {busy ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>
                                        Start reviewing
                                    </Text>
                                )}
                            </Pressable>
                        )}

                        {item.status === "PROVIDER_ACCEPTED" ? (
                            <Pressable
                                disabled={busy}
                                onPress={() => confirmDispatch(item)}
                                style={[
                                    styles.dispatchButton,
                                    busy && styles.disabledButton,
                                ]}
                            >
                                {busy ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>
                                        Confirm dispatch
                                    </Text>
                                )}
                            </Pressable>
                        ) : null}

                        {nextAction &&
                            item.status !== "REQUEST_SUBMITTED" &&
                            item.status !== "CONTROL_ROOM_REVIEWING" &&
                            item.status !== "PROVIDER_ACCEPTED" && (
                                <Pressable
                                    disabled={busy}
                                    onPress={() => handleNextAction(item)}
                                    style={[
                                        styles.primaryButton,
                                        busy && styles.disabledButton,
                                    ]}
                                >
                                    {busy ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.primaryButtonText}>
                                            {nextAction.label}
                                        </Text>
                                    )}
                                </Pressable>
                            )}


                    </>
                )}



                <View style={styles.cardFooter}>
                    <Ionicons name="time-outline" size={15} color={MUTED} />
                    <Text style={styles.dateText}>
                        Submitted {formatDate(item.createdAt)}
                    </Text>
                </View>
            </View>
        );
    };

    if (user?.role !== "CONTROL_ROOM") {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.centered}>
                    <Ionicons
                        name="lock-closed-outline"
                        size={42}
                        color={PURPLE}
                    />
                    <Text style={styles.emptyTitle}>Access restricted</Text>
                    <Text style={styles.emptyMessage}>
                        This dashboard is available to authorised control-room staff only.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.dashboardScroll}
                contentContainerStyle={styles.dashboardContent}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            void loadRequests(true);
                            void loadProviders();
                        }}
                        tintColor={PURPLE}
                    />
                }
            >
            <View style={styles.header}>
                <View style={styles.headerCopy}>
                    <Text style={styles.eyebrow}>SALEMA MEDICAL</Text>
                    <Text style={styles.title}>Control Room</Text>
                    <Text style={styles.subtitle}>
                        Medical requests and dispatch overview
                    </Text>
                </View>

                <Pressable
                    style={styles.refreshButton}
                    onPress={() => {
                        void loadRequests(true);
                        void loadProviders();
                    }}
                    accessibilityLabel="Refresh medical requests"
                >
                    <Ionicons name="refresh" size={22} color={PURPLE} />
                </Pressable>
            </View>

            <Pressable
                style={styles.providerApplicationsButton}
                onPress={() => navigation.navigate("ProviderApplications")}
                accessibilityRole="button"
                accessibilityLabel="Open provider applications for review"
            >
                <View style={styles.providerApplicationsIcon}>
                    <Ionicons name="people-outline" size={22} color={PURPLE} />
                </View>
                <View style={styles.providerApplicationsCopy}>
                    <Text style={styles.providerApplicationsTitle}>
                        Provider applications
                    </Text>
                    <Text style={styles.providerApplicationsSubtitle}>
                        Review and approve provider registrations
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={PURPLE} />
            </Pressable>

            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Active requests</Text>
                    <Text style={styles.statNumber}>{activeCount}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Active emergencies</Text>
                    <Text style={[styles.statNumber, styles.emergencyNumber]}>
                        {emergencyCount}
                    </Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Total loaded</Text>
                    <Text style={styles.statNumber}>{requests.length}</Text>
                </View>
            </View>

            <View style={styles.mapSection}>
                <View style={styles.mapHeader}>
                    <View style={styles.mapHeaderCopy}>
                        <Text style={styles.mapTitle}>Live dispatch map</Text>
                        <Text style={styles.mapSubtitle}>
                            Verified pickup points and provider GPS locations
                        </Text>
                    </View>
                    <Ionicons name="navigate-circle-outline" size={28} color={PURPLE} />
                </View>

                {requests.some(
                    (request) =>
                        hasValidCoordinates(request.pickupLocation) ||
                        (
                            Boolean(request.dispatchConfirmedAt) &&
                            hasValidCoordinates(request.providerLocation)
                        )
                ) ? (
                    <MapView
                        scrollEnabled={false}
                        style={styles.dispatchMap}
                        initialRegion={getMapRegion(requests)}
                        accessibilityLabel="Medical dispatch map"
                    >
                        {requests.map((request) => (
                            <React.Fragment key={`map-${request.requestId}`}>
                                {hasValidCoordinates(request.pickupLocation) ? (
                                    <Marker
                                        coordinate={{
                                            latitude: request.pickupLocation!.latitude,
                                            longitude: request.pickupLocation!.longitude,
                                        }}
                                        title={
                                            request.serviceType === "EMERGENCY_AMBULANCE"
                                                ? "Emergency pickup"
                                                : "Medical transport pickup"
                                        }
                                        description={`${request.requestId} · ${STATUS_LABELS[request.status] ?? request.status}`}
                                        pinColor={
                                            request.serviceType === "EMERGENCY_AMBULANCE"
                                                ? RED
                                                : PURPLE
                                        }
                                    />
                                ) : null}

                                {request.dispatchConfirmedAt &&
                                hasValidCoordinates(request.providerLocation) ? (
                                    <Marker
                                        coordinate={{
                                            latitude: request.providerLocation!.latitude,
                                            longitude: request.providerLocation!.longitude,
                                        }}
                                        title="Dispatched provider"
                                        description={`${request.requestId} · Provider GPS`}
                                        pinColor="#175CD3"
                                    />
                                ) : null}
                            </React.Fragment>
                        ))}
                    </MapView>
                ) : (
                    <View style={styles.mapEmpty}>
                        <Ionicons name="map-outline" size={30} color={MUTED} />
                        <Text style={styles.mapEmptyTitle}>
                            Waiting for location data
                        </Text>
                        <Text style={styles.mapEmptyText}>
                            Pickup pins appear when a request includes GPS coordinates.
                            Provider pins appear after dispatch is confirmed and GPS is received.
                        </Text>
                    </View>
                )}

                <View style={styles.mapLegend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: RED }]} />
                        <Text style={styles.legendText}>Emergency pickup</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: PURPLE }]} />
                        <Text style={styles.legendText}>Transport pickup</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: "#175CD3" }]} />
                        <Text style={styles.legendText}>Dispatched provider</Text>
                    </View>
                </View>
            </View>

            <View style={styles.listHeading}>
                <Text style={styles.sectionTitle}>Medical requests</Text>
                <Text style={styles.listCount}>Latest {requests.length}</Text>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={PURPLE} />
                    <Text style={styles.emptyMessage}>
                        Loading medical requests...
                    </Text>
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <Ionicons
                        name="cloud-offline-outline"
                        size={42}
                        color={RED}
                    />
                    <Text style={styles.emptyTitle}>Couldn't load requests</Text>
                    <Text style={styles.emptyMessage}>{error}</Text>
                    <Pressable
                        style={styles.primaryButton}
                        onPress={() => void loadRequests()}
                    >
                        <Text style={styles.primaryButtonText}>Try again</Text>
                    </Pressable>
                </View>
            ) : (
                <View style={styles.requestsList}>
                    {requests.length === 0 ? (
                        <View style={styles.centered}>
                            <Ionicons
                                name="clipboard-outline"
                                size={42}
                                color={MUTED}
                            />
                            <Text style={styles.emptyTitle}>
                                No medical requests
                            </Text>
                            <Text style={styles.emptyMessage}>
                                New requests will appear here when submitted.
                            </Text>
                        </View>
                    ) : (
                        requests.map((item) => (
                            <React.Fragment key={item.requestId}>
                                {renderRequest({ item })}
                            </React.Fragment>
                        ))
                    )}
                </View>
            )}

            <Pressable
                style={styles.signOutButton}
                onPress={() => void signOut()}
            >
                <Ionicons name="log-out-outline" size={18} color={PURPLE} />
                <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
            </ScrollView>

            <Modal
                transparent
                visible={Boolean(incomingCall)}
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => {
                    if (!respondingCall) {
                        void respondToIncomingCall("DECLINE");
                    }
                }}
            >
                <View style={styles.callModalOverlay}>
                    <View style={styles.callModalCard}>
                        <View style={styles.callModalIcon}>
                            <Ionicons
                                name={
                                    incomingCall?.callType === "AUDIO"
                                        ? "call"
                                        : "videocam"
                                }
                                size={28}
                                color={PURPLE}
                            />
                        </View>

                        <Text style={styles.callModalEyebrow}>
                            SALEMA MEDICAL · CONTROL ROOM
                        </Text>

                        <Text style={styles.callModalTitle}>
                            Incoming {incomingCall?.callType === "AUDIO"
                                ? "audio"
                                : "video"} call
                        </Text>

                        <Text style={styles.callModalCopy}>
                            A patient is requesting to speak with the Control
                            Room. Accept to claim this call and connect with
                            the patient.
                        </Text>

                        <Text style={styles.callModalHint}>
                            The first team member to accept will handle this call.
                        </Text>

                        <View style={styles.callModalActions}>
                            <Pressable
                                accessibilityRole="button"
                                disabled={respondingCall}
                                style={[
                                    styles.callModalButton,
                                    styles.callModalDecline,
                                    respondingCall && styles.callModalDisabled,
                                ]}
                                onPress={() =>
                                    void respondToIncomingCall("DECLINE")
                                }
                            >
                                <Text style={styles.callModalDeclineText}>
                                    Dismiss
                                </Text>
                            </Pressable>

                            <Pressable
                                accessibilityRole="button"
                                disabled={respondingCall}
                                style={[
                                    styles.callModalButton,
                                    styles.callModalAccept,
                                    respondingCall && styles.callModalDisabled,
                                ]}
                                onPress={() =>
                                    void respondToIncomingCall("ACCEPT")
                                }
                            >
                                {respondingCall ? (
                                    <ActivityIndicator
                                        color="#FFFFFF"
                                        size="small"
                                    />
                                ) : (
                                    <Text style={styles.callModalAcceptText}>
                                        Accept call
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    mapSection: {
        marginHorizontal: 14,
        marginBottom: 20,
        padding: 12,
        borderRadius: 18,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: BORDER,
    },
    mapHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    mapHeaderCopy: {
        flex: 1,
        paddingRight: 10,
    },
    mapTitle: {
        color: DARK,
        fontSize: 17,
        fontWeight: "800",
    },
    mapSubtitle: {
        color: MUTED,
        fontSize: 11,
        marginTop: 4,
        lineHeight: 16,
    },
    dispatchMap: {
        height: 260,
        borderRadius: 13,
    },
    mapEmpty: {
        minHeight: 150,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: "#F8F6FC",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    mapEmptyTitle: {
        color: DARK,
        fontSize: 14,
        fontWeight: "800",
        marginTop: 8,
    },
    mapEmptyText: {
        color: MUTED,
        fontSize: 12,
        lineHeight: 18,
        textAlign: "center",
        marginTop: 6,
    },
    mapLegend: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 12,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        color: MUTED,
        fontSize: 10,
    },
    safeArea: {
        flex: 1,
        backgroundColor: BACKGROUND,
    },
    dashboardScroll: {
        flex: 1,
    },
    dashboardContent: {
        flexGrow: 1,
        paddingBottom: 12,
    },
    requestsList: {
        flex: 1,
        minHeight: 0,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 18,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    headerCopy: {
        flex: 1,
        paddingRight: 12,
    },
    eyebrow: {
        color: PURPLE,
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 1.5,
    },
    title: {
        color: DARK,
        fontSize: 28,
        fontWeight: "800",
        marginTop: 5,
    },
    subtitle: {
        color: MUTED,
        fontSize: 13,
        marginTop: 5,
    },
    refreshButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: BORDER,
        alignItems: "center",
        justifyContent: "center",
    },
    providerApplicationsButton: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 18,
        marginTop: -4,
        marginBottom: 20,
        padding: 14,
        borderRadius: 17,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: BORDER,
        gap: 12,
    },
    providerApplicationsIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: "#F0E8F8",
        alignItems: "center",
        justifyContent: "center",
    },
    providerApplicationsCopy: {
        flex: 1,
    },
    providerApplicationsTitle: {
        color: DARK,
        fontSize: 14,
        fontWeight: "800",
    },
    providerApplicationsSubtitle: {
        color: MUTED,
        fontSize: 11,
        marginTop: 4,
    },
    statsRow: {
        flexDirection: "row",
        paddingHorizontal: 14,
        gap: 9,
        marginBottom: 22,
    },
    statCard: {
        flex: 1,
        minHeight: 86,
        padding: 12,
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: BORDER,
        justifyContent: "space-between",
    },
    statLabel: {
        color: MUTED,
        fontSize: 11,
        fontWeight: "600",
    },
    statNumber: {
        color: PURPLE,
        fontSize: 25,
        fontWeight: "800",
    },
    emergencyNumber: {
        color: RED,
    },
    listHeading: {
        paddingHorizontal: 20,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    sectionTitle: {
        color: DARK,
        fontSize: 18,
        fontWeight: "800",
    },
    listCount: {
        color: MUTED,
        fontSize: 12,
    },
    listContent: {
        paddingHorizontal: 14,
        paddingBottom: 16,
    },
    requestCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: BORDER,
    },
    cardTop: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
    },
    serviceIcon: {
        width: 42,
        height: 42,
        borderRadius: 13,
        backgroundColor: "#F0E9F8",
        alignItems: "center",
        justifyContent: "center",
    },
    cardHeading: {
        flex: 1,
        paddingTop: 2,
    },
    serviceTitle: {
        color: DARK,
        fontSize: 14,
        fontWeight: "800",
    },
    requestId: {
        color: MUTED,
        fontSize: 10,
        marginTop: 5,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 9,
        maxWidth: 125,
    },
    statusText: {
        fontSize: 10,
        fontWeight: "700",
    },
    emergencyBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        padding: 10,
        borderRadius: 10,
        backgroundColor: "#FFF0F1",
        marginTop: 12,
    },
    emergencyBannerText: {
        flex: 1,
        color: RED,
        fontSize: 12,
        fontWeight: "700",
    },
    divider: {
        height: 1,
        backgroundColor: "#F0EDF3",
        marginVertical: 14,
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 9,
        marginBottom: 12,
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        color: MUTED,
        fontSize: 11,
        marginBottom: 3,
    },
    detailValue: {
        color: "#30283B",
        fontSize: 13,
        lineHeight: 19,
    },
    descriptionBox: {
        backgroundColor: "#F8F6FA",
        padding: 11,
        borderRadius: 10,
        marginBottom: 12,
    },
    providerInfo: {
        backgroundColor: "#F6F1FB",
        padding: 11,
        borderRadius: 10,
        marginBottom: 12,
    },
    providerId: {
        color: DARK,
        fontSize: 12,
        marginTop: 3,
    },
    providerSection: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: "#FAF8FD",
        borderWidth: 1,
        borderColor: BORDER,
        marginBottom: 12,
    },
    providerInput: {
        minHeight: 46,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 10,
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 12,
        color: DARK,
        fontSize: 13,
        marginTop: 5,
    },
    helperText: {
        color: MUTED,
        fontSize: 11,
        lineHeight: 17,
        marginTop: 7,
        marginBottom: 9,
    },
    warningText: {
        color: RED,
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 12,
    },
    primaryButton: {
        minHeight: 46,
        backgroundColor: PURPLE,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
    },
    dispatchButton: {
        minHeight: 46,
        backgroundColor: RED,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
    },
    disabledButton: {
        opacity: 0.6,
    },
    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "800",
        textAlign: "center",
    },
    cardFooter: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderTopWidth: 1,
        borderTopColor: "#F0EDF3",
        paddingTop: 11,
        marginTop: 12,
    },
    dateText: {
        color: MUTED,
        fontSize: 11,
        flex: 1,
    },
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
    },
    emptyList: {
        flexGrow: 1,
        paddingHorizontal: 14,
    },
    emptyTitle: {
        color: DARK,
        fontSize: 18,
        fontWeight: "800",
        textAlign: "center",
        marginTop: 14,
    },
    emptyMessage: {
        color: MUTED,
        fontSize: 13,
        lineHeight: 20,
        textAlign: "center",
        marginTop: 8,
    },
    providerSectionTitle: {
        color: DARK,
        fontSize: 14,
        fontWeight: "800",
        marginBottom: 4,
    },
    providerLoading: {
        paddingVertical: 16,
        alignItems: "center",
        gap: 8,
    },
    providerOption: {
        flexDirection: "row",
        alignItems: "center",
        padding: 11,
        marginTop: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: "#FFFFFF",
        gap: 10,
    },
    providerOptionSelected: {
        borderColor: PURPLE,
        backgroundColor: "#F3ECFA",
    },
    providerOptionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#F0E9F8",
        alignItems: "center",
        justifyContent: "center",
    },
    providerOptionDetails: {
        flex: 1,
    },
    providerOptionName: {
        color: DARK,
        fontSize: 13,
        fontWeight: "800",
    },
    providerOptionContact: {
        color: MUTED,
        fontSize: 11,
        marginTop: 3,
    },
    noProvidersBox: {
        alignItems: "center",
        paddingVertical: 14,
    },
    noProvidersTitle: {
        color: DARK,
        fontSize: 13,
        fontWeight: "800",
        marginTop: 8,
        textAlign: "center",
    },
    secondaryButton: {
        minHeight: 40,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
    },
    secondaryButtonText: {
        color: PURPLE,
        fontSize: 12,
        fontWeight: "700",
    },
    callModalOverlay: {
        flex: 1,
        backgroundColor: "rgba(25, 16, 68, 0.60)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    callModalCard: {
        width: "100%",
        maxWidth: 420,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: "#E5DDF0",
    },
    callModalIcon: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: "#F3ECFA",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 18,
    },
    callModalEyebrow: {
        color: "#626782",
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1.2,
        marginBottom: 8,
    },
    callModalTitle: {
        color: "#191044",
        fontSize: 23,
        fontWeight: "800",
        marginBottom: 10,
    },
    callModalCopy: {
        color: "#626782",
        fontSize: 14,
        lineHeight: 21,
        marginBottom: 14,
    },
    callModalHint: {
        color: "#461477",
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 20,
    },
    callModalActions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 8,
    },
    callModalButton: {
        flex: 1,
        minHeight: 48,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
    },
    callModalDecline: {
        backgroundColor: "#F8F6FC",
        borderWidth: 1,
        borderColor: "#E5DDF0",
    },
    callModalDisabled: {
        opacity: 0.55,
    },
    callModalDeclineText: {
        color: "#461477",
        fontSize: 14,
        fontWeight: "700",
    },
    callModalAccept: {
        backgroundColor: "#461477",
    },
    callModalAcceptText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "700",
    },
    signOutButton: {
        alignSelf: "flex-end",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    signOutText: {
        color: PURPLE,
        fontSize: 12,
        fontWeight: "700",
    },
});
