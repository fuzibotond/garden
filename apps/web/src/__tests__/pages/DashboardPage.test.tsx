import { describe, it, expect } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { server } from "../mocks/server"
import DashboardPage from "../../pages/dashboard/DashboardPage"
import { renderWithRouter } from "../utils/renderWithRouter"
import { ADMIN_TOKEN, GARDENER_TOKEN } from "../mocks/tokens"

const BASE = "http://localhost:5000"

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DashboardPage", () => {
  it("shows a loading indicator on initial render", () => {
    localStorage.setItem("accessToken", ADMIN_TOKEN)

    // Hold the response so we see the loading state
    server.use(
      http.get(`${BASE}/api/admin/gardeners/total`, async () => {
        await new Promise((r) => setTimeout(r, 100))
        return HttpResponse.json({ numItems: 5 })
      }),
    )

    renderWithRouter(<DashboardPage />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it("renders Admin stats — Total Gardeners and Total Clients", async () => {
    localStorage.setItem("accessToken", ADMIN_TOKEN)

    renderWithRouter(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText("Total Gardeners")).toBeInTheDocument()
      expect(screen.getByText("Total Clients")).toBeInTheDocument()
    })

    expect(screen.getByText("5")).toBeInTheDocument() // gardeners
    expect(screen.getByText("42")).toBeInTheDocument() // clients
  })

  it("renders Gardener stats — only Total Clients", async () => {
    localStorage.setItem("accessToken", GARDENER_TOKEN)

    renderWithRouter(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText("Total Clients")).toBeInTheDocument()
    })

    expect(screen.getByText("8")).toBeInTheDocument()
    expect(screen.queryByText("Total Gardeners")).not.toBeInTheDocument()
  })

  it("shows an error message when the API fails", async () => {
    localStorage.setItem("accessToken", ADMIN_TOKEN)

    server.use(
      http.get(`${BASE}/api/admin/gardeners/total`, () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
      ),
    )

    renderWithRouter(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/internal server error/i)).toBeInTheDocument()
    })
  })

  it("does not fetch data when no token is stored", () => {
    // No token in localStorage — component should bail out immediately
    renderWithRouter(<DashboardPage />)

    // Should not render stats or errors — just the empty layout
    expect(screen.queryByText("Total Gardeners")).not.toBeInTheDocument()
    expect(screen.queryByText("Total Clients")).not.toBeInTheDocument()
  })
})
