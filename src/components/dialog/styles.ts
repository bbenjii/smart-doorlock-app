import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 24,
    shadowColor: "#0f172a",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: "#64748b",
    fontWeight: "500",
  },
  body: {
    marginTop: 8,
  },
  actions: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "flex-end",
    columnGap: 12,
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  actionButtonPrimary: {
    borderColor: "#0ea5e9",
    backgroundColor: "#0ea5e9",
  },
  actionButtonDanger: {
    borderColor: "#ef4444",
    backgroundColor: "#ef4444",
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  actionTextOnPrimary: {
    color: "#ffffff",
  },
  closeButton: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  closeText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748b",
    lineHeight: 20,
  },
});

export default styles;
