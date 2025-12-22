import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  map: { flex: 1, width: "100%" },

  icon: { width: 64, height: 64 },

  dropdown_main: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    zIndex: 10,
  },
  branchOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 9,
  },
  branchOverlayHandle: {
    position: "relative",
    minHeight: 48,
    marginBottom: 8,
    paddingHorizontal: 16,
    zIndex: 2,
  },
  branchOverlayHandleToggle: {
    position: "absolute",
    right: 16,
    top: 0,
    zIndex: 3,
  },
  branchOverlayHandleToggleOpen: {
    top: -96,
  },
  branchOverlayHandleIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  branchOverlayHandleIconOpen: {
    transform: [{ rotate: "180deg" }],
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 0,
    paddingRight: 56,
  },
  categoryIconBtn: {
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  categoryIcon: {
    width: 16,
    height: 16,
    resizeMode: "contain",
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  categoryLabelActive: {
    color: "white",
  },
  categoryIconBtnActive: {
    backgroundColor: "#EB8100",
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },

  searchField: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "white",
    borderRadius: 25,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#eee",
    marginHorizontal: 16,
    marginTop: 12,
    gap: 5,
    marginBottom: 15,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    color: "#111827",
    fontSize: 16,
  },
  card: {
    flex: 1,
    maxWidth: 260,
    marginRight: 12,
    backgroundColor: "white",
    borderRadius: 18,
    overflow: "hidden",
    zIndex: 2,

    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },

    elevation: 10,
  },

  row: {
    height: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  menu: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E6E6E6",
  },

  menuRow: {
    height: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E6E6E6",
    backgroundColor: "white",
  },

  rowIcon: { width: 18, height: 18 },

  rowTextBold: { flex: 1, fontWeight: "700" },
  rowText: { flex: 1, fontWeight: "500" },

  caret: { width: 16, height: 16, opacity: 0.7 },
  caretOpen: { transform: [{ rotate: "180deg" }] },

  plus: { width: 18, textAlign: "center", fontSize: 18, fontWeight: "600" },

  actionsRow: {
    flexDirection: "row",
    gap: 12,
    zIndex: 2,
  },

  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  container_2: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
    marginBottom: 20,
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
  },

  filter_main: {
    flex: 1,
    flexDirection: "column",
  },
  filterScrollContent: {
    paddingBottom: 24,
  },
  filter_header: {
    flexDirection: "row",
    height: 50,
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 0.2,
    borderColor: "#E5E7EB",
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  filter_categories: {
    flexDirection: "column",
    width: "100%",
    paddingBottom: 10,
  },
});
