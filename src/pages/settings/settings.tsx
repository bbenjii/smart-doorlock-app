import React, { ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import styles from "./styles";
import { AppContext } from "../../context/app-context";
import { useRouter } from "expo-router";
import SigninForm from "@/src/pages/settings/signInForm";

export default function Settings() {
    const { user, deviceId, setDeviceId, signout, isDeviceConnected, authToken, apiBaseUrl } = useContext(AppContext);
    const router = useRouter();
    const [devices, setDevices] = useState<Array<{ deviceId: string; accessLevel: string }>>([]);
    const BASE_URL = apiBaseUrl || "https://smart-doorlock-server-851342133148.europe-west1.run.app/";

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

                    {/* System */}
                    <View>
                        <Text style={styles.sectionTitle}>System</Text>
                        <View style={[styles.card, styles.divide]}>
                            <SettingLink
                                icon={<CircleIcon label="N" color="#2563eb" />}
                                title="Notifications"
                                subtitle="Push alerts and notification types"
                                onPress={() => router.push("/settings/notifications")}
                            />

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
