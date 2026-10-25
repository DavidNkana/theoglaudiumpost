import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Mock the feature modules so importing the root store does not pull in their
 * real collaborators (API services, etc.). Each is a minimal namespaced Vuex
 * module so `createStore` registers them without side effects. The object
 * literal is inlined in each factory because `vi.mock` is hoisted above any
 * module-scope variable declarations.
 */
vi.mock("./modules/articles", () => ({
  default: { namespaced: true, state: () => ({}), getters: {}, mutations: {}, actions: {} },
}));
vi.mock("./modules/notices", () => ({
  default: { namespaced: true, state: () => ({}), getters: {}, mutations: {}, actions: {} },
}));
vi.mock("./modules/tags", () => ({
  default: { namespaced: true, state: () => ({}), getters: {}, mutations: {}, actions: {} },
}));
vi.mock("./modules/youtube", () => ({
  default: { namespaced: true, state: () => ({}), getters: {}, mutations: {}, actions: {} },
}));

import store from "./index";

describe("store/index.js (root Vuex store)", () => {
  beforeEach(() => {
    // Reset global drawer state and body classes before each test.
    store.replaceState({ ...store.state, drawerOpen: false });
    document.body.classList.remove("drawer-open");
  });

  describe("initial state", () => {
    it("exposes drawerOpen=false from the state() factory", () => {
      expect(store.state.drawerOpen).toBe(false);
    });
  });

  describe("registered feature modules", () => {
    it("registers articles, notices, tags and youtube modules", () => {
      expect(store.hasModule("articles")).toBe(true);
      expect(store.hasModule("notices")).toBe(true);
      expect(store.hasModule("tags")).toBe(true);
      expect(store.hasModule("youtube")).toBe(true);
    });
  });

  describe("openDrawer mutation", () => {
    it("sets drawerOpen=true and adds the drawer-open body class", () => {
      expect(document.body.classList.contains("drawer-open")).toBe(false);

      store.commit("openDrawer");

      expect(store.state.drawerOpen).toBe(true);
      expect(document.body.classList.contains("drawer-open")).toBe(true);
    });
  });

  describe("closeDrawer mutation", () => {
    it("sets drawerOpen=false and removes the drawer-open body class", () => {
      // Arrange: open it first so we can observe the removal.
      store.commit("openDrawer");
      expect(store.state.drawerOpen).toBe(true);
      expect(document.body.classList.contains("drawer-open")).toBe(true);

      store.commit("closeDrawer");

      expect(store.state.drawerOpen).toBe(false);
      expect(document.body.classList.contains("drawer-open")).toBe(false);
    });
  });

  describe("toggleDrawer action", () => {
    it("opens the drawer when it is currently closed (else branch)", () => {
      expect(store.state.drawerOpen).toBe(false);

      store.dispatch("toggleDrawer");

      // Took the else branch -> committed openDrawer, observable via state + body class.
      expect(store.state.drawerOpen).toBe(true);
      expect(document.body.classList.contains("drawer-open")).toBe(true);
    });

    it("closes the drawer when it is currently open (if branch)", () => {
      // Arrange: open the drawer first so the if branch is taken.
      store.commit("openDrawer");
      expect(store.state.drawerOpen).toBe(true);
      expect(document.body.classList.contains("drawer-open")).toBe(true);

      store.dispatch("toggleDrawer");

      // Took the if branch -> committed closeDrawer, observable via state + body class.
      expect(store.state.drawerOpen).toBe(false);
      expect(document.body.classList.contains("drawer-open")).toBe(false);
    });

    it("toggles back and forth across successive dispatches", () => {
      store.dispatch("toggleDrawer"); // closed -> open
      expect(store.state.drawerOpen).toBe(true);

      store.dispatch("toggleDrawer"); // open -> closed
      expect(store.state.drawerOpen).toBe(false);
    });
  });
});
