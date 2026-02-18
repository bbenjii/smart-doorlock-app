import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 70,
    width: "100%",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 3,
  },
  navbarItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
    marginBottom: 6,
  },
  iconActive: {
    tintColor: "#0ea5e9",
  },
  iconInactive: {
    tintColor: "#94a3b8",
  },
  label: {
    textAlign: "center",
    fontSize: 11,
  },
  labelActive: {
    color: "#0f172a",
    fontWeight: "800",
  },
  labelInactive: {
    color: "#94a3b8",
    fontWeight: "600",
  },
});

export default styles;
