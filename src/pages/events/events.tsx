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
type DataSource = "logs" | "events" | "user_events";

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

function mapDeviceEvent(raw: any): EventItem | null {
    const eventType = raw.eventType || "EVENT";
    if (eventType !== "LOCKED" && eventType !== "UNLOCKED") return null;

    return {
        id: raw.eventId || String(Math.random()),
        state: eventType,
        title: eventType === "LOCKED" ? "Door Locked" : "Door Unlocked",
        timestamp: raw.timestamp ? formatTimestamp(raw.timestamp) : "—",
        rawTimestamp: raw.timestamp ? String(raw.timestamp) : "",
        icon: eventType === "LOCKED" ? require("../../assets/images/lock.png") : require("../../assets/images/lock-open.png"),
        tint: eventType === "LOCKED" ? "#dc2626" : "#16a34a",
    };
}

function sortByTimestamp(items: EventItem[]): EventItem[] {
    return [...items].sort((a, b) => {
        const at = Date.parse(a.rawTimestamp);
        const bt = Date.parse(b.rawTimestamp);
        if (Number.isNaN(at) && Number.isNaN(bt)) return 0;
        if (Number.isNaN(at)) return 1;
        if (Number.isNaN(bt)) return -1;
        return bt - at;
    });
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
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [source, setSource] = useState<DataSource | null>(null);
    
    const dedupeConsecutive = useCallback((items: EventItem[]): EventItem[] => {
        const result: EventItem[] = [];
        for (const item of items) {
            const prev = result[result.length - 1];
            if (prev && prev.state === item.state) continue;
            result.push(item);
        }
        return result;
    }, []);

    const headers = useCallback(() => {
        const h: Record<string, string> = { "Content-Type": "application/json" };
        if (authToken) h["Authorization"] = `Bearer ${authToken}`;
        return h;
    }, [authToken]);

    const fetchEvents = useCallback(async (cursor?: string | null) => {
        if (!deviceId || !authToken || !apiBaseUrl) {
            setLoading(false);
            return;
        }

        if (!cursor) setLoading(true);
        else setLoadingMore(true);

        setError(null);

        try {
            const resolvedUserId =
                user?.id ?? user?.user_id ?? user?.userId ?? null;

            const candidates: DataSource[] =
                cursor && source
                    ? [source]
                    : resolvedUserId
                        ? ["logs", "events", "user_events"]
                        : ["logs", "events"];
            let selectedSource: DataSource | null = null;
            let data: any = null;
            let lastError: string | null = null;

            for (const candidate of candidates) {
                let url =
                    candidate === "logs"
                        ? buildApiUrl(apiBaseUrl, `devices/${deviceId}/logs?limit=50`)
                        : candidate === "events"
                            ? buildApiUrl(apiBaseUrl, `devices/${deviceId}/events?limit=50`)
                            : buildApiUrl(
                                apiBaseUrl,
                                `users/${encodeURIComponent(String(resolvedUserId))}/events?device_id=${encodeURIComponent(deviceId)}&limit=50`,
                            );

                if (cursor) url += `&cursor_ts=${encodeURIComponent(cursor)}`;

                try {
                    const response = await fetchWithTimeout(
                        url,
                        { headers: headers() },
                        FETCH_TIMEOUT,
                    );

                    if (!response.ok) {
                        const body = await response.json().catch(() => ({}));
                        lastError = body?.detail || `Failed to load ${candidate}`;
                        continue;
                    }

                    data = await response.json();
                    selectedSource = candidate;
                    break;
                } catch (candidateErr: any) {
                    lastError = candidateErr?.message || `Failed to load ${candidate}`;
                    continue;
                }
            }

            if (!selectedSource || !data) {
                throw new Error(lastError || "Failed to load events");
            }

            const mapped =
                selectedSource === "logs"
                    ? (data.items || []).map(mapAuditLog).filter(Boolean) as EventItem[]
                    : (data.items || []).map(mapDeviceEvent).filter(Boolean) as EventItem[];

            if (cursor) {
                setEvents((prev) => {
                    const merged = sortByTimestamp([...prev, ...mapped]);
                    return dedupeConsecutive(merged);
                });
            } else {
                const sorted = sortByTimestamp(mapped);
                setEvents(dedupeConsecutive(sorted));
            }
            setSource(selectedSource);
            setNextCursor(data.nextCursorTs || null);
        } catch (e: any) {
            if (e.name === "AbortError") {
                setError("Server unreachable");
            } else {
                setError(e.message || "Failed to load events");
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [deviceId, authToken, apiBaseUrl, headers, source, user, dedupeConsecutive]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

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
                        <TouchableOpacity onPress={() => fetchEvents()}>
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

                        {nextCursor && events.length > 0 && (
                            <TouchableOpacity
                                onPress={() => fetchEvents(nextCursor)}
                                style={localStyles.loadMoreButton}
                                disabled={loadingMore}
                            >
                                {loadingMore ? (
                                    <ActivityIndicator size="small" color="#2563eb" />
                                ) : (
                                    <Text style={localStyles.loadMoreText}>Load More</Text>
                                )}
                            </TouchableOpacity>
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
    loadMoreButton: {
        alignItems: "center",
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        backgroundColor: "#fff",
    },
    loadMoreText: {
        color: "#2563eb",
        fontWeight: "600",
        fontSize: 14,
    },
});