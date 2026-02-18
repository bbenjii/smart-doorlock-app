import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
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
  filters: {
    flexDirection: "row",
    columnGap: 8,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1.5,
  },
  filterPillActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#0ea5e9",
  },
  filterPillInactive: {
    backgroundColor: "#f1f5f9",
    borderColor: "#cbd5e1",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "700",
  },
  filterTextActive: {
    color: "#0369a1",
  },
  filterTextInactive: {
    color: "#64748b",
  },
  list: {
    rowGap: 12,
  },
  card: {
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#ffffff",
    shadowColor: "#0f172a",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardIconWrapper: {
    justifyContent: "flex-start",
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardIcon: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },
  cardContent: {
    flex: 1,
    rowGap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  cardDescription: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "500",
  },
  cardTimestamp: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "500",
  },
  alertBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  alertText: {
    color: "#991b1b",
    fontWeight: "700",
    fontSize: 11,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    gap: 8,
  },
  emptyTitle: {
    fontWeight: "800",
    color: "#0f172a",
    fontSize: 16,
  },
  emptySubtitle: {
    color: "#64748b",
    fontWeight: "500",
  },
});

export default styles;
