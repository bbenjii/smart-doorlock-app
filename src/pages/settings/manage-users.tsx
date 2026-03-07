import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import styles from "./styles";
import { AppContext } from "../../context/app-context";
import { useRouter } from "expo-router";

const webClick = (fn: () => void) => (Platform.OS === "web" ? ({ onClick: fn } as any) : {});

const VALID_METHODS = ["face", "fingerprint", "keypad", "bluetooth"] as const;
type AuthMethod = (typeof VALID_METHODS)[number];

type AccessLevel = "owner" | "guest";

type AccessUser = {
    userId: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    accessLevel: AccessLevel;
    accessMethods: AuthMethod[];
};

type DeviceAccessItem = {
    deviceId: string;
    accessLevel: AccessLevel;
};

type CredentialState = Record<AuthMethod, boolean>;

const METHOD_LABELS: Record<AuthMethod, string> = {
    face: "Face",
    fingerprint: "Fingerprint",
    keypad: "Keypad",
    bluetooth: "Bluetooth",
};

const METHOD_SETTING_KEYS: Record<AuthMethod, string> = {
    face: "faceRecogEnabled",
    fingerprint: "fingerprintEnabled",
    keypad: "keypadEnabled",
    bluetooth: "bluetoothEnabled",
};

const prettyDeviceId = (id?: string | null) => {
    if (!id) return "Unknown device";
    return id;
};

export default function ManageUsers() {
    const { user, authToken, deviceId, setDeviceId, apiBaseUrl } = useContext(AppContext);
    const router = useRouter();

    const BASE_URL = apiBaseUrl || "https://smart-doorlock-server-851342133148.europe-west1.run.app/";

    const [loading, setLoading] = useState(true);
    const [savingAccess, setSavingAccess] = useState(false);
    const [revokingUserId, setRevokingUserId] = useState<string | null>(null);
    const [accessError, setAccessError] = useState<string | null>(null);
    const [users, setUsers] = useState<AccessUser[]>([]);
    const [myRole, setMyRole] = useState<AccessLevel>("guest");
    const [devices, setDevices] = useState<DeviceAccessItem[]>([]);

    const [formEmail, setFormEmail] = useState("");
    const [formRole, setFormRole] = useState<AccessLevel>("guest");
    const [formMethods, setFormMethods] = useState<AuthMethod[]>(["face", "fingerprint", "keypad", "bluetooth"]);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [isAddFormOpen, setIsAddFormOpen] = useState(false);

    const [credentials, setCredentials] = useState<CredentialState>({
        face: false,
        fingerprint: false,
        keypad: false,
        bluetooth: false,
    });
    const [keypadHasCode, setKeypadHasCode] = useState(false);
    const [fingerprintCount, setFingerprintCount] = useState(0);
    const [faceHasEnrollment, setFaceHasEnrollment] = useState(false);
    const [togglingMethod, setTogglingMethod] = useState<AuthMethod | null>(null);
    const [deviceMethods, setDeviceMethods] = useState<Record<AuthMethod, boolean>>({
        face: true,
        fingerprint: true,
        keypad: true,
        bluetooth: true,
    });

    const headers = useCallback(() => {
        const h: Record<string, string> = { "Content-Type": "application/json" };
        if (authToken) h["Authorization"] = `Bearer ${authToken}`;
        return h;
    }, [authToken]);

    const myUserId = useMemo(() => {
        const u: any = user || {};
        return u.user_id || u.userId || u.id || null;
    }, [user]);

    const resetForm = (close = false) => {
        setFormEmail("");
        setFormRole("guest");
        setFormMethods(["face", "fingerprint", "keypad", "bluetooth"]);
        setEditingUserId(null);
        if (close) {
            setIsAddFormOpen(false);
        }
    };

    const openAddForm = () => {
        resetForm();
        setIsAddFormOpen(true);
    };

    const fetchMyDevices = useCallback(async (): Promise<DeviceAccessItem[]> => {
        if (!authToken) return [];
        const response = await fetch(`${BASE_URL}devices/me`, { headers: headers() });
        if (!response.ok) return [];
        const body = await response.json().catch(() => ({}));
        return (body.devices || [])
            .filter((d: any) => d?.deviceId)
            .map((d: any) => ({
                deviceId: String(d.deviceId),
                accessLevel: d.accessLevel === "owner" ? "owner" : "guest",
            }));
    }, [authToken, BASE_URL, headers]);

    const fetchAccessUsers = useCallback(async (targetDeviceId: string) => {
        if (!authToken || !targetDeviceId) return;

        const response = await fetch(`${BASE_URL}devices/${targetDeviceId}/access`, {
            headers: headers(),
        });

        if (response.status === 403) {
            setUsers([]);
            setMyRole("guest");
            return;
        }

        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body?.detail || "Failed to load access list");
        }

        const body = await response.json();
        const list: AccessUser[] = body.users || [];
        setUsers(list);

        const me = list.find((entry) => entry.userId === myUserId);
        setMyRole((me?.accessLevel as AccessLevel) || "guest");
    }, [authToken, BASE_URL, headers, myUserId]);

    const fetchMyCredentials = useCallback(async () => {
        if (!authToken) return;

        const response = await fetch(`${BASE_URL}credentials/me`, { headers: headers() });
        if (!response.ok) {
            throw new Error("Failed to load credentials");
        }

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
        setFaceHasEnrollment(methods.face?.hasEnrollment ?? false);
    }, [authToken, BASE_URL, headers]);

    const fetchDeviceSettings = useCallback(async (targetDeviceId: string) => {
        if (!authToken || !targetDeviceId) return;
        const response = await fetch(`${BASE_URL}settings/${targetDeviceId}`, { headers: headers() });
        if (!response.ok) {
            return;
        }
        const data = await response.json();
        setDeviceMethods({
            face: data.faceRecogEnabled ?? true,
            fingerprint: data.fingerprintEnabled ?? true,
            keypad: data.keypadEnabled ?? true,
            bluetooth: data.bluetoothEnabled ?? true,
        });
    }, [authToken, BASE_URL, headers]);

    const fetchAll = useCallback(async () => {
        if (!authToken) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setAccessError(null);
        try {
            const myDevices = await fetchMyDevices();
            setDevices(myDevices);
            const allowedDeviceIds = myDevices.map((d) => d.deviceId).filter(Boolean);

            if (!allowedDeviceIds.length) {
                setDevices([]);
                setUsers([]);
                setMyRole("guest");
                await fetchMyCredentials();
                return;
            }

            let selectedDeviceId = deviceId;
            if (!selectedDeviceId || !allowedDeviceIds.includes(selectedDeviceId)) {
                selectedDeviceId = allowedDeviceIds[0];
                setDeviceId?.(selectedDeviceId);
            }

            await Promise.all([
                fetchAccessUsers(selectedDeviceId),
                fetchMyCredentials(),
                fetchDeviceSettings(selectedDeviceId),
            ]);
        } catch (e) {
            setAccessError(e instanceof Error ? e.message : "Failed to load access data");
        } finally {
            setLoading(false);
        }
    }, [authToken, deviceId, fetchAccessUsers, fetchMyCredentials, fetchMyDevices, fetchDeviceSettings, setDeviceId]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const toggleFormMethod = (method: AuthMethod) => {
        setFormMethods((prev) => {
            if (prev.includes(method)) {
                return prev.filter((m) => m !== method);
            }
            return [...prev, method];
        });
    };

    const saveAccess = async () => {
        if (!deviceId) return;
        if (!editingUserId && !formEmail.trim()) {
            setAccessError("Email is required");
            return;
        }

        setSavingAccess(true);
        setAccessError(null);
        try {
            if (editingUserId) {
                const response = await fetch(`${BASE_URL}devices/${deviceId}/access/${editingUserId}`, {
                    method: "PATCH",
                    headers: headers(),
                    body: JSON.stringify({
                        accessLevel: formRole,
                        accessMethods: formMethods,
                    }),
                });
                if (!response.ok) {
                    const body = await response.json().catch(() => ({}));
                    throw new Error(body?.detail || "Failed to update access");
                }
            } else {
                const response = await fetch(`${BASE_URL}devices/${deviceId}/access`, {
                    method: "POST",
                    headers: headers(),
                    body: JSON.stringify({
                        email: formEmail.trim(),
                        accessLevel: formRole,
                        accessMethods: formMethods,
                    }),
                });
                if (!response.ok) {
                    const body = await response.json().catch(() => ({}));
                    throw new Error(body?.detail || "Failed to grant access");
                }
            }

            resetForm(true);
            await fetchAccessUsers(deviceId);
        } catch (e) {
            setAccessError(e instanceof Error ? e.message : "Failed to save access");
        } finally {
            setSavingAccess(false);
        }
    };

    const startEdit = (entry: AccessUser) => {
        setIsAddFormOpen(true);
        setEditingUserId(entry.userId);
        setFormEmail(entry.email || "");
        setFormRole(entry.accessLevel);
        setFormMethods(entry.accessMethods?.length ? entry.accessMethods : ["face", "fingerprint", "keypad", "bluetooth"]);
    };

    const revokeAccess = async (targetUserId: string) => {
        if (!deviceId) return;

        setRevokingUserId(targetUserId);
        setAccessError(null);
        try {
            const response = await fetch(`${BASE_URL}devices/${deviceId}/access/${targetUserId}`, {
                method: "DELETE",
                headers: headers(),
            });
            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body?.detail || "Failed to revoke access");
            }

            await fetchAccessUsers(deviceId);
        } catch (e) {
            setAccessError(e instanceof Error ? e.message : "Failed to revoke access");
        } finally {
            setRevokingUserId(null);
        }
    };

    const toggleDeviceMethod = async (method: AuthMethod, enable: boolean) => {
        if (!deviceId || !canManageUsers) return;

        const prev = deviceMethods[method];
        setDeviceMethods((c) => ({ ...c, [method]: enable }));
        setTogglingMethod(method);

        try {
            const settingKey = METHOD_SETTING_KEYS[method];
            const response = await fetch(`${BASE_URL}settings/${deviceId}`, {
                method: "PUT",
                headers: headers(),
                body: JSON.stringify({ [settingKey]: enable }),
            });
            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body?.detail || "Failed to update device method");
            }
        } catch (e) {
            setDeviceMethods((c) => ({ ...c, [method]: prev }));
            setAccessError(e instanceof Error ? e.message : "Failed to update device method");
        } finally {
            setTogglingMethod(null);
        }
    };

    const hasDeviceAccess = users.some((entry) => entry.userId === myUserId);
    const canManageUsers = hasDeviceAccess && myRole === "owner";
    const showAccessForm = canManageUsers && (isAddFormOpen || Boolean(editingUserId));
    const myAccessEntry = users.find((entry) => entry.userId === myUserId) || null;
    const myAccessMethods = VALID_METHODS.filter((m) => (myAccessEntry?.accessMethods || []).includes(m));
    const ownerCount = devices.filter((d) => d.accessLevel === "owner").length;
    const guestCount = devices.length - ownerCount;
    const selectedDeviceRole = devices.find((d) => d.deviceId === deviceId)?.accessLevel || myRole;

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Manage Users</Text>
            </View>

            {loading ? (
                <View style={[styles.card, { alignItems: "center", paddingVertical: 24 }]}> 
                    <ActivityIndicator size="small" color="#2563eb" />
                    <Text style={[styles.rowSubtitle, { marginTop: 8 }]}>Loading access data...</Text>
                </View>
            ) : !deviceId || !hasDeviceAccess ? (
                <View style={styles.card}>
                    <View style={localStyles.emptyStateWrap}>
                        <View style={localStyles.emptyIconCircle}>
                            <View style={localStyles.emptyIconDot} />
                            <View style={localStyles.emptyIconLine} />
                        </View>
                    </View>
                    <Text style={[styles.sectionTitle, localStyles.emptyStateTitle]}>No Device Access</Text>
                    <Text style={[styles.rowSubtitle, localStyles.emptyStateSubtitle]}>
                        Ask a device owner to add you, or configure a device first.
                    </Text>
                    <View style={localStyles.emptyStateActions}>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonPrimary, localStyles.emptyPrimaryButton]}
                            onPress={() => router.push("/settings/device-config")}
                            {...webClick(() => router.push("/settings/device-config"))}
                        >
                            <Text style={[styles.buttonText, styles.buttonPrimaryText]}>Configure Device</Text>
                        </TouchableOpacity>
                    </View>
                    {accessError ? <Text style={localStyles.errorText}>{accessError}</Text> : null}
                </View>
            ) : (
                <>
                    {devices.length > 1 ? (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Your Devices</Text>
                            <Text style={[styles.rowSubtitle, { marginTop: 4 }]}>
                                Choose a device to manage. You own {ownerCount} and have guest access to {guestCount}.
                            </Text>
                            <View style={{ marginTop: 10, gap: 8 }}>
                                {devices.map((d, idx) => (
                                    <TouchableOpacity
                                        key={d.deviceId}
                                        style={[
                                            localStyles.deviceRow,
                                            d.deviceId === deviceId ? localStyles.deviceRowActive : null,
                                        ]}
                                        onPress={() => {
                                            if (d.deviceId !== deviceId) {
                                                setDeviceId?.(d.deviceId);
                                                resetForm(true);
                                            }
                                        }}
                                        {...webClick(() => {
                                            if (d.deviceId !== deviceId) {
                                                setDeviceId?.(d.deviceId);
                                                resetForm(true);
                                            }
                                        })}
                                    >
                                        <View>
                                            <Text style={styles.rowTitle}>Door Lock {idx + 1}</Text>
                                            <Text style={styles.rowSubtitle}>{prettyDeviceId(d.deviceId)}</Text>
                                        </View>
                                        <View style={localStyles.deviceRightWrap}>
                                            <Text
                                                style={[
                                                    localStyles.deviceRoleChip,
                                                    d.accessLevel === "owner" ? localStyles.ownerChip : localStyles.guestChip,
                                                ]}
                                            >
                                                {d.accessLevel === "owner" ? "Owner" : "Guest"}
                                            </Text>
                                            <Text style={styles.chevronText}>{d.deviceId === deviceId ? "✓" : "›"}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ) : (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Your Device</Text>
                            <Text style={[styles.rowSubtitle, { marginTop: 4 }]}>{prettyDeviceId(deviceId)}</Text>
                            <View style={{ marginTop: 8, alignSelf: "flex-start" }}>
                                <Text
                                    style={[
                                        localStyles.deviceRoleChip,
                                        selectedDeviceRole === "owner" ? localStyles.ownerChip : localStyles.guestChip,
                                    ]}
                                >
                                    {selectedDeviceRole === "owner" ? "Owner" : "Guest"}
                                </Text>
                            </View>
                        </View>
                    )}

                    {canManageUsers ? (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>People With Access</Text>
                        {users.length === 0 ? (
                            <Text style={styles.rowSubtitle}>No active users for this device.</Text>
                        ) : (
                            users.map((entry) => (
                                <View key={entry.userId} style={localStyles.userRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.rowTitle}>
                                            {entry.firstName || ""} {entry.lastName || ""}
                                            {entry.userId === myUserId ? " (You)" : ""}
                                        </Text>
                                        <Text style={styles.rowSubtitle}>{entry.email || entry.userId}</Text>
                                        <View style={localStyles.chipsRow}>
                                            <Text style={[localStyles.roleChip, entry.accessLevel === "owner" ? localStyles.ownerChip : localStyles.guestChip]}>
                                                {entry.accessLevel.toUpperCase()}
                                            </Text>
                                            {entry.accessMethods?.map((m) => (
                                                <Text key={`${entry.userId}-${m}`} style={localStyles.methodChip}>{m}</Text>
                                            ))}
                                        </View>
                                    </View>

                                    <View style={localStyles.actionsCol}>
                                        <TouchableOpacity onPress={() => startEdit(entry)} {...webClick(() => startEdit(entry))}>
                                            <Text style={localStyles.editText}>Edit</Text>
                                        </TouchableOpacity>
                                        {revokingUserId === entry.userId ? (
                                            <ActivityIndicator size="small" color="#ef4444" />
                                        ) : (
                                            <TouchableOpacity
                                                onPress={() => revokeAccess(entry.userId)}
                                                {...webClick(() => revokeAccess(entry.userId))}
                                            >
                                                <Text style={localStyles.revokeText}>Revoke</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                    ) : null}

                    {!canManageUsers && myAccessEntry ? (
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Your Device Access</Text>
                            <Text style={styles.rowSubtitle}>Device ID: {deviceId}</Text>
                            <Text style={[styles.rowSubtitle, { marginTop: 6 }]}>Role: {myAccessEntry.accessLevel.toUpperCase()}</Text>
                            <View style={[localStyles.chipsRow, { marginTop: 8 }]}>
                                {myAccessMethods.map((m) => (
                                    <Text key={`mine-${m}`} style={localStyles.methodChip}>{m}</Text>
                                ))}
                            </View>
                        </View>
                    ) : null}

                    {canManageUsers ? (
                        <View style={styles.card}>
                            <View style={localStyles.formHeaderRow}>
                                <Text style={styles.sectionTitle}>Access Management</Text>
                                {!showAccessForm ? (
                                    <TouchableOpacity
                                        style={localStyles.addPersonButton}
                                        onPress={openAddForm}
                                        {...webClick(openAddForm)}
                                    >
                                        <Text style={localStyles.addPersonButtonText}>Add Person</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>

                            {showAccessForm ? (
                                <>
                                    <Text style={[styles.rowSubtitle, { marginTop: 2 }]}>
                                        {editingUserId ? "Edit access" : "Add person by email"}
                                    </Text>

                                    {!editingUserId ? (
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>Email</Text>
                                            <TextInput
                                                value={formEmail}
                                                onChangeText={setFormEmail}
                                                placeholder="user@email.com"
                                                autoCapitalize="none"
                                                keyboardType="email-address"
                                                style={styles.input}
                                            />
                                        </View>
                                    ) : null}

                                    <View style={{ marginTop: 10 }}>
                                        <Text style={styles.inputLabel}>Role</Text>
                                        <View style={localStyles.inlineRow}>
                                            {(["owner", "guest"] as AccessLevel[]).map((role) => (
                                                <TouchableOpacity
                                                    key={role}
                                                    style={[localStyles.roleButton, formRole === role && localStyles.roleButtonActive]}
                                                    onPress={() => setFormRole(role)}
                                                    {...webClick(() => setFormRole(role))}
                                                >
                                                    <Text style={formRole === role ? localStyles.roleButtonTextActive : localStyles.roleButtonText}>{role}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    <View style={{ marginTop: 10 }}>
                                        <Text style={styles.inputLabel}>Access Methods</Text>
                                        <View style={localStyles.inlineRow}>
                                            {VALID_METHODS.map((method) => (
                                                <TouchableOpacity
                                                    key={method}
                                                    style={[localStyles.methodButton, formMethods.includes(method) && localStyles.methodButtonActive]}
                                                    onPress={() => toggleFormMethod(method)}
                                                    {...webClick(() => toggleFormMethod(method))}
                                                >
                                                    <Text style={formMethods.includes(method) ? localStyles.methodButtonTextActive : localStyles.methodButtonText}>
                                                        {METHOD_LABELS[method]}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    {accessError ? <Text style={localStyles.errorText}>{accessError}</Text> : null}

                                    <View style={localStyles.inlineRow}>
                                        <TouchableOpacity
                                            style={[styles.button, styles.buttonPrimary, { flex: 1 }, savingAccess && { opacity: 0.7 }]}
                                            onPress={saveAccess}
                                            {...webClick(saveAccess)}
                                            disabled={savingAccess}
                                        >
                                            {savingAccess ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <Text style={[styles.buttonText, styles.buttonPrimaryText]}>
                                                    {editingUserId ? "Save Changes" : "Grant Access"}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.button, styles.buttonGhost, { flex: 1 }]}
                                            onPress={() => resetForm(true)}
                                            {...webClick(() => resetForm(true))}
                                        >
                                            <Text style={styles.buttonGhostText}>Cancel</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            ) : null}
                        </View>
                    ) : null}

                    <View>
                        <Text style={styles.sectionTitle}>{canManageUsers ? "Device Access Methods" : "My Access Methods"}</Text>
                        <View style={[styles.card, styles.divide]}>
                            {(canManageUsers ? VALID_METHODS : myAccessMethods).map((method) => (
                                <View key={method} style={styles.settingToggleRow}>
                                    <Text style={styles.rowTitle}>{METHOD_LABELS[method]}</Text>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                        {method === "keypad" ? (
                                            <TouchableOpacity onPress={() => router.push("/settings/keypad-pin")}>
                                                <Text style={localStyles.editText}>{keypadHasCode ? "Change PIN" : "Set PIN"}</Text>
                                            </TouchableOpacity>
                                        ) : null}
                                        {method === "fingerprint" ? (
                                            <TouchableOpacity onPress={() => router.push("/settings/fingerprints")}>
                                                <Text style={localStyles.editText}>{fingerprintCount > 0 ? `Manage (${fingerprintCount})` : "Add"}</Text>
                                            </TouchableOpacity>
                                        ) : null}
                                        {method === "face" ? (
                                            <TouchableOpacity onPress={() => router.push("/settings/face-access")}>
                                                <Text style={localStyles.editText}>{faceHasEnrollment ? "Manage" : "Enroll"}</Text>
                                            </TouchableOpacity>
                                        ) : null}
                                        {togglingMethod === method ? (
                                            <ActivityIndicator size="small" color="#2563eb" />
                                        ) : canManageUsers ? (
                                            <Switch value={deviceMethods[method]} onValueChange={(v) => toggleDeviceMethod(method, v)} />
                                        ) : (
                                            <Text
                                                style={[
                                                    localStyles.methodStateChip,
                                                    credentials[method] ? localStyles.methodStateOn : localStyles.methodStateOff,
                                                ]}
                                            >
                                                {credentials[method] ? "ENROLLED" : "NOT ENROLLED"}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                </>
            )}
        </ScrollView>
    );
}

const localStyles = {
    deviceRow: {
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
    },
    deviceRowActive: {
        borderColor: "#2563eb",
        backgroundColor: "#eff6ff",
    },
    deviceRightWrap: {
        alignItems: "flex-end" as const,
        gap: 6,
    },
    deviceRoleChip: {
        fontSize: 11,
        fontWeight: "700" as const,
        borderRadius: 999,
        overflow: "hidden" as const,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    userRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    chipsRow: {
        flexDirection: "row" as const,
        flexWrap: "wrap" as const,
        gap: 6,
        marginTop: 6,
    },
    roleChip: {
        fontSize: 11,
        fontWeight: "700" as const,
        borderRadius: 6,
        overflow: "hidden" as const,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    ownerChip: {
        backgroundColor: "#dbeafe",
        color: "#1d4ed8",
    },
    guestChip: {
        backgroundColor: "#ecfeff",
        color: "#0e7490",
    },
    methodChip: {
        fontSize: 11,
        fontWeight: "600" as const,
        borderRadius: 6,
        overflow: "hidden" as const,
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: "#f3f4f6",
        color: "#374151",
    },
    actionsCol: {
        gap: 10,
        alignItems: "flex-end" as const,
    },
    editText: {
        color: "#2563eb",
        fontWeight: "700" as const,
        fontSize: 12,
    },
    revokeText: {
        color: "#ef4444",
        fontWeight: "700" as const,
        fontSize: 12,
    },
    inlineRow: {
        flexDirection: "row" as const,
        gap: 8,
        marginTop: 8,
        flexWrap: "wrap" as const,
    },
    roleButton: {
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    roleButtonActive: {
        borderColor: "#2563eb",
        backgroundColor: "#eff6ff",
    },
    roleButtonText: {
        color: "#334155",
        fontWeight: "600" as const,
    },
    roleButtonTextActive: {
        color: "#1d4ed8",
        fontWeight: "700" as const,
    },
    methodButton: {
        borderWidth: 1,
        borderColor: "#cbd5e1",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    methodButtonActive: {
        borderColor: "#16a34a",
        backgroundColor: "#f0fdf4",
    },
    methodButtonText: {
        color: "#334155",
        fontSize: 12,
        fontWeight: "600" as const,
    },
    methodButtonTextActive: {
        color: "#15803d",
        fontSize: 12,
        fontWeight: "700" as const,
    },
    errorText: {
        marginTop: 8,
        color: "#b91c1c",
        fontSize: 13,
        fontWeight: "600" as const,
    },
    formHeaderRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
    },
    addPersonButton: {
        borderWidth: 1,
        borderColor: "#2563eb",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: "#eff6ff",
    },
    addPersonButtonText: {
        color: "#1d4ed8",
        fontSize: 12,
        fontWeight: "700" as const,
    },
    methodStateChip: {
        fontSize: 11,
        fontWeight: "700" as const,
        borderRadius: 999,
        overflow: "hidden" as const,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    methodStateOn: {
        color: "#166534",
        backgroundColor: "#dcfce7",
    },
    methodStateOff: {
        color: "#991b1b",
        backgroundColor: "#fee2e2",
    },
    emptyStateWrap: {
        alignItems: "center" as const,
        marginTop: 4,
    },
    emptyIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 999,
        backgroundColor: "#eff6ff",
        borderWidth: 1,
        borderColor: "#bfdbfe",
        alignItems: "center" as const,
        justifyContent: "center" as const,
        gap: 4,
    },
    emptyIconDot: {
        width: 10,
        height: 10,
        borderRadius: 999,
        backgroundColor: "#2563eb",
    },
    emptyIconLine: {
        width: 26,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#93c5fd",
    },
    emptyStateTitle: {
        textAlign: "center" as const,
        marginTop: 12,
    },
    emptyStateSubtitle: {
        textAlign: "center" as const,
        marginTop: 8,
        marginHorizontal: 8,
    },
    emptyStateActions: {
        marginTop: 16,
        alignItems: "center" as const,
    },
    emptyPrimaryButton: {
        minWidth: 200,
    },
};
