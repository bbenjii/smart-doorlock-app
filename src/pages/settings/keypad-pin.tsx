import React, { useCallback, useContext, useEffect, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

const webClick = (fn: () => void) => Platform.OS === "web" ? { onClick: fn } as any : {};
import { useRouter } from "expo-router";
import styles from "./styles";
import { AppContext } from "../../context/app-context";

export default function KeypadPinSettings() {
    const router = useRouter();
    const { authToken, apiBaseUrl } = useContext(AppContext);
    const BASE_URL = apiBaseUrl || "https://smart-doorlock-server-851342133148.europe-west1.run.app/";
    const [code, setCode] = useState("");
    const [confirmCode, setConfirmCode] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [keypadHasCode, setKeypadHasCode] = useState(false);

    const headers = useCallback(() => {
        const h: Record<string, string> = { "Content-Type": "application/json" };
        if (authToken) h["Authorization"] = `Bearer ${authToken}`;
        return h;
    }, [authToken]);

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
            setKeypadHasCode(methods.keypad?.data?.hasCode ?? false);
        } catch (e: any) {
            console.log("Keypad credential fetch error:", e);
        } finally {
            setLoading(false);
        }
    }, [authToken, headers]);

    useEffect(() => {
        fetchCredentials();
    }, [fetchCredentials]);

    const isPinValid = /^\d{4,8}$/.test(code) && code === confirmCode;

    const savePin = async () => {
        if (!isPinValid) return;

        setSubmitting(true);

        try {
            const response = await fetch(`${BASE_URL}credentials/me/keypad-code`, {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({
                    code,
                    confirmCode,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to save PIN");
            }

            router.replace("/settings/manage-users");
        } catch (e: any) {
            console.log("Keypad PIN save error:", e);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{keypadHasCode ? "Change Keypad PIN" : "Set Keypad PIN"}</Text>
                <Text style={styles.subtitle}>Create a secure 4-8 digit passcode for keypad unlock.</Text>
            </View>

            <View style={styles.card}>
                <TouchableOpacity onPress={() => router.replace("/settings/manage-users")} {...webClick(() => router.replace("/settings/manage-users"))} activeOpacity={0.7} style={localStyles.backButton}>
                    <Text style={localStyles.backButtonText}>‹ Back</Text>
                </TouchableOpacity>

                {loading ? (
                    <View style={localStyles.loadingWrap}>
                        <ActivityIndicator size="small" color="#2563eb" />
                        <Text style={[styles.rowSubtitle, { marginTop: 8 }]}>Loading keypad status...</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>New PIN</Text>
                            <TextInput
                                value={code}
                                onChangeText={setCode}
                                placeholder="Enter 4-8 digits"
                                keyboardType="number-pad"
                                secureTextEntry
                                maxLength={8}
                                style={styles.input}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Confirm PIN</Text>
                            <TextInput
                                value={confirmCode}
                                onChangeText={setConfirmCode}
                                placeholder="Re-enter PIN"
                                keyboardType="number-pad"
                                secureTextEntry
                                maxLength={8}
                                style={styles.input}
                            />
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.button,
                                styles.buttonPrimary,
                                (submitting || !isPinValid) && { opacity: 0.75 },
                            ]}
                            onPress={savePin}
                            disabled={submitting || !isPinValid}
                            activeOpacity={0.75}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={[styles.buttonPrimaryText, styles.buttonText]}>
                                    {keypadHasCode ? "Update PIN" : "Save PIN"}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.buttonGhost]}
                            onPress={() => router.replace("/settings/manage-users")}
                            {...webClick(() => router.replace("/settings/manage-users"))}
                            activeOpacity={0.75}
                        >
                            <Text style={[styles.buttonText, localStyles.cancelText]}>Cancel</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </ScrollView>
    );
}

const localStyles = {
    backButton: {
        alignSelf: "flex-start" as const,
    },
    backButtonText: {
        color: "#2563eb",
        fontWeight: "700" as const,
        fontSize: 14,
    },
    loadingWrap: {
        alignItems: "center" as const,
        paddingVertical: 16,
    },
    cancelText: {
        color: "#374151",
        fontWeight: "700" as const,
    },
};
