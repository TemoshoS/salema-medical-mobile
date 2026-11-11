import { Alert } from "../../utils/salemaAlert";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import type { RootStackParamList } from "../../navigation/AppNavigator";

type ApplicationStatus =
  | "PENDING_REVIEW"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";

type ProviderType =
  | "AMBULANCE_COMPANY"
  | "MEDICAL_TRANSPORT_COMPANY"
  | "INDIVIDUAL_DRIVER";

type ProviderAccount = {
  _id?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  emailVerified?: boolean;
  accountStatus?: string;
  createdAt?: string;
};

type ProviderApplication = {
  _id: string;
  userId: ProviderAccount | string;
  providerType: ProviderType;
  organisationName?: string;
  businessRegistrationNumber?: string;
  vehicleType?: string;
  vehicleRegistrationNumber?: string;
  operatingLicenceNumber?: string;
  qualificationsSummary?: string;
  serviceArea: string;
  additionalNotes?: string;
  status: ApplicationStatus;
  rejectionReason?: string;
  reviewedAt?: string;
  createdAt: string;
};

type ApplicationsResponse = {
  success: boolean;
  message?: string;
  applications?: ProviderApplication[];
};

type Queue = "PENDING_REVIEW" | "UNDER_REVIEW";

const PURPLE = "#461477";
const DARK = "#191044";
const BACKGROUND = "#F8F6FC";
const MUTED = "#626782";
const BORDER = "#E5DDF0";
const RED = "#A30E35";

function accountOf(application: ProviderApplication): ProviderAccount {
  return typeof application.userId === "object"
    ? application.userId
    : {};
}

function providerTypeLabel(type: ProviderType) {
  switch (type) {
    case "AMBULANCE_COMPANY":
      return "Ambulance company";
    case "MEDICAL_TRANSPORT_COMPANY":
      return "Medical transport company";
    case "INDIVIDUAL_DRIVER":
      return "Individual driver";
  }
}

function dateLabel(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleString();
}

export default function ProviderApplicationsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { token, user } = useAuth();

  const [queue, setQueue] = useState<Queue>("PENDING_REVIEW");
  const [applications, setApplications] = useState<ProviderApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [rejecting, setRejecting] = useState<ProviderApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadApplications = useCallback(
    async (refresh = false) => {
      if (!token) {
        setError("Please sign in again to review provider applications.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (refresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/providers/applications?status=${queue}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        const data = (await response.json()) as ApplicationsResponse;

        if (!response.ok || data.success === false) {
          throw new Error(
            data.message || "Unable to load provider applications."
          );
        }

        setApplications(data.applications ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load provider applications."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, queue]
  );

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const performAction = async (
    application: ProviderApplication,
    action: "review" | "approve" | "reject",
    reason?: string
  ) => {
    if (!token || busyId) return;

    const account = accountOf(application);

    if (action === "approve" && account.emailVerified !== true) {
      Alert.alert(
        "Email verification required",
        "This provider must verify their email before approval."
      );
      return;
    }

    if (action === "reject" && !reason?.trim()) {
      Alert.alert(
        "Reason required",
        "Enter a reason before rejecting this application."
      );
      return;
    }

    const labels = {
      review: "mark this application under review",
      approve: "approve this provider",
      reject: "reject this application",
    };

    Alert.alert(
      action === "review"
        ? "Start review?"
        : action === "approve"
          ? "Approve provider?"
          : "Reject application?",
      `Are you sure you want to ${labels[action]}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text:
            action === "review"
              ? "Start review"
              : action === "approve"
                ? "Approve"
                : "Reject",
          style: action === "reject" ? "destructive" : "default",
          onPress: () => {
            void submitAction(application, action, reason);
          },
        },
      ]
    );
  };

  const submitAction = async (
    application: ProviderApplication,
    action: "review" | "approve" | "reject",
    reason?: string
  ) => {
    if (!token || busyId) return;

    setBusyId(application._id);

    try {
      const suffix =
        action === "review"
          ? "review"
          : action === "approve"
            ? "approve"
            : "reject";

      const response = await fetch(
        `${API_BASE_URL}/providers/applications/${encodeURIComponent(
          application._id
        )}/${suffix}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          ...(action === "reject"
            ? { body: JSON.stringify({ reason: reason?.trim() }) }
            : {}),
        }
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "The review action failed.");
      }

      setRejecting(null);
      setRejectionReason("");

      Alert.alert(
        "Application updated",
        data.message || "The application status has been updated."
      );

      await loadApplications(true);
    } catch (err) {
      Alert.alert(
        "Unable to update application",
        err instanceof Error ? err.message : "Please try again."
      );
    } finally {
      setBusyId("");
    }
  };

  const startRejection = (application: ProviderApplication) => {
    setRejectionReason("");
    setRejecting(application);
  };

  if (user?.role !== "CONTROL_ROOM") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={32} color={RED} />
          <Text style={styles.emptyTitle}>Access restricted</Text>
          <Text style={styles.muted}>
            Only authorised Control Room staff can review provider applications.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Back to Control Room"
        >
          <Ionicons name="arrow-back" size={22} color={DARK} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>SALEMA MEDICAL</Text>
          <Text style={styles.title}>Provider applications</Text>
          <Text style={styles.subtitle}>
            Review credentials before granting access.
          </Text>
        </View>
        <Pressable
          onPress={() => void loadApplications(true)}
          style={styles.refreshButton}
          accessibilityLabel="Refresh applications"
        >
          <Ionicons name="refresh-outline" size={21} color={PURPLE} />
        </Pressable>
      </View>

      <View style={styles.queueRow}>
        <Pressable
          onPress={() => setQueue("PENDING_REVIEW")}
          style={[
            styles.queueButton,
            queue === "PENDING_REVIEW" && styles.queueButtonActive,
          ]}
        >
          <Text
            style={[
              styles.queueText,
              queue === "PENDING_REVIEW" && styles.queueTextActive,
            ]}
          >
            Pending review
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setQueue("UNDER_REVIEW")}
          style={[
            styles.queueButton,
            queue === "UNDER_REVIEW" && styles.queueButtonActive,
          ]}
        >
          <Text
            style={[
              styles.queueText,
              queue === "UNDER_REVIEW" && styles.queueTextActive,
            ]}
          >
            Under review
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PURPLE} />
          <Text style={styles.muted}>Loading applications…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons
            name="alert-circle-outline"
            size={34}
            color={RED}
          />
          <Text style={styles.emptyTitle}>Could not load applications</Text>
          <Text style={styles.muted}>{error}</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => void loadApplications()}
          >
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadApplications(true)}
              tintColor={PURPLE}
            />
          }
        >
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>
              {queue === "PENDING_REVIEW"
                ? "Awaiting initial review"
                : "Reviews in progress"}
            </Text>
            <Text style={styles.summaryCount}>
              {applications.length}
            </Text>
          </View>

          {applications.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="documents-outline"
                size={36}
                color={MUTED}
              />
              <Text style={styles.emptyTitle}>No applications here</Text>
              <Text style={styles.muted}>
                Applications in this queue will appear here.
              </Text>
            </View>
          ) : (
            applications.map((application) => {
              const account = accountOf(application);
              const busy = busyId === application._id;

              return (
                <View key={application._id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.avatar}>
                      <Ionicons
                        name={
                          application.providerType === "INDIVIDUAL_DRIVER"
                            ? "car-outline"
                            : "business-outline"
                        }
                        size={23}
                        color={PURPLE}
                      />
                    </View>
                    <View style={styles.providerHeading}>
                      <Text style={styles.providerName}>
                        {account.fullName || application.organisationName || "Provider"}
                      </Text>
                      <Text style={styles.providerType}>
                        {providerTypeLabel(application.providerType)}
                      </Text>
                    </View>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusText}>
                        {application.status === "UNDER_REVIEW"
                          ? "In review"
                          : "Pending"}
                      </Text>
                    </View>
                  </View>

                  {application.organisationName ? (
                    <InfoRow
                      label="Organisation"
                      value={application.organisationName}
                    />
                  ) : null}
                  <InfoRow label="Email" value={account.email || "Not provided"} />
                  <InfoRow
                    label="Phone"
                    value={account.phoneNumber || "Not provided"}
                  />
                  <InfoRow label="Service area" value={application.serviceArea} />
                  <InfoRow
                    label="Vehicle"
                    value={application.vehicleType || "Not provided"}
                  />
                  <InfoRow
                    label="Vehicle registration"
                    value={application.vehicleRegistrationNumber || "Not provided"}
                  />
                  {application.businessRegistrationNumber ? (
                    <InfoRow
                      label="Business registration"
                      value={application.businessRegistrationNumber}
                    />
                  ) : null}
                  {application.operatingLicenceNumber ? (
                    <InfoRow
                      label="Operating licence"
                      value={application.operatingLicenceNumber}
                    />
                  ) : null}
                  {application.qualificationsSummary ? (
                    <InfoRow
                      label="Qualifications"
                      value={application.qualificationsSummary}
                    />
                  ) : null}
                  <InfoRow
                    label="Email verified"
                    value={account.emailVerified ? "Yes" : "No"}
                  />
                  <InfoRow
                    label="Application received"
                    value={dateLabel(application.createdAt)}
                  />

                  {application.additionalNotes ? (
                    <View style={styles.notes}>
                      <Text style={styles.notesLabel}>Applicant notes</Text>
                      <Text style={styles.notesText}>
                        {application.additionalNotes}
                      </Text>
                    </View>
                  ) : null}

                  {queue === "PENDING_REVIEW" ? (
                    <Pressable
                      disabled={busy}
                      style={[
                        styles.primaryButton,
                        busy && styles.disabledButton,
                      ]}
                      onPress={() =>
                        void performAction(application, "review")
                      }
                    >
                      {busy ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.primaryButtonText}>
                          Start review
                        </Text>
                      )}
                    </Pressable>
                  ) : (
                    <View style={styles.actionRow}>
                      <Pressable
                        disabled={busy}
                        style={[
                          styles.approveButton,
                          busy && styles.disabledButton,
                        ]}
                        onPress={() =>
                          void performAction(application, "approve")
                        }
                      >
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={18}
                          color="#FFFFFF"
                        />
                        <Text style={styles.primaryButtonText}>Approve</Text>
                      </Pressable>
                      <Pressable
                        disabled={busy}
                        style={[
                          styles.rejectButton,
                          busy && styles.disabledButton,
                        ]}
                        onPress={() => startRejection(application)}
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={18}
                          color={RED}
                        />
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </Pressable>
                    </View>
                  )}

                  {busy ? (
                    <Text style={styles.processing}>Updating application…</Text>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal
        visible={rejecting !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRejecting(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject application</Text>
            <Text style={styles.modalDescription}>
              Explain why this application is being rejected. The reason will
              be recorded for the review.
            </Text>
            <TextInput
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Enter the rejection reason"
              placeholderTextColor="#89869B"
              multiline
              maxLength={2000}
              textAlignVertical="top"
              style={styles.reasonInput}
            />
            <Text style={styles.characterCount}>
              {rejectionReason.length}/2000
            </Text>
            <View style={styles.actionRow}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setRejecting(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={!rejectionReason.trim() || Boolean(busyId)}
                style={[
                  styles.rejectButton,
                  (!rejectionReason.trim() || Boolean(busyId)) &&
                    styles.disabledButton,
                ]}
                onPress={() => {
                  if (rejecting) {
                    void performAction(
                      rejecting,
                      "reject",
                      rejectionReason
                    );
                  }
                }}
              >
                <Text style={styles.rejectButtonText}>Continue</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: "800",
    color: PURPLE,
    marginBottom: 4,
  },
  title: {
    color: DARK,
    fontSize: 21,
    fontWeight: "800",
  },
  subtitle: {
    color: MUTED,
    fontSize: 12,
    marginTop: 4,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  queueRow: {
    flexDirection: "row",
    marginHorizontal: 18,
    marginBottom: 12,
    padding: 4,
    backgroundColor: "#EEE8F6",
    borderRadius: 15,
    gap: 4,
  },
  queueButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 8,
    borderRadius: 11,
  },
  queueButtonActive: {
    backgroundColor: "#FFFFFF",
    elevation: 1,
  },
  queueText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
  },
  queueTextActive: {
    color: PURPLE,
  },
  list: {
    paddingHorizontal: 18,
    paddingBottom: 36,
    gap: 14,
  },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  summaryTitle: {
    color: DARK,
    fontSize: 14,
    fontWeight: "800",
  },
  summaryCount: {
    color: PURPLE,
    fontSize: 15,
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    padding: 16,
    gap: 13,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 3,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#F1EAF8",
    alignItems: "center",
    justifyContent: "center",
  },
  providerHeading: {
    flex: 1,
  },
  providerName: {
    color: DARK,
    fontSize: 16,
    fontWeight: "800",
  },
  providerType: {
    color: MUTED,
    fontSize: 11,
    marginTop: 4,
  },
  statusPill: {
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: "#F1EAF8",
  },
  statusText: {
    color: PURPLE,
    fontSize: 10,
    fontWeight: "800",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  infoLabel: {
    width: 126,
    color: MUTED,
    fontSize: 11,
  },
  infoValue: {
    flex: 1,
    color: DARK,
    fontSize: 12,
    fontWeight: "600",
  },
  notes: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: BACKGROUND,
    gap: 5,
  },
  notesLabel: {
    color: PURPLE,
    fontSize: 11,
    fontWeight: "800",
  },
  notesText: {
    color: DARK,
    fontSize: 12,
    lineHeight: 18,
  },
  primaryButton: {
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  approveButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 12,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  rejectButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8B8C4",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  rejectButtonText: {
    color: RED,
    fontSize: 13,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.55,
  },
  processing: {
    textAlign: "center",
    color: MUTED,
    fontSize: 11,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 12,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: {
    color: DARK,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  muted: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(25,16,68,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    color: DARK,
    fontSize: 19,
    fontWeight: "800",
  },
  modalDescription: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
  },
  reasonInput: {
    minHeight: 120,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    color: DARK,
    fontSize: 14,
  },
  characterCount: {
    textAlign: "right",
    color: MUTED,
    fontSize: 11,
  },
  cancelButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: DARK,
    fontSize: 13,
    fontWeight: "700",
  },
});
