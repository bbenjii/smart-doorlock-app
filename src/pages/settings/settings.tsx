import React, { ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import styles from "./styles";
import { AppContext } from "../../context/app-context";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import SigninForm from "@/src/pages/settings/signInForm";
import { useSettings } from "@/src/hooks/useSettings";

const NOTIFICATION_EVENT_OPTIONS = [
    { key: "FORCED_ENTRY", label: "Forced Entry" },
    { key: "FAILED_AUTH", label: "Failed Auth Attempts" },
    { key: "BATTERY_LOW", label: "Battery Low" },
    { key: "DEVICE_OFFLINE", label: "Device Offline" },
    { key: "DOORBELL_PRESSED", label: "Doorbell Pressed" },
    { key: "WINDOW_SENSOR_TRIGGERED", label: "Window Sensor Triggered" },
] as const;

const DEFAULT_NOTIFICATION_EVENTS = NOTIFICATION_EVENT_OPTIONS.map((item) => item.key);

export default function Settings() {
    const { user, deviceId, setDeviceId, signout, isDeviceConnected, authToken, apiBaseUrl } = useContext(AppContext);
    const router = useRouter();
    const { settings, loading, updatingKeys, updateSetting, refetch } = useSettings();
    const [devices, setDevices] = useState<Array<{ deviceId: string; accessLevel: string }>>([]);
    const [enabledNotifications, setEnabledNotifications] = useState<string[]>(DEFAULT_NOTIFICATION_EVENTS);
    const [prefsLoading, setPrefsLoading] = useState(false);
    const [prefsSaving, setPrefsSaving] = useState(false);
    const BASE_URL = apiBaseUrl || "https://smart-doorlock-server-851342133148.europe-west1.run.app/";

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch]),
    );

    const authHeaders = useCallback(() => {
        const h: Record<string, string> = {};
        if (authToken) h.Authorization = `Bearer ${authToken}`;
        return h;
    }, [authToken]);

    const fetchDevices = useCallback(async () => {
        if (!authToken) return;
        try {
            const res = await fetch(`${BASE_URL}devices/me`, { headers: authHeaders() });
            if (!res.ok) return;
            const body = await res.json();
            setDevices((body.devices || []).map((d: any) => ({ deviceId: d.deviceId, accessLevel: d.accessLevel })));
        } catch (_e) {}
    }, [authToken, BASE_URL, authHeaders]);

    useEffect(() => {
        fetchDevices();
    }, [fetchDevices]);

    const fetchNotificationPreferences = useCallback(async () => {
        if (!authToken || !deviceId) return;
        try {
            setPrefsLoading(true);
            const res = await fetch(`${BASE_URL}notifications/preferences/${deviceId}`, { headers: authHeaders() });
            if (!res.ok) return;
            const body = await res.json();
            const values = Array.isArray(body?.enabledNotifications) ? body.enabledNotifications : DEFAULT_NOTIFICATION_EVENTS;
            setEnabledNotifications(values);
        } catch (_e) {
            setEnabledNotifications(DEFAULT_NOTIFICATION_EVENTS);
        } finally {
            setPrefsLoading(false);
        }
    }, [authToken, deviceId, BASE_URL, authHeaders]);

    useEffect(() => {
        fetchNotificationPreferences();
    }, [fetchNotificationPreferences]);

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

    const handleToggle = async (key: keyof typeof settings, value: boolean) => {
        try {
            await updateSetting(key, value);
            if (key === "notisEnabled") {
                const next = value ? (enabledNotifications.length ? enabledNotifications : DEFAULT_NOTIFICATION_EVENTS) : [];
                setEnabledNotifications(next);
                await saveNotificationPreferences(next);
            }
        } catch (_e: any) {}
    };

    const toggleNotificationType = async (eventKey: string, enabled: boolean) => {
        const next = enabled
            ? Array.from(new Set([...enabledNotifications, eventKey]))
            : enabledNotifications.filter((item) => item !== eventKey);
        setEnabledNotifications(next);
        await saveNotificationPreferences(next);
    };

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Settings</Text>
                <Text style={styles.subtitle}>Manage your security system</Text>
            </View>

            {user !== null ? (
                <View style={{ gap: 16 }}>
                    {/* Profile */}
                    <View style={styles.card}>
                        <View style={styles.profileRow}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{`${user?.firstName[0]}${user?.lastName[0]}`}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.profileName}>{`${user?.firstName} ${user?.lastName}`}</Text>
                                <Text style={styles.profileEmail}>{`${user?.email}`}</Text>
                            </View>
                            <Text style={styles.chevronText}>›</Text>
                        </View>
                    </View>

                    {/* Quick Settings */}
                    <View>
                        <Text style={styles.sectionTitle}>Quick Settings</Text>
                        {loading ? (
                            <View style={[styles.card, { alignItems: "center", paddingVertical: 24 }]}>
                                <ActivityIndicator size="small" color="#2563eb" />
                                <Text style={[styles.rowSubtitle, { marginTop: 8 }]}>Loading settings...</Text>
                            </View>
                        ) : (
                            <>
                                <View style={[styles.card, styles.divide]}>
                                    <SettingToggle
                                        icon={<CircleIcon label="N" color="#2563eb" />}
                                        title="Notifications"
                                        subtitle="Push alerts for events"
                                        value={settings.notisEnabled}
                                        onValueChange={(v) => handleToggle("notisEnabled", v)}
                                        updating={updatingKeys.has("notisEnabled")}
                                    />
                                    {settings.notisEnabled ? (
                                        <View style={{ paddingTop: 12 }}>
                                            <Text style={styles.rowSubtitle}>Notification Types</Text>
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
                                            <Text style={styles.rowSubtitle}>
                                                Notifications are off for this device.
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </>
                        )}
                    </View>

                    {/* System */}
                    <View>
                        <Text style={styles.sectionTitle}>System</Text>
                        <View style={[styles.card, styles.divide]}>
                            <SettingLink
                                icon={<CircleIcon label="U" color="#2563eb" />}
                                title="Manage Users"
                                subtitle="Users with access"
                                onPress={() => router.push("/settings/manage-users")}
                            />

                            {/* we can add this back when camera features are implemented
                            <SettingLink
                                icon={<CircleIcon label="V" color="#f97316" />}
                                title="Camera Settings"
                                subtitle="Video quality & recording"
                                onPress={() => router.push("/settings/camera-settings")}
                            />
                            */}

                            <SettingLink
                                icon={<CircleIcon label="W" color="#0ea5e9" />}
                                title="Device Configuration"
                                subtitle="Wi-Fi, Bluetooth, and firmware"
                                rightContent={
                                    <Text style={[styles.badge, styles.badgeSolid]}>
                                        {isDeviceConnected ? "Online" : "Offline"}
                                    </Text>
                                }
                                onPress={() => router.push("/settings/device-config")}
                            />

                            <SettingLink
                                icon={<CircleIcon label="S" color="#475569" />}
                                title="Security & Privacy"
                                subtitle="Access logs & permissions"
                                onPress={() => router.push("/settings/security-privacy")}
                            />
                        </View>
                    </View>

                    {/* System info */}
                    <View style={[styles.card, styles.systemInfo]}>
                        <InfoRow label="Device ID" value={deviceId || "—"} />
                    </View>

                    {devices.length > 1 ? (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Switch Device</Text>
                            <View style={{ gap: 8, marginTop: 8 }}>
                                {devices.map((d) => (
                                    <TouchableOpacity
                                        key={d.deviceId}
                                        style={[
                                            styles.linkRow,
                                            deviceId === d.deviceId ? { borderColor: "#2563eb", borderWidth: 1, borderRadius: 10 } : null,
                                        ]}
                                        onPress={() => setDeviceId?.(d.deviceId)}
                                    >
                                        <View>
                                            <Text style={styles.rowTitle}>{d.deviceId}</Text>
                                            <Text style={styles.rowSubtitle}>{d.accessLevel}</Text>
                                        </View>
                                        <Text style={styles.chevronText}>{deviceId === d.deviceId ? "✓" : "›"}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ) : null}

                    <TouchableOpacity style={[styles.button, styles.buttonGhost]} onPress={signout} activeOpacity={0.7}>
                        <Text style={styles.buttonGhostText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <SigninForm />
            )}
        </ScrollView>
    );
}

type SettingToggleProps = {
    icon: ReactNode;
    title: string;
    subtitle: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    updating?: boolean;
};

const SettingToggle = ({ icon, title, subtitle, value, onValueChange, updating }: SettingToggleProps) => (
    <View style={styles.settingToggleRow}>
        <View style={styles.rowCenter}>
            {icon}
            <View style={{ flexShrink: 1 }}>
                <Text style={styles.rowTitle}>{title}</Text>
                <Text style={styles.rowSubtitle}>{subtitle}</Text>
            </View>
        </View>
        {updating ? <ActivityIndicator size="small" color="#2563eb" /> : <Switch value={value} onValueChange={onValueChange} />}
    </View>
);

type SettingLinkProps = {
    icon: ReactNode;
    title: string;
    subtitle: string;
    rightContent?: React.ReactNode;
    onPress?: () => void;
};

const SettingLink = ({ icon, title, subtitle, rightContent, onPress }: SettingLinkProps) => (
    <TouchableOpacity activeOpacity={0.7} style={styles.linkRow} onPress={onPress}>
        <View style={styles.rowCenter}>
            {icon}
            <View>
                <Text style={styles.rowTitle}>{title}</Text>
                <Text style={styles.rowSubtitle}>{subtitle}</Text>
            </View>
        </View>
        {rightContent ? rightContent : <Text style={styles.chevronText}>›</Text>}
    </TouchableOpacity>
);

const CircleIcon = ({ label, color }: { label: string; color?: string }) => (
    <View style={[styles.circleIcon, color ? { backgroundColor: `${color}1a` } : null]}>
        <Text style={[styles.circleIconText, color ? { color } : null]}>{label}</Text>
    </View>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);
