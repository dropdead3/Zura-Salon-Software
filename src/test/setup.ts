import "@testing-library/jest-dom";

// Guard for tests that opt into the `node` environment (e.g. lint smoke
// tests that shell out to ESLint). `window` does not exist there.
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
}
