import React, { ReactNode, useContext } from "react";
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import styles from "./styles";
import { AppContext } from "../../context/app-context";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import SigninForm from "@/src/pages/settings/signInForm";
import { useSettings } from "@/src/hooks/useSettings";

export default function Settings() {
    const { user, deviceId, signout, isDeviceConnected } = useContext(AppContext);
    const router = useRouter();
    const { settings, loading, updatingKeys, updateSetting, refetch } = useSettings();

    useFocusEffect(() => {
        refetch();
    });

    const handleToggle = async (key: keyof typeof settings, value: boolean) => {
        try {
            await updateSetting(key, value);
        } catch (_e: any) {}
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
