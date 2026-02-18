import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 96,
    gap: 16,
  },
  header: {
    borderBottomWidth: 0,
    paddingBottom: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    marginTop: 6,
    color: "#64748b",
    fontSize: 15,
    fontWeight: "500",
  },
  list: {
    rowGap: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#ffffff",
    gap: 10,
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  iconTitle: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  iconBadgeActive: {
    backgroundColor: "rgba(14, 165, 233, 0.15)",
  },
  iconBadgeInactive: {
    backgroundColor: "#f1f5f9",
  },
  icon: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  cardLocation: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "500",
  },
  metaGroup: {
    gap: 6,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaSpacing: {
    paddingTop: 2,
  },
  metaLabel: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "500",
  },
  metaValue: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    fontSize: 12,
    overflow: "hidden",
  },
  badgeActive: {
    backgroundColor: "#cffafe",
    color: "#0c4a6e",
    fontWeight: "700",
  },
  badgeMuted: {
    backgroundColor: "#f1f5f9",
    color: "#475569",
    fontWeight: "700",
  },
  badgeOutline: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    color: "#0f172a",
    backgroundColor: "#ffffff",
    fontWeight: "700",
  },
  progressTrack: {
    height: 7,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10b981",
    borderRadius: 8,
  },
  progressLow: {
    backgroundColor: "#ef4444",
  },
  destructiveText: {
    color: "#991b1b",
  },
  summary: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  summaryCard: {
    flex: 1,
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "#e2e8f0",
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  summaryLabel: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
});

export default styles;
