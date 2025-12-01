import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, View } from "react-native";
import Navbar from "../components/navbar/navbar";

export default function RootLayout() {
    return (
        <SafeAreaView style={styles.shell}>
            <View style={styles.body}>
                <Stack
                    screenOptions={{
                        headerShown: false,
                        animation: "fade",
                        animationDuration: 120,
                        contentStyle: styles.content,
                    }}
                >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="events" />
                    <Stack.Screen name="sensors" />
                    <Stack.Screen name="settings" />
                    <Stack.Screen name="(tabs)" />
                </Stack>
            </View>
            <Navbar />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    shell: {
        flex: 1,
        backgroundColor: "#fff",
    },
    body: {
        flex: 1,
        width: "100%",
        maxWidth: 700,
        marginHorizontal: "auto",
    },
    content: {
        backgroundColor: "rgba(255,255,255,0.92)",
    },
});
