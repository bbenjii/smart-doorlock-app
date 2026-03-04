import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#fff",
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 96,
        gap: 12,
    },
    header: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: "#e5e7eb",
        paddingBottom: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111827",
    },
    subtitle: {
        marginTop: 4,
        color: "#6b7280",
        fontSize: 14,
    },

    // ─── Top-level tab bar (All | Events | Logs) ──────────────────
    tabBar: {
        flexDirection: "row",
        borderBottomWidth: 1.5,
        borderBottomColor: "#e5e7eb",
    },
    tabItem: {
        flex: 1,
        paddingVertical: 10,
        alignItems: "center",
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
        marginBottom: -1.5,
    },
    tabItemActive: {
        borderBottomColor: "#4f46e5",
    },
    tabText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6b7280",
    },
    tabTextActive: {
        color: "#4f46e5",
    },

    // ─── Sub-filter chips inside Events tab ───────────────────────
    subFilters: {
        flexDirection: "row",
        gap: 8,
    },
    subFilterPill: {
        flex: 1,
        paddingVertical: 7,
        borderRadius: 20,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        backgroundColor: "#f9fafb",
    },
    subFilterPillActive: {
        backgroundColor: "#ede9fe",
        borderColor: "#7c3aed",
    },
    subFilterText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#6b7280",
    },
    subFilterTextActive: {
        color: "#5b21b6",
    },

    // ─── Cards ────────────────────────────────────────────────────
    list: {
        rowGap: 12,
    },
    card: {
        flexDirection: "row",
        gap: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        padding: 14,
        backgroundColor: "#fff",
    },
    cardIconWrapper: {
        justifyContent: "flex-start",
    },
    iconBadge: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    cardIcon: {
        width: 20,
        height: 20,
        resizeMode: "contain",
    },
    cardContent: {
        flex: 1,
        rowGap: 4,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: "#111827",
        flex: 1,
        marginRight: 8,
    },
    cardDescription: {
        color: "#4b5563",
        fontSize: 13,
    },
    cardTimestamp: {
        color: "#9ca3af",
        fontSize: 12,
    },

    // ─── Badges ───────────────────────────────────────────────────
    alertBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: "#fee2e2",
    },
    alertText: {
        color: "#b91c1c",
        fontWeight: "700",
        fontSize: 11,
    },
    logBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: "#e0e7ff",
    },
    logText: {
        color: "#3730a3",
        fontWeight: "700",
        fontSize: 11,
    },

    // ─── Empty / loading state ────────────────────────────────────
    emptyState: {
        alignItems: "center",
        paddingVertical: 32,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        backgroundColor: "#f9fafb",
        gap: 4,
    },
    emptyTitle: {
        fontWeight: "700",
        color: "#111827",
    },
    emptySubtitle: {
        color: "#6b7280",
        fontSize: 13,
    },
});

export default styles;
