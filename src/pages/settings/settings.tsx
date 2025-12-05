import React, {ReactNode, useState, useContext, useEffect} from "react";
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import styles from "./styles";
import {AppContext} from "@/src/context/app-context";
import {useFocusEffect} from "@react-navigation/native";

export default function Settings() {
    const [notifications, setNotifications] = useState(true);
    const [motionDetection, setMotionDetection] = useState(true);
    const [faceRecognition, setFaceRecognition] = useState(true);
    const [cloudStorage, setCloudStorage] = useState(false);
    const {user, deviceId, signout} = useContext(AppContext);
    
    useFocusEffect(() => {
        console.log("user", user);
    })
    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Settings</Text>
                <Text style={styles.subtitle}>Manage your security system</Text>
            </View>
            {
                user !== null ? <View>
                        {/* Profile */}
                        <View style={styles.card}>
                            <View style={styles.profileRow}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>JD</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.profileName}>{`${user?.firstName} ${user?.lastName}`}</Text>
                                    <Text style={styles.profileEmail}>{`${user?.email}`}</Text>
                                </View>
                                <Text style={styles.chevronText}>›</Text>
                            </View>
                        </View>

                        {/* Quick settings */}
                        <View>
                            <Text style={styles.sectionTitle}>Quick Settings</Text>
                            <View style={[styles.card, styles.divide]}>
                                <SettingToggle
                                    icon={<CircleIcon label="N" color="#2563eb" />}
                                    title="Notifications"
                                    subtitle="Push alerts for events"
                                    value={notifications}
                                    onValueChange={setNotifications}
                                />
                                <SettingToggle
                                    icon={<CircleIcon label="M" color="#22c55e" />}
                                    title="Motion Detection"
                                    subtitle="Alert on movement"
                                    value={motionDetection}
                                    onValueChange={setMotionDetection}
                                />
                                <SettingToggle
                                    icon={<CircleIcon label="F" color="#f97316" />}
                                    title="Face Recognition"
                                    subtitle="Auto-unlock for known faces"
                                    value={faceRecognition}
                                    onValueChange={setFaceRecognition}
                                />
                            </View>
                        </View>

                        {/* Storage */}
                        <View>
                            <Text style={styles.sectionTitle}>Storage</Text>
                            <View style={styles.card}>
                                <View style={styles.rowBetween}>
                                    <View style={styles.rowCenter}>
                                        <CircleIcon label="L" color="#6366f1" />
                                        <View>
                                            <Text style={styles.rowTitle}>Local Storage</Text>
                                            <Text style={styles.rowSubtitle}>28.5 GB of 64 GB used</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.badge, styles.badgeOutline]}>Free</Text>
                                </View>
                                <View style={styles.progressTrack}>
                                    <View style={[styles.progressFill, { width: "45%" }]} />
                                </View>

                                <View style={[styles.rowBetween, styles.sectionSpacing]}>
                                    <View style={styles.rowCenter}>
                                        <CircleIcon label="C" color="#0ea5e9" />
                                        <View>
                                            <Text style={styles.rowTitle}>Cloud Storage</Text>
                                            <Text style={styles.rowSubtitle}>Backup to cloud</Text>
                                        </View>
                                    </View>
                                    <Switch value={cloudStorage} onValueChange={setCloudStorage} />
                                </View>
                                {!cloudStorage && (
                                    <TouchableOpacity style={[styles.button, styles.buttonOutline]}>
                                        <Text style={[styles.buttonText, styles.buttonOutlineText]}>Upgrade to Premium</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* System */}
                        <View>
                            <Text style={styles.sectionTitle}>System</Text>
                            <View style={[styles.card, styles.divide]}>
                                <SettingLink icon={<CircleIcon label="U" color="#2563eb" />} title="Manage Users" subtitle="2 users with access" />
                                <SettingLink
                                    icon={<CircleIcon label="B" color="#22c55e" />}
                                    title="Bluetooth Devices"
                                    subtitle="3 paired devices"
                                />
                                <SettingLink
                                    icon={<CircleIcon label="V" color="#f97316" />}
                                    title="Camera Settings"
                                    subtitle="Video quality & recording"
                                />
                                <SettingLink
                                    icon={<CircleIcon label="W" color="#0ea5e9" />}
                                    title="Network Settings"
                                    subtitle="Wi-Fi & connectivity"
                                    rightContent={<Text style={[styles.badge, styles.badgeSolid]}>Connected</Text>}
                                />
                                <SettingLink
                                    icon={<CircleIcon label="S" color="#475569" />}
                                    title="Security & Privacy"
                                    subtitle="Access logs & permissions"
                                />
                            </View>
                        </View>

                        {/* System info */}
                        <View style={[styles.card, styles.systemInfo]}>
                            <InfoRow label="Firmware Version" value="v2.4.1" />
                            <InfoRow label="Device Model" value="SmartLock Pro" />
                            <InfoRow label="Last Update" value="Oct 15, 2025" />
                        </View>

                        <TouchableOpacity style={[styles.button, styles.buttonGhost]} onPress={signout} activeOpacity={0.7}>
                            <Text style={styles.buttonGhostText}>Sign Out</Text>
                        </TouchableOpacity>
                    </View> :
                    <SigninForm />
            }

            
        </ScrollView>
    );
}

const SigninForm = () => {
    const [email, setEmail] = useState("benji.ollomo@gmail.com");
    const [password, setPassword] = useState("admin");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const {signin, signup} = useContext(AppContext);
    
    const handleSubmit = async () => {
        setError(null);
        setSubmitting(true);
        try {
            if (mode === "login") {
                await signin(email, password);
            } else {
                await signup({ email, password, firstName, lastName });
            }
        } catch (err: any) {
            setError(err?.message || "Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };
    
    const toggleMode = () => {
        setMode((prev) => (prev === "login" ? "signup" : "login"));
        setError(null);
    };
    return (
        <View style={styles.card}>
            <Text style={styles.sectionTitle}>{mode === "login" ? "Sign In" : "Create Account"}</Text>
            {mode === "signup" && (
                <>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>First name</Text>
                        <TextInput
                            style={styles.input}
                            value={firstName}
                            onChangeText={setFirstName}
                            // placeholder="Jane"
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Last name</Text>
                        <TextInput
                            style={styles.input}
                            value={lastName}
                            onChangeText={setLastName}
                            // placeholder="Doe"
                        />
                    </View>
                </>
            )}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    // placeholder="you@example.com"
                    // keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="emailAddress"
                />
            </View>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    secureTextEntry
                    textContentType="password"
                />
            </View>
            {error && <Text style={{ color: "#dc2626", fontWeight: "600" }}>{error}</Text>}
            <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={handleSubmit} disabled={submitting}>
                <Text style={[styles.buttonText, styles.buttonPrimaryText]}>
                    {submitting ? "Please wait..." : mode === "login" ? "Sign In" : "Sign Up"}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.buttonOutline]} onPress={toggleMode} disabled={submitting}>
                <Text style={[styles.buttonText, styles.buttonOutlineText]}>
                    {mode === "login" ? "Need an account? Sign Up" : "Have an account? Sign In"}
                </Text>
            </TouchableOpacity>
        </View>

    )
}


type SettingToggleProps = {
    icon: ReactNode;
    title: string;
    subtitle: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
};

const SettingToggle = ({ icon, title, subtitle, value, onValueChange }: SettingToggleProps) => (
    <View style={styles.rowBetween}>
        <View style={styles.rowCenter}>
            {icon}
            <View>
                <Text style={styles.rowTitle}>{title}</Text>
                <Text style={styles.rowSubtitle}>{subtitle}</Text>
            </View>
        </View>
        <Switch value={value} onValueChange={onValueChange} />
    </View>
);

type SettingLinkProps = {
    icon: ReactNode;
    title: string;
    subtitle: string;
    rightContent?: React.ReactNode;
};

const SettingLink = ({ icon, title, subtitle, rightContent }: SettingLinkProps) => (
    <TouchableOpacity activeOpacity={0.7} style={styles.linkRow}>
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


