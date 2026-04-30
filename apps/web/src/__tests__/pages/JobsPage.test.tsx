import { describe, it, expect } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { server } from "../mocks/server"
import JobsPage from "../../pages/jobs/JobsPage"
import { renderWithRouter } from "../utils/renderWithRouter"
import { ADMIN_TOKEN, GARDENER_TOKEN, CLIENT_TOKEN } from "../mocks/tokens"
import { FIXTURE_JOBS } from "../mocks/handlers"

const BASE = "http://localhost:5000"

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("JobsPage", () => {
  // ── Loading / data states ──────────────────────────────────────────────────

  it("shows a loading indicator on initial render", () => {
    localStorage.setItem("accessToken", GARDENER_TOKEN)

    server.use(
      http.get(`${BASE}/api/gardener/jobs`, async () => {
        await new Promise((r) => setTimeout(r, 200))
        return HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 10 })
      }),
    )

    renderWithRouter(<JobsPage />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it("renders the list of jobs for a Gardener", async () => {
    localStorage.setItem("accessToken", GARDENER_TOKEN)

    renderWithRouter(<JobsPage />)

    await waitFor(() => {
      // "Spring Cleanup" is open; "Hedge Trimming" is closed and hidden by default
      expect(screen.getByText("Spring Cleanup")).toBeInTheDocument()
    })
  })

  it("renders the list of jobs for a Client", async () => {
    localStorage.setItem("accessToken", CLIENT_TOKEN)

    renderWithRouter(<JobsPage />)

    await waitFor(() => {
      expect(screen.getByText("Spring Cleanup")).toBeInTheDocument()
    })
  })

  it("shows an empty-state message when there are no jobs", async () => {
    localStorage.setItem("accessToken", GARDENER_TOKEN)

    server.use(
      http.get(`${BASE}/api/gardener/jobs`, () =>
        HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 10 }),
      ),
    )

    renderWithRouter(<JobsPage />)

    await waitFor(() => {
      expect(screen.getByText(/no jobs/i)).toBeInTheDocument()
    })
  })

  it("shows an error banner when the API call fails", async () => {
    localStorage.setItem("accessToken", GARDENER_TOKEN)

    server.use(
      http.get(`${BASE}/api/gardener/jobs`, () =>
        HttpResponse.json({ message: "Database error" }, { status: 500 }),
      ),
    )

    renderWithRouter(<JobsPage />)

    await waitFor(() => {
      expect(screen.getByText(/database error/i)).toBeInTheDocument()
    })
  })

  // ── Role-based UI differences ──────────────────────────────────────────────

  it("shows an Add job button for Gardeners", async () => {
    localStorage.setItem("accessToken", GARDENER_TOKEN)

    renderWithRouter(<JobsPage />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add job/i })).toBeInTheDocument()
    })
  })

  it("does NOT show an Add job button for Clients", async () => {
    localStorage.setItem("accessToken", CLIENT_TOKEN)

    renderWithRouter(<JobsPage />)

    await waitFor(() => {
      // wait for the data to load first
      expect(screen.getByText("Spring Cleanup")).toBeInTheDocument()
    })

    expect(screen.queryByRole("button", { name: /add job/i })).not.toBeInTheDocument()
  })

  // ── Admin sees all jobs from the gardener endpoint ─────────────────────────

  it("renders jobs for an Admin user", async () => {
    localStorage.setItem("accessToken", ADMIN_TOKEN)

    renderWithRouter(<JobsPage />)

    await waitFor(() => {
      expect(screen.getByText("Spring Cleanup")).toBeInTheDocument()
    })
  })

  // ── Large list ─────────────────────────────────────────────────────────────

  it("renders 100 jobs without crashing", async () => {
    localStorage.setItem("accessToken", GARDENER_TOKEN)

    const manyJobs = Array.from({ length: 100 }, (_, i) => ({
      jobId: `job-${i}`,
      name: `Job ${i + 1}`,
      clientId: "client-001",
      client: { id: "client-001", name: "Jane Client", email: "client@garden.test" },
      linkedGardeners: [],
      taskCount: 1,
      finishedTaskCount: 0,
      progressPercent: 0,
      totalCost: 100,
      isClosed: false,
      createdAt: "2026-01-01T00:00:00Z",
    }))

    server.use(
      http.get(`${BASE}/api/gardener/jobs`, () =>
        HttpResponse.json({ items: manyJobs, total: 100, page: 1, pageSize: 100 }),
      ),
    )

    renderWithRouter(<JobsPage />)

    await waitFor(() => {
      // Spot-check a few items
      expect(screen.getByText("Job 1")).toBeInTheDocument()
      expect(screen.getByText("Job 50")).toBeInTheDocument()
    })
  })

  // ── Pagination ─────────────────────────────────────────────────────────────

  it("shows pagination controls when there are multiple pages", async () => {
    localStorage.setItem("accessToken", GARDENER_TOKEN)

    server.use(
      http.get(`${BASE}/api/gardener/jobs`, ({ request }) => {
        const url = new URL(request.url)
        const pageSize = Number(url.searchParams.get("pageSize") ?? 10)
        return HttpResponse.json({
          items: FIXTURE_JOBS.slice(0, pageSize),
          total: 25,
          page: 1,
          pageSize,
        })
      }),
    )

    renderWithRouter(<JobsPage />)

    await waitFor(() => {
      // Check for previous/next pagination controls
      expect(
        screen.getByRole("button", { name: /next|›|→/i }) ||
        screen.getByText(/page|of \d/i),
      ).toBeInTheDocument()
    })
  })
})
