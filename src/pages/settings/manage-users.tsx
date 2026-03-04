import React, { useCallback, useContext, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import styles from "./styles";
import { AppContext } from "../../context/app-context";
import { useRouter } from "expo-router";

const VALID_METHODS = ["face", "fingerprint", "keypad", "bluetooth"] as const;
type AuthMethod = (typeof VALID_METHODS)[number];

const METHOD_LABELS: Record<AuthMethod, { label: string; icon: string; color: string; description: string }> = {
    face: { label: "Face Recognition", icon: "F", color: "#f97316", description: "Unlock with enrolled face" },
    fingerprint: { label: "Fingerprint", icon: "P", color: "#8b5cf6", description: "Biometric fingerprint scan" },
    keypad: { label: "Keypad", icon: "K", color: "#ec4899", description: "4-6 digit PIN code" },
    bluetooth: { label: "Bluetooth", icon: "B", color: "#2563eb", description: "Proximity auto-unlock" },
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
    owner: ["Lock", "Unlock", "Settings", "Manage Users"],
    guest: ["Lock", "Unlock"],
};

type CredentialState = Record<AuthMethod, boolean>;

export default function ManageUsers() {
    const { user, authToken, deviceId, apiBaseUrl } = useContext(AppContext);
    const router = useRouter();
    const [credentials, setCredentials] = useState<CredentialState>({
        face: false,
        fingerprint: false,
        keypad: false,
        bluetooth: false,
    });
    const [keypadHasCode, setKeypadHasCode] = useState(false);
    const [fingerprintCount, setFingerprintCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [togglingMethod, setTogglingMethod] = useState<AuthMethod | null>(null);

    const BASE_URL = apiBaseUrl || "https://smart-doorlock-server-851342133148.europe-west1.run.app/";

    const headers = useCallback(() => {
        const h: Record<string, string> = { "Content-Type": "application/json" };
        if (authToken) h["Authorization"] = `Bearer ${authToken}`;
        return h;
    }, [authToken]);

    // Fetch current credentials
    const fetchCredentials = useCallback(async () => {
        if (!authToken) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}credentials/me`, {
                headers: headers(),
            });

            if (!response.ok) throw new Error("Failed to load credentials");
            const data = await response.json();
            const methods = data.authMethods || {};
            setCredentials({
                face: methods.face?.isActive ?? false,
                fingerprint: methods.fingerprint?.isActive ?? false,
                keypad: methods.keypad?.isActive ?? false,
                bluetooth: methods.bluetooth?.isActive ?? false,
            });
            setKeypadHasCode(methods.keypad?.data?.hasCode ?? false);
            setFingerprintCount(methods.fingerprint?.data?.count ?? 0);
        } catch (e: any) {
            console.log("Credentials fetch error:", e);
        } finally {
            setLoading(false);
        }
    }, [authToken, headers]);

    useEffect(() => {
        fetchCredentials();
    }, [fetchCredentials]);

    // Toggle a credential method on/off
    const toggleMethod = async (method: AuthMethod, enable: boolean) => {
        if (method === "keypad" && enable && !keypadHasCode) {
            router.push("/settings/keypad-pin");
            return;
        }
        if (method === "fingerprint" && enable && fingerprintCount === 0) {
            router.push("/settings/fingerprints");
            return;
        }

        const prev = credentials[method];
        setCredentials((c) => ({ ...c, [method]: enable }));
        setTogglingMethod(method);

        try {
            const endpoint = enable ? "enroll" : "revoke";
            const response = await fetch(`${BASE_URL}credentials/me/${endpoint}`, {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({ method }),
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body?.detail || "Failed to update");
            }
        } catch (e: any) {
            // Rollback
            setCredentials((c) => ({ ...c, [method]: prev }));
            console.log("Credential toggle error:", e);
        } finally {
            setTogglingMethod(null);
        }
    };

    // Determine user role (default to owner for now)
    const userRole = "owner";
    const permissions = ROLE_PERMISSIONS[userRole] || [];

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Manage Users</Text>
                <Text style={styles.subtitle}>Control who can access your lock</Text>
            </View>

            {/* Current user card */}
            <View style={styles.card}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={localStyles.userAvatar}>
                        <Text style={localStyles.userAvatarText}>
                            {user ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}` : "?"}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={styles.profileName}>
                                {user ? `${user.firstName} ${user.lastName}` : "Current User"}
                            </Text>
                            <Text style={localStyles.ownerBadge}>
                                {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                            </Text>
                        </View>
                        <Text style={styles.profileEmail}>{user?.email || ""}</Text>
                    </View>
                </View>
            </View>

            {/* Role permissions */}
            <View>
                <Text style={styles.sectionTitle}>Permissions</Text>
                <View style={styles.card}>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {permissions.map((perm) => (
                            <Text key={perm} style={localStyles.permBadge}>{perm}</Text>
                        ))}
                    </View>
                </View>
            </View>

            {/* Access Methods - toggles wired to backend */}
            <View>
                <Text style={styles.sectionTitle}>Access Methods</Text>
                {loading ? (
                    <View style={[styles.card, { alignItems: "center", paddingVertical: 24 }]}>
                        <ActivityIndicator size="small" color="#2563eb" />
                        <Text style={[styles.rowSubtitle, { marginTop: 8 }]}>Loading credentials...</Text>
                    </View>
                ) : (
                    <>
                        <View style={[styles.card, styles.divide]}>
                            {VALID_METHODS.map((method) => {
                                const info = METHOD_LABELS[method];
                                const isToggling = togglingMethod === method;
                                return (
                                    <View key={method} style={styles.settingToggleRow}>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 }}>
                                            <View style={[styles.circleIcon, { backgroundColor: `${info.color}1a` }]}>
                                                <Text style={[styles.circleIconText, { color: info.color }]}>{info.icon}</Text>
                                            </View>
                                            <View style={{ flexShrink: 1 }}>
                                                <Text style={styles.rowTitle}>{info.label}</Text>
                                                <Text style={styles.rowSubtitle}>{info.description}</Text>
                                            </View>
                                        </View>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                            {method === "keypad" && (
                                                <TouchableOpacity
                                                    onPress={() => router.push("/settings/keypad-pin")}
                                                    style={{
                                                        paddingHorizontal: 10,
                                                        paddingVertical: 4,
                                                        borderRadius: 8,
                                                        borderWidth: 1,
                                                        borderColor: "#ec4899",
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#ec4899" }}>
                                                        {keypadHasCode ? "Change PIN" : "Set PIN"}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                            {method === "fingerprint" && (
                                                <TouchableOpacity
                                                    onPress={() => router.push("/settings/fingerprints")}
                                                    style={{
                                                        paddingHorizontal: 10,
                                                        paddingVertical: 4,
                                                        borderRadius: 8,
                                                        borderWidth: 1,
                                                        borderColor: "#8b5cf6",
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 12, fontWeight: "600", color: "#8b5cf6" }}>
                                                        {fingerprintCount > 0 ? `Manage (${fingerprintCount})` : "Add"}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                            {isToggling ? (
                                                <ActivityIndicator size="small" color="#2563eb" />
                                            ) : (
                                                <Switch
                                                    value={credentials[method]}
                                                    onValueChange={(v) => toggleMethod(method, v)}
                                                />
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </>
                )}
            </View>

            {/* Device info */}
            <View style={[styles.card, styles.systemInfo]}>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Device ID</Text>
                    <Text style={styles.infoValue}>{deviceId || "—"}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Role</Text>
                    <Text style={styles.infoValue}>{userRole.charAt(0).toUpperCase() + userRole.slice(1)}</Text>
                </View>
            </View>
        </ScrollView>
    );
}

const localStyles = {
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#2563eb",
        justifyContent: "center" as const,
        alignItems: "center" as const,
    },
    userAvatarText: {
        color: "#fff",
        fontWeight: "700" as const,
        fontSize: 16,
    },
    ownerBadge: {
        fontSize: 11,
        fontWeight: "700" as const,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        overflow: "hidden" as const,
        backgroundColor: "#dbeafe",
        color: "#1d4ed8",
    },
    permBadge: {
        fontSize: 13,
        fontWeight: "600" as const,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: "#f3f4f6",
        color: "#374151",
        overflow: "hidden" as const,
    },
    keypadPinCard: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        alignItems: "center" as const,
        marginTop: 8,
    },
};
