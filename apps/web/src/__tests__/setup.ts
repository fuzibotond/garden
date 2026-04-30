import "@testing-library/jest-dom"
import { afterAll, afterEach, beforeAll } from "vitest"
import { server } from "./mocks/server"

// ── MSW lifecycle ─────────────────────────────────────────────────────────────

beforeAll(() =>
  server.listen({
    // Fail fast on any request that has no matching handler so tests can't
    // silently rely on real network calls.
    onUnhandledRequest: "error",
  }),
)

afterEach(() => {
  // Restore default handlers after per-test overrides
  server.resetHandlers()
  // Clear auth tokens between tests
  localStorage.clear()
})

afterAll(() => server.close())

// ── Global test utilities ─────────────────────────────────────────────────────

/**
 * Suppress expected console.error noise in tests that deliberately trigger
 * React error boundaries or expected thrown errors.
 */
export function suppressConsoleError() {
  const spy = vi.spyOn(console, "error").mockImplementation(() => undefined)
  return () => spy.mockRestore()
}
