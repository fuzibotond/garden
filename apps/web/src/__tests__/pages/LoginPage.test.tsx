import { describe, it, expect } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { Routes, Route } from "react-router-dom"
import { server } from "../mocks/server"
import LoginPage from "../../pages/login/LoginPage"
import { renderWithRouter } from "../utils/renderWithRouter"
import { ADMIN_TOKEN, GARDENER_TOKEN, CLIENT_TOKEN } from "../mocks/tokens"

const BASE = "http://localhost:5000"

// ── Helpers ───────────────────────────────────────────────────────────────────

function setup() {
  const user = userEvent.setup()

  // LoginPage calls navigate() after login, so we need surrounding routes
  const ui = (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<div>Admin Dashboard</div>} />
      <Route path="/admin/clients" element={<div>Gardener Clients</div>} />
      <Route path="/profile" element={<div>Profile Page</div>} />
    </Routes>
  )

  renderWithRouter(ui, { initialEntries: ["/login"] })
  return { user }
}

function emailInput() {
  // GlassInput renders an <input type="email"> with role "textbox"
  return screen.getByRole("textbox")
}

function passwordInput() {
  // type="password" has no implicit ARIA role – query by type
  return document.querySelector<HTMLInputElement>("input[type='password']")!
}

function submitButton() {
  return screen.getByRole("button", { name: /sign in/i })
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  email: string,
  password: string,
) {
  await user.type(emailInput(), email)
  await user.type(passwordInput(), password)
  await user.click(submitButton())
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("LoginPage", () => {
  it("renders email and password inputs", () => {
    setup()

    expect(emailInput()).toBeInTheDocument()
    expect(passwordInput()).toBeInTheDocument()
  })

  it("renders a sign-in submit button", () => {
    setup()

    expect(submitButton()).toBeInTheDocument()
  })

  it("navigates to /admin after Admin login", async () => {
    const { user } = setup()

    await fillAndSubmit(user, "admin@garden.test", "password")

    await waitFor(() => {
      expect(screen.getByText("Admin Dashboard")).toBeInTheDocument()
    })
    expect(localStorage.getItem("accessToken")).toBe(ADMIN_TOKEN)
  })

  it("navigates to /admin/clients after Gardener login", async () => {
    const { user } = setup()

    await fillAndSubmit(user, "gardener@garden.test", "password")

    await waitFor(() => {
      expect(screen.getByText("Gardener Clients")).toBeInTheDocument()
    })
    expect(localStorage.getItem("accessToken")).toBe(GARDENER_TOKEN)
  })

  it("navigates to /profile after Client login", async () => {
    const { user } = setup()

    await fillAndSubmit(user, "client@garden.test", "password")

    await waitFor(() => {
      expect(screen.getByText("Profile Page")).toBeInTheDocument()
    })
    expect(localStorage.getItem("accessToken")).toBe(CLIENT_TOKEN)
  })

  it("shows an error message when credentials are wrong", async () => {
    const { user } = setup()

    await fillAndSubmit(user, "wrong@example.com", "bad")

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
    expect(localStorage.getItem("accessToken")).toBeNull()
  })

  it("disables the button and shows loading text while the request is in-flight", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, async () => {
        await new Promise((r) => setTimeout(r, 80))
        return HttpResponse.json({ accessToken: ADMIN_TOKEN })
      }),
    )

    const { user } = setup()

    // Fire the submit but don't await the full navigation
    const submitPromise = fillAndSubmit(user, "admin@garden.test", "password")

    // Immediately inspect loading state
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled()
    })

    await submitPromise
    await waitFor(() => expect(screen.getByText("Admin Dashboard")).toBeInTheDocument())
  })

  it("shows an error from the backend JSON message field", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ message: "Account locked" }, { status: 403 }),
      ),
    )

    const { user } = setup()
    await fillAndSubmit(user, "locked@test.com", "password")

    await waitFor(() => {
      expect(screen.getByText(/account locked/i)).toBeInTheDocument()
    })
  })
})
