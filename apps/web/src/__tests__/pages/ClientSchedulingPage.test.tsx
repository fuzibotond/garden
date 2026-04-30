import { describe, it, expect } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { server } from "../mocks/server"
import ClientSchedulingPage from "../../pages/scheduling/ClientSchedulingPage"
import { renderWithRouter } from "../utils/renderWithRouter"
import { CLIENT_TOKEN } from "../mocks/tokens"

const BASE = "http://localhost:5000"

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ClientSchedulingPage", () => {
  // ── Loading / data states ──────────────────────────────────────────────────

  it("shows a loading indicator while fetching schedules", () => {
    localStorage.setItem("accessToken", CLIENT_TOKEN)

    server.use(
      http.get(`${BASE}/api/client/scheduling/calendar`, async () => {
        await new Promise((r) => setTimeout(r, 200))
        return HttpResponse.json({ scheduledTasks: [], totalCount: 0, page: 1, pageSize: 200 })
      }),
    )

    renderWithRouter(<ClientSchedulingPage />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it("renders pending task names in the awaiting response section", async () => {
    localStorage.setItem("accessToken", CLIENT_TOKEN)

    renderWithRouter(<ClientSchedulingPage />)

    // "Mow Lawn" has Pending status — appears in "Awaiting your response" list
    await waitFor(() => {
      expect(screen.getByText("Mow Lawn")).toBeInTheDocument()
    })
  })

  it("shows a Pending status badge for actionable schedule entries", async () => {
    localStorage.setItem("accessToken", CLIENT_TOKEN)

    renderWithRouter(<ClientSchedulingPage />)

    await waitFor(() => {
      expect(screen.getByText("Pending")).toBeInTheDocument()
    })
  })

  it("hides the awaiting-response section when no schedules need action", async () => {
    localStorage.setItem("accessToken", CLIENT_TOKEN)

    server.use(
      http.get(`${BASE}/api/client/scheduling/calendar`, () =>
        HttpResponse.json({ scheduledTasks: [], totalCount: 0, page: 1, pageSize: 200 }),
      ),
    )

    renderWithRouter(<ClientSchedulingPage />)

    // No "Awaiting your response" heading when there's nothing to act on
    await waitFor(() => {
      expect(screen.queryByText(/awaiting your response/i)).not.toBeInTheDocument()
    })
  })

  it("shows an error message when the API fails", async () => {
    localStorage.setItem("accessToken", CLIENT_TOKEN)

    server.use(
      http.get(`${BASE}/api/client/scheduling/calendar`, () =>
        HttpResponse.json({ message: "Service unavailable" }, { status: 503 }),
      ),
    )

    renderWithRouter(<ClientSchedulingPage />)

    await waitFor(() => {
      expect(screen.getByText(/service unavailable/i)).toBeInTheDocument()
    })
  })

  it("does not fetch when no token is stored", () => {
    // No token — page should bail and show Unauthorized, not a loading state
    renderWithRouter(<ClientSchedulingPage />)

    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })

  // ── Approve action ─────────────────────────────────────────────────────────

  it("opens the approve modal when Approve is clicked on a Pending schedule", async () => {
    localStorage.setItem("accessToken", CLIENT_TOKEN)

    const user = userEvent.setup()
    renderWithRouter(<ClientSchedulingPage />)

    await waitFor(() => {
      expect(screen.getByText("Mow Lawn")).toBeInTheDocument()
    })

    const approveButtons = screen.getAllByRole("button", { name: /^approve$/i })
    await user.click(approveButtons[0])

    // Modal should appear with title "Approve Schedule" and a Confirm button
    expect(screen.getByText("Approve Schedule")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument()
  })

  it("calls the approve endpoint and reloads data on confirmation", async () => {
    localStorage.setItem("accessToken", CLIENT_TOKEN)

    let approveCallCount = 0
    server.use(
      http.post(`${BASE}/api/client/scheduling/approve-schedule`, () => {
        approveCallCount++
        return new HttpResponse(null, { status: 204 })
      }),
    )

    const user = userEvent.setup()
    renderWithRouter(<ClientSchedulingPage />)

    await waitFor(() => {
      expect(screen.getByText("Mow Lawn")).toBeInTheDocument()
    })

    const approveButtons = screen.getAllByRole("button", { name: /^approve$/i })
    await user.click(approveButtons[0])

    const confirmButton = screen.getByRole("button", { name: /confirm/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(approveCallCount).toBe(1)
    })
  })

  // ── Decline action ─────────────────────────────────────────────────────────

  it("opens the decline modal when Decline is clicked", async () => {
    localStorage.setItem("accessToken", CLIENT_TOKEN)

    const user = userEvent.setup()
    renderWithRouter(<ClientSchedulingPage />)

    await waitFor(() => {
      expect(screen.getByText("Mow Lawn")).toBeInTheDocument()
    })

    const declineButtons = screen.getAllByRole("button", { name: /decline/i })
    await user.click(declineButtons[0])

    expect(screen.getByText("Decline Schedule")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument()
  })

  // ── Propose alternative time action ───────────────────────────────────────

  it("opens the propose alternative modal when Propose is clicked", async () => {
    localStorage.setItem("accessToken", CLIENT_TOKEN)

    const user = userEvent.setup()
    renderWithRouter(<ClientSchedulingPage />)

    await waitFor(() => {
      expect(screen.getByText("Mow Lawn")).toBeInTheDocument()
    })

    const proposeButtons = screen.getAllByRole("button", { name: /propose time/i })
    await user.click(proposeButtons[0])

    expect(screen.getByText("Propose Alternative Time")).toBeInTheDocument()
    // datetime-local input is in the modal
    expect(document.querySelector("input[type='datetime-local']")).toBeInTheDocument()
  })

  it("shows an error in the modal when the approve API call fails", async () => {
    localStorage.setItem("accessToken", CLIENT_TOKEN)

    server.use(
      http.post(`${BASE}/api/client/scheduling/approve-schedule`, () =>
        HttpResponse.json({ message: "Conflict" }, { status: 409 }),
      ),
    )

    const user = userEvent.setup()
    renderWithRouter(<ClientSchedulingPage />)

    await waitFor(() => {
      expect(screen.getByText("Mow Lawn")).toBeInTheDocument()
    })

    const approveButtons = screen.getAllByRole("button", { name: /^approve$/i })
    await user.click(approveButtons[0])

    const confirmButton = screen.getByRole("button", { name: /confirm/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(screen.getByText(/conflict/i)).toBeInTheDocument()
    })
  })
})
