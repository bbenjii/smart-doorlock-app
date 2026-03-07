import React, { useCallback, useContext, useEffect, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import styles from "./styles";
import { AppContext } from "../../context/app-context";
import { useSettings } from "@/src/hooks/useSettings";

const webClick = (fn: () => void) => (Platform.OS === "web" ? ({ onClick: fn } as any) : {});

const NOTIFICATION_EVENT_OPTIONS = [
    { key: "FORCED_ENTRY", label: "Forced Entry" },
    { key: "FAILED_AUTH", label: "Failed Auth Attempts" },
    { key: "BATTERY_LOW", label: "Battery Low" },
    { key: "DEVICE_OFFLINE", label: "Device Offline" },
    { key: "DOORBELL_PRESSED", label: "Doorbell Pressed" },
    { key: "WINDOW_SENSOR_TRIGGERED", label: "Window Sensor Triggered" },
] as const;

const DEFAULT_NOTIFICATION_EVENTS = NOTIFICATION_EVENT_OPTIONS.map((item) => item.key);

export default function NotificationsSettings() {
    const router = useRouter();
    const { authToken, deviceId, apiBaseUrl, refreshNotificationGateNow } = useContext(AppContext);
    const { settings, loading, updatingKeys, updateSetting, refetch } = useSettings();
    const [enabledNotifications, setEnabledNotifications] = useState<string[]>(DEFAULT_NOTIFICATION_EVENTS);
    const [masterEnabled, setMasterEnabled] = useState(true);
    const [prefsLoading, setPrefsLoading] = useState(false);
    const [prefsSaving, setPrefsSaving] = useState(false);

    const BASE_URL = apiBaseUrl || "https://smart-doorlock-server-851342133148.europe-west1.run.app/";

    const authHeaders = useCallback(() => {
        const h: Record<string, string> = {};
        if (authToken) h.Authorization = `Bearer ${authToken}`;
        return h;
    }, [authToken]);

    const fetchNotificationPreferences = useCallback(async () => {
        if (!authToken || !deviceId) return;
        try {
            setPrefsLoading(true);
            const res = await fetch(`${BASE_URL}notifications/preferences/${deviceId}`, { headers: authHeaders() });
            if (!res.ok) return;
            const body = await res.json();
            const values = Array.isArray(body?.enabledNotifications) ? body.enabledNotifications : DEFAULT_NOTIFICATION_EVENTS;
            setEnabledNotifications(values);
            setMasterEnabled(values.length > 0);
        } catch (_e) {
            setEnabledNotifications(DEFAULT_NOTIFICATION_EVENTS);
            setMasterEnabled(true);
        } finally {
            setPrefsLoading(false);
        }
    }, [authToken, deviceId, BASE_URL, authHeaders]);

    useEffect(() => {
        // If user has no saved prefs yet, fall back to backend master toggle.
        if (!prefsLoading && enabledNotifications.length === DEFAULT_NOTIFICATION_EVENTS.length) {
            setMasterEnabled(Boolean(settings.notisEnabled));
        }
    }, [settings.notisEnabled, prefsLoading, enabledNotifications.length]);

    useEffect(() => {
        refetch();
        fetchNotificationPreferences();
    }, [refetch, fetchNotificationPreferences]);

    const saveNotificationPreferences = useCallback(async (values: string[]) => {
        if (!authToken || !deviceId) return;
        setPrefsSaving(true);
        try {
            await fetch(`${BASE_URL}notifications/preferences/${deviceId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeaders(),
                },
                body: JSON.stringify({ enabledNotifications: values }),
            });
        } finally {
            setPrefsSaving(false);
        }
    }, [authToken, deviceId, BASE_URL, authHeaders]);

    const toggleMaster = async (value: boolean) => {
        setMasterEnabled(value);
        const next = value ? (enabledNotifications.length ? enabledNotifications : DEFAULT_NOTIFICATION_EVENTS) : [];
        setEnabledNotifications(next);

        try {
            await updateSetting("notisEnabled", value);
        } catch (_e) {
            // Keep UI responsive even if settings endpoint fails.
        }
        await saveNotificationPreferences(next);
        if (typeof refreshNotificationGateNow === "function") {
            await refreshNotificationGateNow();
        }
    };

    const toggleNotificationType = async (eventKey: string, enabled: boolean) => {
        const next = enabled
            ? Array.from(new Set([...enabledNotifications, eventKey]))
            : enabledNotifications.filter((item) => item !== eventKey);
        setEnabledNotifications(next);
        await saveNotificationPreferences(next);
        if (typeof refreshNotificationGateNow === "function") {
            await refreshNotificationGateNow();
        }
    };

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Notifications</Text>
                <Text style={styles.subtitle}>Choose which alerts you want on this device</Text>
            </View>

            <TouchableOpacity onPress={() => router.replace("/settings")} {...webClick(() => router.replace("/settings"))}>
                <Text style={[styles.rowSubtitle, { marginBottom: 8 }]}>‹ Back to Settings</Text>
            </TouchableOpacity>

            {loading ? (
                <View style={[styles.card, { alignItems: "center", paddingVertical: 24 }]}>
                    <ActivityIndicator size="small" color="#2563eb" />
                    <Text style={[styles.rowSubtitle, { marginTop: 8 }]}>Loading settings...</Text>
                </View>
            ) : (
                <View style={[styles.card, styles.divide]}>
                    <View style={styles.settingToggleRow}>
                        <View>
                            <Text style={styles.rowTitle}>Notifications</Text>
                            <Text style={styles.rowSubtitle}>In-app alerts for this device</Text>
                        </View>
                        {updatingKeys.has("notisEnabled") ? (
                            <ActivityIndicator size="small" color="#2563eb" />
                        ) : (
                            <Switch value={masterEnabled} onValueChange={toggleMaster} />
                        )}
                    </View>

                    {masterEnabled ? (
                        <View style={{ paddingTop: 12 }}>
                            <Text style={styles.rowSubtitle}>  Notification Types</Text>
                            <View style={{ marginTop: 8, gap: 8 }}>
                                {NOTIFICATION_EVENT_OPTIONS.map((item) => (
                                    <View key={item.key} style={styles.settingToggleRow}>
                                        <Text style={styles.rowTitle}>{item.label}</Text>
                                        {prefsLoading || prefsSaving ? (
                                            <ActivityIndicator size="small" color="#2563eb" />
                                        ) : (
                                            <Switch
                                                value={enabledNotifications.includes(item.key)}
                                                onValueChange={(v) => toggleNotificationType(item.key, v)}
                                            />
                                        )}
                                    </View>
                                ))}
                            </View>
                        </View>
                    ) : (
                        <View style={{ paddingTop: 12 }}>
                            <Text style={styles.rowSubtitle}>  Notifications are off for this device.</Text>
                        </View>
                    )}
                </View>
            )}

        </ScrollView>
    );
}
