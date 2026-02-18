import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 50,
  },
  toast: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    backgroundColor: "#ffffff",
  },
  accent: {
    width: 4,
    borderRadius: 999,
    marginRight: 12,
  },
  body: {
    flex: 1,
    flexDirection: "row",
    columnGap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    backgroundColor: "#ffffff",
  },
  icon: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 4,
  },
  textGroup: {
    flex: 1,
    rowGap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    color: "#64748b",
    fontWeight: "500",
  },
  closeButton: {
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignSelf: "center",
  },
  closeText: {
    fontSize: 16,
    color: "#cbd5e1",
    fontWeight: "700",
    lineHeight: 18,
  },
});

export default styles;
