import React, { useCallback, useContext, useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import styles from "./styles";
import { AppContext } from "../../context/app-context";
import { useRouter } from "expo-router";

type EventItem = {
    id: string;
    state: "LOCKED" | "UNLOCKED";
    title: string;
    timestamp: string;
    rawTimestamp: string;
    icon: any;
    tint: string;
};

const FETCH_TIMEOUT = 8000;
const REALTIME_REFRESH_MS = 5000;
const MAX_VISIBLE_LOGS = 8;

function buildApiUrl(baseUrl: string, path: string): string {
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    return `${normalizedBase}${normalizedPath}`;
}

function formatTimestamp(ts: string): string {
    try {
        const date = new Date(ts);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return "Just now";
        if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
        if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
        if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
        return date.toLocaleDateString();
    } catch {
        return ts;
    }
}

function mapAuditLog(raw: any): EventItem | null {
    const action = raw.action || "AUDIT";
    const command = raw.details?.command;
    if (action !== "COMMAND_ISSUED") return null;
    if (command !== "LOCK" && command !== "UNLOCK") return null;

    const state = command === "LOCK" ? "LOCKED" : "UNLOCKED";

    return {
        id: raw.logId || String(Math.random()),
        state,
        title: state === "LOCKED" ? "Door Locked" : "Door Unlocked",
        timestamp: raw.timestamp ? formatTimestamp(raw.timestamp) : "—",
        rawTimestamp: raw.timestamp ? String(raw.timestamp) : "",
        icon: state === "LOCKED" ? require("../../assets/images/lock.png") : require("../../assets/images/lock-open.png"),
        tint: state === "LOCKED" ? "#dc2626" : "#16a34a",
    };
}

async function fetchWithTimeout(url: string, opts: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const mergedOpts = { ...opts, signal: controller.signal };
    try {
        return await fetch(url, mergedOpts);
    } finally {
        clearTimeout(timer);
    }
}

export default function Events() {
    const { user, authToken, deviceId, apiBaseUrl } = useContext(AppContext);
    const router = useRouter();

    const [events, setEvents] = useState<EventItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const mergeAndSortEvents = useCallback((existing: EventItem[], incoming: EventItem[]) => {
        const byId = new Map<string, EventItem>();
        for (const item of existing) byId.set(item.id, item);
        for (const item of incoming) byId.set(item.id, item);

        const sorted = Array.from(byId.values()).sort((a, b) => {
            const at = Date.parse(a.rawTimestamp);
            const bt = Date.parse(b.rawTimestamp);
            if (Number.isNaN(at) && Number.isNaN(bt)) return 0;
            if (Number.isNaN(at)) return 1;
            if (Number.isNaN(bt)) return -1;
            return bt - at;
        });

        const deduped: EventItem[] = [];
        for (const item of sorted) {
            const prev = deduped[deduped.length - 1];
            if (prev && prev.state === item.state) continue;
            deduped.push(item);
        }

        return deduped.slice(0, MAX_VISIBLE_LOGS);
    }, []);

    const headers = useCallback(() => {
        const h: Record<string, string> = { "Content-Type": "application/json" };
        if (authToken) h["Authorization"] = `Bearer ${authToken}`;
        return h;
    }, [authToken]);

    const fetchEvents = useCallback(async (background = false) => {
        if (!deviceId || !authToken || !apiBaseUrl) {
            setLoading(false);
            return;
        }

        if (!background) setLoading(true);
        setError(null);

        try {
            const url = buildApiUrl(apiBaseUrl, `devices/${deviceId}/logs?limit=100`);
            const response = await fetchWithTimeout(url, { headers: headers() }, FETCH_TIMEOUT);

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body?.detail || "Failed to load events");
            }

            const data = await response.json();
            const mapped = (data.items || []).map(mapAuditLog).filter(Boolean) as EventItem[];
            if (background) {
                setEvents((prev) => mergeAndSortEvents(prev, mapped));
            } else {
                setEvents(mergeAndSortEvents([], mapped));
            }
        } catch (e: any) {
            if (e.name === "AbortError") {
                setError("Server unreachable");
            } else {
                setError(e.message || "Failed to load events");
            }
        } finally {
            setLoading(false);
        }
    }, [deviceId, authToken, apiBaseUrl, headers, mergeAndSortEvents]);

    useEffect(() => {
        setEvents([]);
        fetchEvents(false);
    }, [fetchEvents]);

    useEffect(() => {
        if (!deviceId || !authToken || !apiBaseUrl) return;
        const timer = setInterval(() => {
            fetchEvents(true);
        }, REALTIME_REFRESH_MS);

        return () => clearInterval(timer);
    }, [deviceId, authToken, apiBaseUrl, fetchEvents]);

    if (!user) {
        return (
            <View style={[styles.screen, authStyles.container]}>
                <Text style={authStyles.title}>You are not logged in</Text>
                <Text style={authStyles.subtitle}>Log in from Settings to use the app.</Text>
                <TouchableOpacity onPress={() => router.push("/settings")} style={authStyles.button}>
                    <Text style={authStyles.buttonText}>Go to Settings</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <View style={styles.stickyHeader}>
                <View style={styles.header}>
                <Text style={styles.title}>Activity Log</Text>
                <Text style={styles.subtitle}>Track all security events</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} style={{ flex: 1 }}>
                {loading && (
                    <View style={localStyles.centerCard}>
                        <ActivityIndicator size="small" color="#2563eb" />
                        <Text style={localStyles.centerText}>Loading logs...</Text>
                    </View>
                )}

                {!loading && error && (
                    <View style={localStyles.errorBanner}>
                        <Text style={localStyles.errorText}>{error}</Text>
                        <TouchableOpacity onPress={() => fetchEvents(false)}>
                            <Text style={localStyles.retryText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {!loading && (
                    <View style={styles.list}>
                        {events.map((event) => (
                            <View key={event.id} style={styles.card}>
                                <View style={styles.cardIconWrapper}>
                                    <View style={[styles.iconBadge, { backgroundColor: `${event.tint}1a` }]}>
                                        <Image source={event.icon} style={[styles.cardIcon, { tintColor: event.tint }]} />
                                    </View>
                                </View>
                                <View style={styles.cardContent}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.cardTitle}>{event.title}</Text>
                                    </View>
                                    <Text style={styles.cardTimestamp}>{event.timestamp}</Text>
                                </View>
                            </View>
                        ))}

                        {!events.length && !error && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyTitle}>No logs yet</Text>
                                <Text style={styles.emptySubtitle}>Logs will appear here when actions are recorded.</Text>
                            </View>
                        )}

                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const authStyles = StyleSheet.create({
    container: {
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        rowGap: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111827",
    },
    subtitle: {
        fontSize: 14,
        color: "#6b7280",
        textAlign: "center",
    },
    button: {
        marginTop: 4,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 10,
        backgroundColor: "#111827",
    },
    buttonText: {
        color: "#fff",
        fontWeight: "700",
    },
});

const localStyles = StyleSheet.create({
    centerCard: {
        alignItems: "center",
        paddingVertical: 32,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        backgroundColor: "#fff",
        gap: 8,
    },
    centerText: {
        color: "#6b7280",
        fontSize: 14,
    },
    errorBanner: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#fef2f2",
        borderWidth: 1,
        borderColor: "#fecaca",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    errorText: {
        color: "#991b1b",
        fontSize: 13,
        flexShrink: 1,
        marginRight: 12,
    },
    retryText: {
        color: "#2563eb",
        fontWeight: "600",
        fontSize: 13,
    },
});
