import React, { useCallback, useContext, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { AppContext } from "@/src/context/app-context";
import styles from "./styles";
import { useRouter } from "expo-router";

const FETCH_TIMEOUT = 8000;

function buildApiUrl(baseUrl: string, path: string): string {
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    return `${normalizedBase}${normalizedPath}`;
}

function isValidPin(value: string): boolean {
    return /^\d{4,8}$/.test(value);
}

export default function KeypadSettings() {
    const router = useRouter();
    const { authToken, apiBaseUrl } = useContext(AppContext);
    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const canSubmit = useMemo(() => {
        if (!authToken || !apiBaseUrl) return false;
        if (!isValidPin(pin)) return false;
        if (pin !== confirmPin) return false;
        return true;
    }, [authToken, apiBaseUrl, pin, confirmPin]);

    const savePin = useCallback(async () => {
        if (!canSubmit || !apiBaseUrl || !authToken) return;
        setSaving(true);
        setError(null);
        setMessage(null);

        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

            const response = await fetch(
                buildApiUrl(apiBaseUrl, "credentials/me/keypad-code"),
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({
                        code: pin,
                        confirmCode: confirmPin,
                    }),
                    signal: controller.signal,
                },
            );
            clearTimeout(timer);

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                if (response.status === 404 || response.status === 405) {
                    throw new Error("Backend does not support keypad PIN endpoint yet. Deploy latest server.");
                }
                throw new Error(body?.detail || "Failed to update keypad code");
            }

            router.replace("/settings/manage-users");
        } catch (e: any) {
            if (e?.name === "AbortError") {
                setError("Server unreachable");
            } else {
                setError(e?.message || "Failed to update keypad code");
            }
        } finally {
            setSaving(false);
        }
    }, [apiBaseUrl, authToken, canSubmit, pin, confirmPin]);

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Keypad PIN</Text>
                <Text style={styles.subtitle}>Set a secure keypad code (4 to 8 digits)</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.rowTitle}>New PIN</Text>
                <TextInput
                    value={pin}
                    onChangeText={(v) => setPin(v.replace(/\D/g, ""))}
                    placeholder="Enter 4-8 digits"
                    keyboardType="number-pad"
                    secureTextEntry
                    style={styles.input}
                    maxLength={8}
                />

                <Text style={[styles.rowTitle, { marginTop: 8 }]}>Confirm PIN</Text>
                <TextInput
                    value={confirmPin}
                    onChangeText={(v) => setConfirmPin(v.replace(/\D/g, ""))}
                    placeholder="Re-enter PIN"
                    keyboardType="number-pad"
                    secureTextEntry
                    style={styles.input}
                    maxLength={8}
                />

                {!isValidPin(pin) && pin.length > 0 && (
                    <Text style={{ color: "#b91c1c", fontSize: 13 }}>PIN must be 4 to 8 digits.</Text>
                )}
                {confirmPin.length > 0 && pin !== confirmPin && (
                    <Text style={{ color: "#b91c1c", fontSize: 13 }}>PIN confirmation does not match.</Text>
                )}

                {error && <Text style={{ color: "#b91c1c", fontSize: 13 }}>{error}</Text>}
                {message && <Text style={{ color: "#166534", fontSize: 13 }}>{message}</Text>}

                <TouchableOpacity
                    onPress={savePin}
                    disabled={!canSubmit || saving}
                    style={[
                        styles.button,
                        styles.buttonPrimary,
                        (!canSubmit || saving) ? { opacity: 0.5 } : null,
                    ]}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={[styles.buttonText, styles.buttonPrimaryText]}>Save Keypad PIN</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
