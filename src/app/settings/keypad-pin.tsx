import { StyleSheet, View } from "react-native";
import KeypadPinSettings from "@/src/pages/settings/keypad-pin";

export default function KeypadPinSettingsScreen() {
    return (
        <View style={styles.screen}>
            <KeypadPinSettings />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
});
