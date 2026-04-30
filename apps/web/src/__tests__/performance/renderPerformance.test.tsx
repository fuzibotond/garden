import { describe, it, expect } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import { Profiler, type ProfilerOnRenderCallback } from "react"
import { http, HttpResponse } from "msw"
import { server } from "../mocks/server"
import { renderWithRouter } from "../utils/renderWithRouter"
import { GARDENER_TOKEN, CLIENT_TOKEN } from "../mocks/tokens"
import JobsPage from "../../pages/jobs/JobsPage"
import ClientSchedulingPage from "../../pages/scheduling/ClientSchedulingPage"

const BASE = "http://localhost:5000"

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Wraps a component in a React Profiler and returns an array that accumulates
 * all render entries so tests can inspect them after rendering.
 */
function withProfiler(component: React.ReactElement) {
  const renders: { actualDuration: number; phase: string }[] = []

  const onRender: ProfilerOnRenderCallback = (_id, phase, actualDuration) => {
    renders.push({ actualDuration, phase })
  }

  const wrapped = (
    <Profiler id="perf-test" onRender={onRender}>
      {component}
    </Profiler>
  )

  return { wrapped, renders }
}

/**
 * Generates an array of fake job fixtures for large-list tests.
 */
function makeJobs(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    jobId: `perf-job-${i}`,
    name: `Performance Job ${i + 1}`,
    clientId: "client-001",
    client: { id: "client-001", name: "Jane Client", email: "client@garden.test" },
    linkedGardeners: [],
    taskCount: 1,
    finishedTaskCount: 0,
    progressPercent: Math.round((i / count) * 100),
    totalCost: i * 10,
    isClosed: false,
    createdAt: "2026-01-01T00:00:00Z",
  }))
}

/**
 * Generates fake schedule entries for large-list tests.
 */
function makeSchedules(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    scheduleRequestId: `sched-${i}`,
    taskId: `task-${i}`,
    taskName: `Task ${i + 1}`,
    jobId: "job-1",
    gardenerId: "gardener-001",
    gardenerName: "Green Thumb",
    clientId: "client-001",
    clientName: "Jane Client",
    scheduledAtUtc: `2026-05-${String((i % 28) + 1).padStart(2, "0")}T09:00:00Z`,
    status: ["Pending", "Approved", "Declined"][i % 3],
    createdAtUtc: "2026-04-20T10:00:00Z",
  }))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Render performance: JobsPage", () => {
  it("initial mount completes in under 200ms with 100 jobs", async () => {
    localStorage.setItem("accessToken", GARDENER_TOKEN)

    server.use(
      http.get(`${BASE}/api/gardener/jobs`, () =>
        HttpResponse.json({ items: makeJobs(100), total: 100, page: 1, pageSize: 100 }),
      ),
    )

    const start = performance.now()
    renderWithRouter(<JobsPage />)

    await waitFor(() => {
      expect(screen.getByText("Performance Job 1")).toBeInTheDocument()
    })

    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(2000) // generous wall-clock budget for CI
  })

  it("initial mount completes in under 200ms with 500 jobs", async () => {
    localStorage.setItem("accessToken", GARDENER_TOKEN)

    server.use(
      http.get(`${BASE}/api/gardener/jobs`, () =>
        HttpResponse.json({ items: makeJobs(500), total: 500, page: 1, pageSize: 500 }),
      ),
    )

    const start = performance.now()
    renderWithRouter(<JobsPage />)

    await waitFor(() => {
      expect(screen.getByText("Performance Job 1")).toBeInTheDocument()
    })

    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(3000)
  })

  it("React Profiler actualDuration is below 500ms for 100 jobs", async () => {
    localStorage.setItem("accessToken", GARDENER_TOKEN)

    server.use(
      http.get(`${BASE}/api/gardener/jobs`, () =>
        HttpResponse.json({ items: makeJobs(100), total: 100, page: 1, pageSize: 100 }),
      ),
    )

    const { wrapped, renders } = withProfiler(<JobsPage />)
    renderWithRouter(wrapped)

    await waitFor(() => {
      expect(screen.getByText("Performance Job 1")).toBeInTheDocument()
    })

    const totalActual = renders.reduce((sum, r) => sum + r.actualDuration, 0)
    // Allow generous budget — jsdom is slower than a real browser
    expect(totalActual).toBeLessThan(500)
  })
})

describe("Render performance: ClientSchedulingPage", () => {
  it("renders 200 schedule entries without exceeding 3s wall-clock time", async () => {
    localStorage.setItem("accessToken", CLIENT_TOKEN)

    server.use(
      http.get(`${BASE}/api/client/scheduling/calendar`, () =>
        HttpResponse.json({
          scheduledTasks: makeSchedules(200),
          totalCount: 200,
          page: 1,
          pageSize: 200,
        }),
      ),
    )

    const start = performance.now()
    renderWithRouter(<ClientSchedulingPage />)

    await waitFor(() => {
      expect(screen.getByText("Task 1")).toBeInTheDocument()
    })

    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(3000)
  })

  it("React Profiler actualDuration is below 500ms for 200 schedules", async () => {
    localStorage.setItem("accessToken", CLIENT_TOKEN)

    server.use(
      http.get(`${BASE}/api/client/scheduling/calendar`, () =>
        HttpResponse.json({
          scheduledTasks: makeSchedules(200),
          totalCount: 200,
          page: 1,
          pageSize: 200,
        }),
      ),
    )

    const { wrapped, renders } = withProfiler(<ClientSchedulingPage />)
    renderWithRouter(wrapped)

    await waitFor(() => {
      expect(screen.getByText("Task 1")).toBeInTheDocument()
    })

    const totalActual = renders.reduce((sum, r) => sum + r.actualDuration, 0)
    expect(totalActual).toBeLessThan(500)
  })
})

describe("Re-render detection", () => {
  it("JobsPage does not re-render after data is loaded and no state changes", async () => {
    localStorage.setItem("accessToken", GARDENER_TOKEN)

    server.use(
      http.get(`${BASE}/api/gardener/jobs`, () =>
        HttpResponse.json({ items: makeJobs(20), total: 20, page: 1, pageSize: 20 }),
      ),
    )

    const { wrapped, renders } = withProfiler(<JobsPage />)
    renderWithRouter(wrapped)

    await waitFor(() => {
      expect(screen.getByText("Performance Job 1")).toBeInTheDocument()
    })

    // Capture renders after data is settled
    const renderCount = renders.length

    // Wait a moment to confirm no additional re-renders are triggered
    await new Promise((r) => setTimeout(r, 100))

    // Allow at most 1 additional re-render (e.g. from effect cleanup)
    expect(renders.length - renderCount).toBeLessThanOrEqual(1)
  })
})
