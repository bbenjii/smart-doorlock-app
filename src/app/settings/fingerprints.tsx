import { StyleSheet, View } from "react-native";
import FingerprintsSettings from "@/src/pages/settings/fingerprints";

export default function FingerprintsScreen() {
    return (
        <View style={styles.screen}>
            <FingerprintsSettings />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
});
