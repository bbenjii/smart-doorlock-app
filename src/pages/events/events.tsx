import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import styles from "./styles";
import { AppContext } from "../../context/app-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

// ─── Tab / filter types ──────────────────────────────────────────────
type TopTab = "all" | "events" | "logs";
type EventSubFilter = "all" | "access" | "motion" | "alert";
type EventCategory = "access" | "motion" | "alert" | "log";

type EventItem = {
    id: string;
    category: EventCategory;
    title: string;
    description: string;
    timestamp: string;      // formatted display ("5m ago")
    rawTimestamp: string;   // ISO string for sorting
    icon: any;
    tint: string;
};

const TOP_TABS: { label: string; value: TopTab }[] = [
    { label: "All", value: "all" },
    { label: "Events", value: "events" },
    { label: "Logs", value: "logs" },
];

const EVENT_SUB_FILTERS: { label: string; value: EventSubFilter }[] = [
    { label: "All", value: "all" },
    { label: "Access", value: "access" },
    { label: "Motion", value: "motion" },
    { label: "Alerts", value: "alert" },
];

// ─── Backend event types → EventItem mapping ────────────────────────
const EVENT_TYPE_MAP: Record<string, { title: string; category: "access" | "motion" | "alert"; icon: any; tint: string }> = {
    LOCKED: {
        title: "Door Locked",
        category: "access",
        icon: require("../../assets/images/lock.png"),
        tint: "#dc2626",
    },
    UNLOCKED: {
        title: "Door Unlocked",
        category: "access",
        icon: require("../../assets/images/lock-open.png"),
        tint: "#16a34a",
    },
    FAILED_AUTH: {
        title: "Failed Access Attempt",
        category: "alert",
        icon: require("../../assets/images/bell.png"),
        tint: "#ef4444",
    },
    MOTION_DETECTED: {
        title: "Motion Detected",
        category: "motion",
        icon: require("../../assets/images/camera.png"),
        tint: "#2563eb",
    },
    FORCED_ENTRY: {
        title: "Forced Entry Detected",
        category: "alert",
        icon: require("../../assets/images/bell.png"),
        tint: "#ef4444",
    },
    BATTERY_LOW: {
        title: "Battery Low",
        category: "alert",
        icon: require("../../assets/images/radar.png"),
        tint: "#f97316",
    },
    DEVICE_OFFLINE: {
        title: "Device Offline",
        category: "alert",
        icon: require("../../assets/images/radar.png"),
        tint: "#6b7280",
    },
    DEVICE_ONLINE: {
        title: "Device Online",
        category: "alert",
        icon: require("../../assets/images/radar.png"),
        tint: "#16a34a",
    },
    DOORBELL_PRESSED: {
        title: "Doorbell Pressed",
        category: "access",
        icon: require("../../assets/images/bell.png"),
        tint: "#f97316",
    },
    WINDOW_SENSOR_TRIGGERED: {
        title: "Window Sensor Triggered",
        category: "motion",
        icon: require("../../assets/images/radar.png"),
        tint: "#facc15",
    },
};

// ─── Backend audit log actions → EventItem mapping ──────────────────
const LOG_ACTION_MAP: Record<string, { title: string; icon: any; tint: string }> = {
    COMMAND_ISSUED: {
        title: "Lock Command",
        icon: require("../../assets/images/lock.png"),
        tint: "#2563eb",
    },
    COMMAND_DENIED: {
        title: "Access Denied",
        icon: require("../../assets/images/bell.png"),
        tint: "#ef4444",
    },
    CLAIM_DEVICE: {
        title: "Device Paired",
        icon: require("../../assets/images/radar.png"),
        tint: "#16a34a",
    },
    SETTINGS_UPDATED: {
        title: "Settings Changed",
        icon: require("../../assets/images/settings.png"),
        tint: "#f97316",
    },
    USER_ADDED: {
        title: "User Added",
        icon: require("../../assets/images/lock-open.png"),
        tint: "#16a34a",
    },
    USER_REMOVED: {
        title: "User Removed",
        icon: require("../../assets/images/lock.png"),
        tint: "#dc2626",
    },
    ROLE_CHANGED: {
        title: "Role Updated",
        icon: require("../../assets/images/settings.png"),
        tint: "#8b5cf6",
    },
};

const HIDDEN_LOG_ACTIONS = new Set(["ACCESS_GRANTED", "ACCESS_UPDATED"]);

// ─── Helpers ────────────────────────────────────────────────────────
function formatRelativeTime(isoString: string): string {
    const now = Date.now();
    const then = new Date(isoString).getTime();
    const diffMs = now - then;
    if (diffMs < 0) return "just now";

    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return "just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return new Date(isoString).toLocaleDateString();
}

function formatAuthMethod(raw: string): string {
    return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function eventToItem(e: any): EventItem {
    const mapped = EVENT_TYPE_MAP[e.eventType] ?? {
        title: e.eventType,
        category: "alert" as const,
        icon: require("../../assets/images/bell.png"),
        tint: "#6b7280",
    };

    const descParts: string[] = [];
    if (e.userId) descParts.push(e.userId);
    if (e.authMethod) descParts.push(formatAuthMethod(e.authMethod));
    const description = descParts.length > 0 ? descParts.join(" · ") : "System";

    return {
        id: `evt-${e.eventId}`,
        category: mapped.category,
        title: mapped.title,
        description,
        timestamp: formatRelativeTime(e.timestamp),
        rawTimestamp: e.timestamp ?? "",
        icon: mapped.icon,
        tint: mapped.tint,
    };
}

function logToItem(log: any): EventItem {
    const mapped = LOG_ACTION_MAP[log.action] ?? {
        title: log.action,
        icon: require("../../assets/images/history.png"),
        tint: "#6b7280",
    };

    let description = "";
    if (log.action === "COMMAND_ISSUED" && log.details?.command) {
        const cmd = log.details.command;
        description = `${cmd === "LOCK" ? "Locked" : cmd === "UNLOCK" ? "Unlocked" : cmd} via app`;
    } else if (log.action === "COMMAND_DENIED" && log.details?.command) {
        description = `${log.details.command} · permission denied`;
    } else if (log.action === "CLAIM_DEVICE") {
        description = "New device paired";
    } else if (log.actorUserId) {
        description = `by ${log.actorUserId}`;
    } else {
        description = log.status === "SUCCESS" ? "Completed" : "Failed";
    }

    return {
        id: `log-${log.logId}`,
        category: "log",
        title: mapped.title,
        description,
        timestamp: formatRelativeTime(log.timestamp),
        rawTimestamp: log.timestamp ?? "",
        icon: mapped.icon,
        tint: mapped.tint,
    };
}

// ─── API ────────────────────────────────────────────────────────────
const API_URL = "https://smart-doorlock-server-851342133148.europe-west1.run.app/";

export default function Events() {
    const [topTab, setTopTab] = useState<TopTab>("all");
    const [eventSubFilter, setEventSubFilter] = useState<EventSubFilter>("all");

    const { user, deviceId, authToken, lastWsEvent } = useContext(AppContext);
    const router = useRouter();

    const [items, setItems] = useState<EventItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Reset sub-filter when switching away from Events tab
    useEffect(() => {
        if (topTab !== "events") setEventSubFilter("all");
    }, [topTab]);

    const authHeaders = useCallback(() => {
        const headers: Record<string, string> = {};
        if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
        return headers;
    }, [authToken]);

    const fetchData = useCallback(async (showLoader: boolean = true) => {
        if (!deviceId || !authToken) return;
        if (showLoader) {
            setLoading(true);
        }

        try {
            const [eventsRes, logsRes] = await Promise.all([
                fetch(`${API_URL}devices/${deviceId}/events?limit=100`, { headers: authHeaders() }),
                fetch(`${API_URL}devices/${deviceId}/logs?limit=100`, { headers: authHeaders() }),
            ]);

            if (!eventsRes.ok) throw new Error(`Events: ${eventsRes.status}`);
            if (!logsRes.ok) throw new Error(`Logs: ${logsRes.status}`);

            const eventsData = await eventsRes.json();
            const logsData = await logsRes.json();

            const eventItems = (eventsData.items ?? []).map(eventToItem);
            const logItems = (logsData.items ?? [])
                .filter((log: any) => !HIDDEN_LOG_ACTIONS.has(log?.action))
                .map(logToItem);

            // Merge and sort by raw timestamp descending
            const all = [...eventItems, ...logItems].sort((a, b) =>
                b.rawTimestamp.localeCompare(a.rawTimestamp),
            );
            setItems(all);
        } catch (e: any) {
            console.log("Events fetch error:", e);
            if (showLoader) {
                setItems([]);
            }
        } finally {
            if (showLoader) {
                setLoading(false);
            }
        }
    }, [deviceId, authToken, authHeaders]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Keep list fresh while the Events screen is focused.
    useFocusEffect(
        useCallback(() => {
            fetchData(false);
            const interval = setInterval(() => {
                fetchData(false);
            }, 5000);

            return () => clearInterval(interval);
        }, [fetchData]),
    );

    // Prepend real-time events arriving via WebSocket
    useEffect(() => {
        if (!lastWsEvent) return;
        const newItem = eventToItem(lastWsEvent);
        setItems((prev) => {
            // Avoid duplicates if the same event arrives twice
            if (prev.some((i) => i.id === newItem.id)) return prev;
            return [newItem, ...prev];
        });
        // Refresh from backend so related logs/system events appear without leaving the page.
        fetchData(false);
    }, [lastWsEvent, fetchData]);

    // ─── Filtering ─────────────────────────────────────────────────
    const filteredItems = useMemo(() => {
        if (topTab === "logs") {
            return items.filter((i) => i.category === "log");
        }
        if (topTab === "events") {
            const eventOnly = items.filter((i) => i.category !== "log");
            if (eventSubFilter === "all") return eventOnly;
            return eventOnly.filter((i) => i.category === eventSubFilter);
        }
        // "all" tab → everything
        return items;
    }, [topTab, eventSubFilter, items]);

    // ─── Not logged in ──────────────────────────────────────────────
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

    // ─── Render ─────────────────────────────────────────────────────
    return (
        <View style={authStyles.webInteractionLayer}>
            <ScrollView
                style={styles.screen}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
                pointerEvents="auto"
            >
                <View style={styles.content} pointerEvents="auto">
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Activity Log</Text>
                <Text style={styles.subtitle}>Track all security events</Text>
            </View>

            {/* Top-level tabs: All | Events | Logs */}
            <View style={styles.tabBar}>
                {TOP_TABS.map((tab) => {
                    const active = topTab === tab.value;
                    return (
                        <Pressable
                            key={tab.value}
                            onPress={() => setTopTab(tab.value)}
                            style={[styles.tabItem, active && styles.tabItemActive]}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                        >
                            <Text style={[styles.tabText, active && styles.tabTextActive]}>
                                {tab.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* Sub-filter chips — only visible on the Events tab */}
            {topTab === "events" && (
                <View style={styles.subFilters}>
                    {EVENT_SUB_FILTERS.map((sf) => {
                        const active = eventSubFilter === sf.value;
                        return (
                            <Pressable
                                key={sf.value}
                                onPress={() => setEventSubFilter(sf.value)}
                                style={[styles.subFilterPill, active && styles.subFilterPillActive]}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active }}
                            >
                                <Text style={[styles.subFilterText, active && styles.subFilterTextActive]}>
                                    {sf.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            )}

            {/* Content */}
            {loading ? (
                <View style={styles.emptyState}>
                    <ActivityIndicator size="small" color="#4f46e5" />
                    <Text style={styles.emptySubtitle}>Loading activity...</Text>
                </View>
            ) : (
                <View style={styles.list}>
                    {filteredItems.map((item) => (
                        <View key={item.id} style={styles.card}>
                            <View style={styles.cardIconWrapper}>
                                <View style={[styles.iconBadge, { backgroundColor: `${item.tint}1a` }]}>
                                    <Image source={item.icon} style={[styles.cardIcon, { tintColor: item.tint }]} />
                                </View>
                            </View>
                            <View style={styles.cardContent}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.cardTitle}>{item.title}</Text>
                                    {item.category === "alert" && (
                                        <View style={styles.alertBadge}>
                                            <Text style={styles.alertText}>Alert</Text>
                                        </View>
                                    )}
                                    {item.category === "log" && (
                                        <View style={styles.logBadge}>
                                            <Text style={styles.logText}>Log</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.cardDescription}>{item.description}</Text>
                                <Text style={styles.cardTimestamp}>{item.timestamp}</Text>
                            </View>
                        </View>
                    ))}

                    {filteredItems.length === 0 && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyTitle}>No activity yet</Text>
                            <Text style={styles.emptySubtitle}>Try another filter or check back later.</Text>
                        </View>
                    )}
                </View>
            )}
                </View>
            </ScrollView>
        </View>
    );
}

const authStyles = StyleSheet.create({
    webInteractionLayer: {
        flex: 1,
        ...(Platform.OS === "web"
            ? {
                position: "relative",
                zIndex: 9999,
            }
            : {}),
    },
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
