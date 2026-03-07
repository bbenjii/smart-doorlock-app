import { StyleSheet, View } from "react-native";
import NotificationsSettings from "@/src/pages/settings/notifications";

export default function NotificationsScreen() {
    return (
        <View style={styles.screen}>
            <NotificationsSettings />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
});
