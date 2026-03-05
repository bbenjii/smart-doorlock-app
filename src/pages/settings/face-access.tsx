import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import styles from "./styles";
import { AppContext } from "../../context/app-context";

const webClick = (fn: () => void) => (Platform.OS === "web" ? ({ onClick: fn } as any) : {});

type FaceUser = {
    userId: string;
    isActive: boolean;
    enabled: boolean;
    enrolledAt?: string | null;
    lastUsedAt?: string | null;
    revokedAt?: string | null;
};

export default function FaceAccessSettings() {
    const router = useRouter();
    const { authToken, apiBaseUrl, deviceId, user, lastWsEvent } = useContext(AppContext);
    const BASE_URL = apiBaseUrl || "https://smart-doorlock-server-851342133148.europe-west1.run.app/";

    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [finishing, setFinishing] = useState(false);
    const [revoking, setRevoking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [progressAccepted, setProgressAccepted] = useState(0);
    const [progressRequired, setProgressRequired] = useState(5);
    const [users, setUsers] = useState<FaceUser[]>([]);

    const currentUserId = useMemo(() => {
        const u: any = user || {};
        return u.user_id || u.userId || u.id || null;
    }, [user]);

    const headers = useCallback(() => {
        const h: Record<string, string> = { "Content-Type": "application/json" };
        if (authToken) h.Authorization = `Bearer ${authToken}`;
        return h;
    }, [authToken]);

    const refresh = useCallback(async () => {
        if (!authToken || !deviceId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${BASE_URL}credentials/face/${deviceId}/enrolled`, { headers: headers() });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.detail || "Failed to load face users");
            }
            const body = await res.json();
            setUsers(body.users || []);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load face users");
        } finally {
            setLoading(false);
        }
    }, [authToken, deviceId, BASE_URL, headers]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        if (!lastWsEvent || lastWsEvent.type !== "face_enroll_progress") return;
        if (lastWsEvent.deviceId !== deviceId) return;

        setProgressAccepted(lastWsEvent.framesAccepted ?? 0);
        setProgressRequired(lastWsEvent.minRequired ?? 5);

        if (lastWsEvent.sessionId && !sessionId) {
            setSessionId(lastWsEvent.sessionId);
        }
    }, [lastWsEvent, deviceId, sessionId]);

    const myFace = useMemo(() => users.find((u) => u.userId === currentUserId), [users, currentUserId]);

    const startEnrollment = async () => {
        if (!currentUserId || !deviceId) {
            setError("Missing user or device context");
            return;
        }

        setError(null);
        setStarting(true);
        try {
            const res = await fetch(`${BASE_URL}credentials/face/enroll/start`, {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({ userId: currentUserId, deviceId }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.detail || "Failed to start face enrollment");
            }
            const body = await res.json();
            setSessionId(body.sessionId || null);
            setProgressAccepted(0);
            setProgressRequired(5);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to start face enrollment");
        } finally {
            setStarting(false);
        }
    };

    const finishEnrollment = async () => {
        if (!sessionId) {
            setError("No active enrollment session");
            return;
        }

        setError(null);
        setFinishing(true);
        try {
            const res = await fetch(`${BASE_URL}credentials/face/enroll/finish`, {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({ sessionId }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.detail || "Failed to finish face enrollment");
            }

            setSessionId(null);
            setProgressAccepted(0);
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to finish face enrollment");
        } finally {
            setFinishing(false);
        }
    };

    const revokeMyFace = async () => {
        if (!currentUserId || !deviceId) {
            setError("Missing user or device context");
            return;
        }

        setError(null);
        setRevoking(true);
        try {
            const url = `${BASE_URL}credentials/face/${encodeURIComponent(currentUserId)}?device_id=${encodeURIComponent(deviceId)}`;
            const res = await fetch(url, {
                method: "DELETE",
                headers: headers(),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.detail || "Failed to revoke face access");
            }

            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to revoke face access");
        } finally {
            setRevoking(false);
        }
    };

    const formatDate = (iso?: string | null) => {
        if (!iso) return "-";
        try {
            return new Date(iso).toLocaleString();
        } catch {
            return "-";
        }
    };

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Face Access</Text>
                <Text style={styles.subtitle}>Camera-based unlock enrollment and access control.</Text>
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
                        <ActivityIndicator size="small" color="#f97316" />
                        <Text style={[styles.rowSubtitle, { marginTop: 8 }]}>Loading face access...</Text>
                    </View>
                ) : (
                    <>
                        <View style={localStyles.row}>
                            <Text style={styles.rowTitle}>Device</Text>
                            <Text style={styles.rowSubtitle}>{deviceId || "-"}</Text>
                        </View>

                        <View style={localStyles.row}>
                            <Text style={styles.rowTitle}>My Face Status</Text>
                            <Text style={styles.rowSubtitle}>{myFace?.isActive ? "Enabled" : "Not enrolled"}</Text>
                        </View>

                        <View style={localStyles.row}>
                            <Text style={styles.rowTitle}>Enrolled At</Text>
                            <Text style={styles.rowSubtitle}>{formatDate(myFace?.enrolledAt)}</Text>
                        </View>

                        {sessionId ? (
                            <View style={localStyles.progressCard}>
                                <Text style={styles.rowTitle}>Enrollment in progress</Text>
                                <Text style={styles.rowSubtitle}>
                                    Accepted frames: {progressAccepted}/{progressRequired}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.button, styles.buttonPrimary, finishing && { opacity: 0.75 }]}
                                    onPress={finishEnrollment}
                                    {...webClick(finishEnrollment)}
                                    disabled={finishing || progressAccepted < progressRequired}
                                    activeOpacity={0.75}
                                >
                                    {finishing ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={[styles.buttonPrimaryText, styles.buttonText]}>Finish Enrollment</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[styles.button, styles.buttonOutline, starting && { opacity: 0.75 }]}
                                onPress={startEnrollment}
                                {...webClick(startEnrollment)}
                                disabled={starting}
                                activeOpacity={0.75}
                            >
                                {starting ? (
                                    <ActivityIndicator size="small" color="#f97316" />
                                ) : (
                                    <Text style={[styles.buttonText, styles.buttonOutlineText]}>Start Face Enrollment</Text>
                                )}
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.button, styles.buttonGhost, revoking && { opacity: 0.75 }]}
                            onPress={revokeMyFace}
                            {...webClick(revokeMyFace)}
                            disabled={revoking}
                            activeOpacity={0.75}
                        >
                            {revoking ? (
                                <ActivityIndicator size="small" color="#ef4444" />
                            ) : (
                                <Text style={[styles.buttonText, { color: "#ef4444", fontWeight: "700" }]}>Revoke My Face Access</Text>
                            )}
                        </TouchableOpacity>

                        {error ? <Text style={localStyles.errorText}>{error}</Text> : null}
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
    row: {
        paddingVertical: 6,
    },
    progressCard: {
        marginTop: 12,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#fed7aa",
        backgroundColor: "#fff7ed",
        gap: 8,
    },
    errorText: {
        color: "#b91c1c",
        fontSize: 13,
        fontWeight: "600" as const,
        marginTop: 8,
    },
};
