import { http, HttpResponse } from "msw"
import { ADMIN_TOKEN, GARDENER_TOKEN, CLIENT_TOKEN } from "./tokens"

const BASE = "http://localhost:5000"

// ── Fixture data ──────────────────────────────────────────────────────────────

export const FIXTURE_JOBS = [
  {
    jobId: "job-1",
    name: "Spring Cleanup",
    clientId: "client-001",
    client: { id: "client-001", name: "Jane Client", email: "client@garden.test" },
    linkedGardeners: [],
    taskCount: 3,
    finishedTaskCount: 1,
    progressPercent: 33,
    totalCost: 450.0,
    isClosed: false,
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    jobId: "job-2",
    name: "Hedge Trimming",
    clientId: "client-001",
    client: { id: "client-001", name: "Jane Client", email: "client@garden.test" },
    linkedGardeners: [],
    taskCount: 1,
    finishedTaskCount: 1,
    progressPercent: 100,
    totalCost: 120.0,
    isClosed: true,
    createdAt: "2026-02-01T08:00:00Z",
  },
]

export const FIXTURE_SCHEDULES = [
  {
    scheduleRequestId: "sched-1",
    taskId: "task-1",
    taskName: "Mow Lawn",
    jobId: "job-1",
    gardenerId: "gardener-001",
    gardenerName: "Green Thumb",
    clientId: "client-001",
    clientName: "Jane Client",
    scheduledAtUtc: "2026-05-10T09:00:00Z",
    status: "Pending",
    createdAtUtc: "2026-04-20T10:00:00Z",
  },
  {
    scheduleRequestId: "sched-2",
    taskId: "task-2",
    taskName: "Prune Roses",
    jobId: "job-1",
    gardenerId: "gardener-001",
    gardenerName: "Green Thumb",
    clientId: "client-001",
    clientName: "Jane Client",
    scheduledAtUtc: "2026-05-12T14:00:00Z",
    status: "Approved",
    approvedAtUtc: "2026-04-21T11:00:00Z",
    createdAtUtc: "2026-04-20T10:00:00Z",
  },
]

// ── Handlers ──────────────────────────────────────────────────────────────────

export const handlers = [
  // Auth: Login
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }

    if (body.email === "admin@garden.test" && body.password === "password") {
      return HttpResponse.json({ accessToken: ADMIN_TOKEN })
    }
    if (body.email === "gardener@garden.test" && body.password === "password") {
      return HttpResponse.json({ accessToken: GARDENER_TOKEN })
    }
    if (body.email === "client@garden.test" && body.password === "password") {
      return HttpResponse.json({ accessToken: CLIENT_TOKEN })
    }

    return HttpResponse.json({ message: "Invalid credentials" }, { status: 401 })
  }),

  // Auth: Logout
  http.post(`${BASE}/auth/logout`, () => new HttpResponse(null, { status: 204 })),

  // Dashboard: Admin totals
  http.get(`${BASE}/api/admin/gardeners/total`, () =>
    HttpResponse.json({ numItems: 5 }),
  ),
  http.get(`${BASE}/api/admin/clients/total`, () =>
    HttpResponse.json({ numItems: 42 }),
  ),

  // Dashboard: Gardener totals
  http.get(`${BASE}/api/gardener/clients/total`, () =>
    HttpResponse.json({ numItems: 8 }),
  ),

  // Jobs: Gardener
  http.get(`${BASE}/api/gardener/jobs`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get("page") ?? 1)
    const pageSize = Number(url.searchParams.get("pageSize") ?? 20)
    const items = FIXTURE_JOBS.slice((page - 1) * pageSize, page * pageSize)
    return HttpResponse.json({ items, total: FIXTURE_JOBS.length, page, pageSize })
  }),

  // Jobs: Client
  http.get(`${BASE}/api/client/jobs`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get("page") ?? 1)
    const pageSize = Number(url.searchParams.get("pageSize") ?? 20)
    const items = FIXTURE_JOBS.slice((page - 1) * pageSize, page * pageSize)
    return HttpResponse.json({ items, total: FIXTURE_JOBS.length, page, pageSize })
  }),

  // Jobs: Admin clients for job creation form
  http.get(`${BASE}/api/admin/clients`, () =>
    HttpResponse.json({
      items: [{ clientId: "client-001", fullName: "Jane Client", email: "client@garden.test" }],
      total: 1,
      page: 1,
      pageSize: 20,
    }),
  ),

  // Jobs: Admin gardeners for job creation form
  http.get(`${BASE}/api/admin/gardeners`, () =>
    HttpResponse.json({
      items: [
        { gardenerId: "gardener-001", email: "gardener@garden.test", companyName: "Best Lawns Ltd" },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    }),
  ),

  // Gardener clients list (used in JobsPage for gardener role)
  http.get(`${BASE}/api/gardener/clients`, () =>
    HttpResponse.json({
      items: [{ clientId: "client-001", fullName: "Jane Client", email: "client@garden.test" }],
      total: 1,
      page: 1,
      pageSize: 20,
    }),
  ),

  // Client scheduling calendar
  http.get(`${BASE}/api/client/scheduling/calendar`, ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get("page") ?? 1)
    const pageSize = Number(url.searchParams.get("pageSize") ?? 200)
    return HttpResponse.json({
      scheduledTasks: FIXTURE_SCHEDULES,
      totalCount: FIXTURE_SCHEDULES.length,
      page,
      pageSize,
    })
  }),

  // Client scheduling: approve
  http.post(`${BASE}/api/client/scheduling/approve-schedule`, () =>
    new HttpResponse(null, { status: 204 }),
  ),

  // Client scheduling: decline
  http.post(`${BASE}/api/client/scheduling/decline-schedule`, () =>
    new HttpResponse(null, { status: 204 }),
  ),

  // Client scheduling: propose alternative
  http.post(`${BASE}/api/client/scheduling/propose-alternative-time`, () =>
    new HttpResponse(null, { status: 204 }),
  ),
]
