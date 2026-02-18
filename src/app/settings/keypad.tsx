import { StyleSheet, View } from "react-native";
import KeypadSettings from "@/src/pages/settings/keypad";

export default function KeypadSettingsScreen() {
    return (
        <View style={styles.screen}>
            <KeypadSettings />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
});
