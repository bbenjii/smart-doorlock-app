import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import styles from "./styles";
import { AppContext } from "../../context/app-context";

const webClick = (fn: () => void) => (Platform.OS === "web" ? ({ onClick: fn } as any) : {});

type EnrollmentStatus = "pending" | "enrolled" | "failed";
type SyncStatus = "pending" | "synced" | "failed";

type Fingerprint = {
    id: string;
    nickname: string;
    addedAt: string | null;
    enrollmentStatus?: EnrollmentStatus;
    syncStatus?: SyncStatus;
    sensorTemplateId?: string | null;
    lastError?: string | null;
};

const statusLabel = (fp: Fingerprint): string => {
    if (fp.syncStatus === "synced" || fp.enrollmentStatus === "enrolled") return "Synced to lock";
    if (fp.syncStatus === "failed" || fp.enrollmentStatus === "failed") return "Enrollment failed";
    return "Waiting for sensor scan";
};

export default function FingerprintsSettings() {
    const router = useRouter();
    const { authToken, apiBaseUrl, deviceId } = useContext(AppContext);
    const BASE_URL = apiBaseUrl || "https://smart-doorlock-server-851342133148.europe-west1.run.app/";

    const [fingerprints, setFingerprints] = useState<Fingerprint[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [nickname, setNickname] = useState("");
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const headers = useCallback(() => {
        const h: Record<string, string> = { "Content-Type": "application/json" };
        if (authToken) h.Authorization = `Bearer ${authToken}`;
        return h;
    }, [authToken]);

    const hasPending = useMemo(
        () =>
            fingerprints.some(
                (fp) => (fp.enrollmentStatus ?? "pending") === "pending" || (fp.syncStatus ?? "pending") === "pending",
            ),
        [fingerprints],
    );

    const fetchFingerprints = useCallback(
        async (showLoader: boolean = true) => {
            if (!authToken) {
                setLoading(false);
                return;
            }
            if (showLoader) setLoading(true);
            try {
                const res = await fetch(`${BASE_URL}credentials/me/fingerprints`, { headers: headers() });
                if (!res.ok) throw new Error("Failed to load");
                const data = await res.json();
                setFingerprints(data.fingerprints || []);
            } catch (e) {
                console.log("Fingerprints fetch error:", e);
            } finally {
                if (showLoader) setLoading(false);
            }
        },
        [authToken, BASE_URL, headers],
    );

    useEffect(() => {
        fetchFingerprints();
    }, [fetchFingerprints]);

    useEffect(() => {
        if (!hasPending) return;
        const timer = setInterval(() => fetchFingerprints(false), 3000);
        return () => clearInterval(timer);
    }, [hasPending, fetchFingerprints]);

    const addFingerprint = async () => {
        const trimmed = nickname.trim();
        if (!trimmed) return;
        if (!deviceId) {
            setAddError("No device selected. Pair a lock first.");
            return;
        }

        setAddError(null);
        setAdding(true);
        try {
            const res = await fetch(`${BASE_URL}credentials/me/fingerprints/start-enroll`, {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({ nickname: trimmed, deviceId }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.detail || "Failed to start fingerprint enrollment");
            }

            setNickname("");
            setShowAddForm(false);
            await fetchFingerprints(false);
        } catch (e) {
            console.log("Start fingerprint enroll error:", e);
            setAddError(e instanceof Error ? e.message : "Failed to start fingerprint enrollment");
        } finally {
            setAdding(false);
        }
    };

    const deleteFingerprint = async (id: string) => {
        setDeleteError(null);
        setDeletingId(id);
        try {
            const res = await fetch(`${BASE_URL}credentials/me/fingerprints/${id}`, {
                method: "DELETE",
                headers: headers(),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.detail || "Failed to delete");
            }
            setFingerprints((prev) => prev.filter((fp) => fp.id !== id));
            setConfirmDeleteId(null);
        } catch (e) {
            console.log("Delete fingerprint error:", e);
            setDeleteError(e instanceof Error ? e.message : "Failed to delete fingerprint");
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (iso: string | null) => {
        if (!iso) return "";
        try {
            return new Date(iso).toLocaleDateString();
        } catch {
            return "";
        }
    };

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Fingerprints</Text>
                <Text style={styles.subtitle}>Enroll on the lock scanner, then track sync status here.</Text>
            </View>

            <View style={styles.card}>
                <TouchableOpacity
                    onPress={() => router.replace("/settings/manage-users")}
                    {...webClick(() => router.replace("/settings/manage-users"))}
                    activeOpacity={0.7}
                    style={{ alignSelf: "flex-start" }}
                >
                    <Text style={localStyles.backText}>‹ Back</Text>
                </TouchableOpacity>

                {loading ? (
                    <View style={localStyles.centered}>
                        <ActivityIndicator size="small" color="#8b5cf6" />
                        <Text style={[styles.rowSubtitle, { marginTop: 8 }]}>Loading fingerprints...</Text>
                    </View>
                ) : (
                    <>
                        {fingerprints.length === 0 && !showAddForm && (
                            <View style={localStyles.centered}>
                                <Text style={[styles.rowSubtitle, { textAlign: "center" }]}>
                                    No fingerprints registered yet.{"\n"}Start enrollment below.
                                </Text>
                            </View>
                        )}

                        {fingerprints.map((fp) => (
                            <View key={fp.id} style={localStyles.fingerprintRow}>
                                <View style={[styles.circleIcon, { backgroundColor: "#f3e8ff" }]}>
                                    <Text style={[styles.circleIconText, { color: "#8b5cf6" }]}>P</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.rowTitle}>{fp.nickname}</Text>
                                    <Text style={styles.rowSubtitle}>{statusLabel(fp)}</Text>
                                    {fp.addedAt ? <Text style={styles.rowSubtitle}>Added {formatDate(fp.addedAt)}</Text> : null}
                                    {fp.lastError ? <Text style={localStyles.errorText}>{fp.lastError}</Text> : null}
                                </View>
                                {deletingId === fp.id ? (
                                    <ActivityIndicator size="small" color="#ef4444" />
                                ) : confirmDeleteId === fp.id ? (
                                    <View style={localStyles.confirmRow}>
                                        <TouchableOpacity
                                            onPress={() => deleteFingerprint(fp.id)}
                                            {...webClick(() => deleteFingerprint(fp.id))}
                                            activeOpacity={0.7}
                                            style={localStyles.confirmButton}
                                        >
                                            <Text style={localStyles.confirmText}>Confirm</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setConfirmDeleteId(null)}
                                            {...webClick(() => setConfirmDeleteId(null))}
                                            activeOpacity={0.7}
                                            style={localStyles.cancelButton}
                                        >
                                            <Text style={localStyles.cancelText}>Cancel</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        onPress={() => setConfirmDeleteId(fp.id)}
                                        {...webClick(() => setConfirmDeleteId(fp.id))}
                                        activeOpacity={0.7}
                                        style={localStyles.deleteButton}
                                    >
                                        <Text style={localStyles.deleteText}>Delete</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}

                        {deleteError ? <Text style={localStyles.errorText}>{deleteError}</Text> : null}

                        {showAddForm ? (
                            <View style={{ gap: 8 }}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Nickname</Text>
                                    <TextInput
                                        value={nickname}
                                        onChangeText={setNickname}
                                        placeholder="e.g. Right thumb"
                                        maxLength={50}
                                        style={styles.input}
                                        autoFocus
                                    />
                                </View>
                                <Text style={styles.rowSubtitle}>
                                    After starting enrollment, place your finger on the lock scanner.
                                </Text>
                                {addError ? <Text style={localStyles.errorText}>{addError}</Text> : null}
                                <TouchableOpacity
                                    style={[styles.button, styles.buttonPrimary, (!nickname.trim() || adding) && { opacity: 0.75 }]}
                                    onPress={addFingerprint}
                                    {...webClick(addFingerprint)}
                                    disabled={!nickname.trim() || adding}
                                    activeOpacity={0.75}
                                >
                                    {adding ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={[styles.buttonPrimaryText, styles.buttonText]}>Start Enrollment</Text>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button, styles.buttonGhost]}
                                    onPress={() => {
                                        setShowAddForm(false);
                                        setNickname("");
                                        setAddError(null);
                                    }}
                                    {...webClick(() => {
                                        setShowAddForm(false);
                                        setNickname("");
                                        setAddError(null);
                                    })}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[styles.buttonText, { color: "#374151", fontWeight: "700" }]}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[styles.button, styles.buttonOutline]}
                                onPress={() => setShowAddForm(true)}
                                {...webClick(() => setShowAddForm(true))}
                                activeOpacity={0.75}
                            >
                                <Text style={[styles.buttonText, styles.buttonOutlineText]}>+ Add Fingerprint</Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </View>
        </ScrollView>
    );
}

const localStyles = {
    backText: {
        color: "#2563eb",
        fontWeight: "700" as const,
        fontSize: 14,
    },
    centered: {
        alignItems: "center" as const,
        paddingVertical: 12,
    },
    fingerprintRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 12,
        paddingVertical: 4,
    },
    deleteButton: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#fca5a5",
        backgroundColor: "#fef2f2",
    },
    deleteText: {
        fontSize: 12,
        fontWeight: "600" as const,
        color: "#ef4444",
    },
    confirmRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 6,
    },
    confirmButton: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#86efac",
        backgroundColor: "#f0fdf4",
    },
    confirmText: {
        fontSize: 12,
        fontWeight: "700" as const,
        color: "#15803d",
    },
    cancelButton: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        backgroundColor: "#f9fafb",
    },
    cancelText: {
        fontSize: 12,
        fontWeight: "600" as const,
        color: "#374151",
    },
    errorText: {
        color: "#b91c1c",
        fontSize: 13,
        fontWeight: "600" as const,
    },
};
