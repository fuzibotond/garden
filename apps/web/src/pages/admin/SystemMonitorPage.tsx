import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import AdminLayout from "../../components/layout/AdminLayout"
import { GlassButton, GlassCard } from "../../components/ui/GlassUI"
import { env } from "../../lib/env"
import { getAccessToken, parseClaimsFromToken } from "../../lib/auth"

type HealthState = "healthy" | "degraded" | "down" | "unknown"

type ServiceProbe = {
  key: string
  title: string
  url: string
  note: string
  state: HealthState
  statusCode?: number
  latencyMs?: number
  error?: string
  checkedAt?: string
}

type ProbeEvent = {
  at: string
  service: string
  outcome: string
  previousOutcome?: string
  jump?: string
}

type TraceItem = {
  at: string
  event: string
  detail: string
}

async function probeUrl(url: string): Promise<Pick<ServiceProbe, "state" | "statusCode" | "latencyMs" | "error" | "checkedAt">> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 5000)
  const startedAt = performance.now()

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })

    const latencyMs = Math.round(performance.now() - startedAt)
    const state: HealthState = response.ok ? "healthy" : response.status >= 500 ? "down" : "degraded"

    return {
      state,
      statusCode: response.status,
      latencyMs,
      checkedAt: new Date().toLocaleTimeString(),
    }
  } catch (error) {
    return {
      state: "down",
      error: error instanceof Error ? error.message : "Request failed",
      checkedAt: new Date().toLocaleTimeString(),
    }
  } finally {
    window.clearTimeout(timeout)
  }
}

function stateColor(state: HealthState) {
  if (state === "healthy") return "#86efac"
  if (state === "degraded") return "#facc15"
  if (state === "down") return "#fca5a5"
  return "#cbd5e1"
}

function stateLabel(state: HealthState) {
  if (state === "healthy") return "Healthy"
  if (state === "degraded") return "Degraded"
  if (state === "down") return "Down"
  return "Unknown"
}

function isJwtExpired(token: string): boolean {
  try {
    const [, payload] = token.split(".")
    if (!payload) {
      return false
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
    const raw = JSON.parse(atob(normalized)) as { exp?: number }
    if (typeof raw.exp !== "number") {
      return false
    }

    return Date.now() >= raw.exp * 1000
  } catch {
    return false
  }
}

export default function SystemMonitorPage() {
  const monitorBuildTag = "monitor-2026-04-26-02"
  const token = getAccessToken()
  const claims = useMemo(() => (token ? parseClaimsFromToken(token) : null), [token])
  const tokenExpired = useMemo(() => (token ? isJwtExpired(token) : false), [token])
  const [refreshing, setRefreshing] = useState(false)
  const [events, setEvents] = useState<ProbeEvent[]>([])
  const [trace, setTrace] = useState<TraceItem[]>([])
  const [runCount, setRunCount] = useState(0)
  const [lastRunAt, setLastRunAt] = useState<string | null>(null)
  const probesRef = useRef<ServiceProbe[]>([])
  const authPausedUntilRef = useRef<number>(0)
  const authPauseReasonRef = useRef<string | null>(null)
  const previousTokenRef = useRef<string | null>(token)
  const host = window.location.hostname

  const serviceLinks = useMemo(
    () => ({
      web: window.location.origin,
      swagger: `${env.apiUrl}/swagger`,
      apiLive: `${env.apiUrl}/health/live`,
      apiReady: `${env.apiUrl}/health/ready`,
      apiMetrics: `${env.apiUrl}/metrics`,
      rabbitmq: `http://${host}:15672`,
      mailhog: `http://${host}:8025`,
      dozzle: `http://${host}:9999`,
    }),
    [host],
  )

  const [probes, setProbes] = useState<ServiceProbe[]>([
    {
      key: "web",
      title: "Web App",
      url: serviceLinks.web,
      note: "Current frontend host",
      state: "healthy",
      checkedAt: new Date().toLocaleTimeString(),
    },
    {
      key: "api-live",
      title: "API Liveness",
      url: serviceLinks.apiLive,
      note: "Process liveness endpoint",
      state: "unknown",
    },
    {
      key: "api-ready",
      title: "API Readiness",
      url: serviceLinks.apiReady,
      note: "Dependency readiness (DB/RabbitMQ)",
      state: "unknown",
    },
    {
      key: "api-metrics",
      title: "API Metrics",
      url: serviceLinks.apiMetrics,
      note: "Prometheus scrape endpoint",
      state: "unknown",
    },
    {
      key: "auth",
      title: "Authenticated Session",
      url: `${env.apiUrl}/auth/profile`,
      note: "Checks if current token still works",
      state: "unknown",
    },
  ])

  useEffect(() => {
    probesRef.current = probes
  }, [probes])

  const pushTrace = useCallback((event: string, detail: string) => {
    const item: TraceItem = {
      at: new Date().toLocaleTimeString(),
      event,
      detail,
    }
    setTrace((previous) => [item, ...previous].slice(0, 30))
  }, [])

  useEffect(() => {
    if (previousTokenRef.current !== token) {
      authPausedUntilRef.current = 0
      authPauseReasonRef.current = null
      previousTokenRef.current = token
      pushTrace("auth:resume", "Token changed, auth probe resumed")
    }
  }, [token, pushTrace])

  const runChecks = useCallback(async () => {
    setRefreshing(true)
    const nextEvents: ProbeEvent[] = []
    const currentProbes = probesRef.current
    const now = Date.now()

    setRunCount((previous) => previous + 1)
    setLastRunAt(new Date().toLocaleTimeString())
    pushTrace("runChecks:start", `Checking ${currentProbes.length} probes`)

    const next = await Promise.all(
      currentProbes.map(async (probe) => {
        if (probe.key === "web") {
          return {
            ...probe,
            state: "healthy" as HealthState,
            statusCode: 200,
            checkedAt: new Date().toLocaleTimeString(),
            latencyMs: 0,
            error: undefined,
          }
        }

        if (probe.key === "auth") {
          const isPaused = authPausedUntilRef.current > now
          const hasToken = Boolean(token)

          if (hasToken && tokenExpired) {
            return {
              ...probe,
              state: "degraded" as HealthState,
              statusCode: 401,
              latencyMs: undefined,
              checkedAt: new Date().toLocaleTimeString(),
              error: "JWT token is expired. Re-login to resume auth checks.",
            }
          }

          if (isPaused) {
            return {
              ...probe,
              state: "degraded" as HealthState,
              statusCode: 401,
              latencyMs: undefined,
              checkedAt: new Date().toLocaleTimeString(),
              error: authPauseReasonRef.current ?? "Auth probe temporarily paused",
            }
          }

          return {
            ...probe,
            state: (hasToken ? "unknown" : "degraded") as HealthState,
            statusCode: undefined,
            latencyMs: undefined,
            checkedAt: new Date().toLocaleTimeString(),
            error: hasToken ? undefined : "No access token in browser session",
          }
        }

        const checked = await probeUrl(probe.url)
        const merged = { ...probe, ...checked }
        const previous = probesRef.current.find((item) => item.key === probe.key)
        const latencyJump =
          typeof previous?.latencyMs === "number" && typeof checked.latencyMs === "number"
            ? checked.latencyMs - previous.latencyMs
            : undefined

        nextEvents.push({
          at: checked.checkedAt ?? new Date().toLocaleTimeString(),
          service: probe.title,
          outcome: checked.state,
          previousOutcome: previous?.state,
          jump:
            typeof latencyJump === "number" && Math.abs(latencyJump) >= 200
              ? `${latencyJump > 0 ? "+" : ""}${latencyJump}ms latency`
              : undefined,
        })
        return merged
      }),
    )

    if (token && !tokenExpired && authPausedUntilRef.current <= now) {
      try {
        const response = await fetch(`${env.apiUrl}/auth/profile`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        })

        const authProbe = next.find((item) => item.key === "auth")
        if (authProbe) {
          authProbe.statusCode = response.status
          authProbe.state = response.ok ? "healthy" : "degraded"
          authProbe.checkedAt = new Date().toLocaleTimeString()
          authProbe.error = response.ok ? undefined : `HTTP ${response.status}`

          if (response.status === 401) {
            authPausedUntilRef.current = Number.MAX_SAFE_INTEGER
            authPauseReasonRef.current = "Auth probe paused after 401 (token likely expired). Re-login to resume."
            authProbe.error = authPauseReasonRef.current
            pushTrace("auth:paused", "Received 401 from /auth/profile, pausing auth probe until token changes")
          } else if (response.ok) {
            authPausedUntilRef.current = 0
            authPauseReasonRef.current = null
          }
        }
      } catch (error) {
        const authProbe = next.find((item) => item.key === "auth")
        if (authProbe) {
          authProbe.state = "down"
          authProbe.checkedAt = new Date().toLocaleTimeString()
          authProbe.error = error instanceof Error ? error.message : "Auth check failed"
        }
        pushTrace("auth:error", error instanceof Error ? error.message : "Auth check failed")
      }
    }

    setProbes(next)
    setEvents((previous) => [...nextEvents.reverse(), ...previous].slice(0, 20))
    pushTrace("runChecks:done", `Overall ${next.filter((probe) => probe.state === "healthy").length}/${next.length} healthy`)
    setRefreshing(false)
  }, [token, tokenExpired, pushTrace])

  useEffect(() => {
    void runChecks()
    const id = window.setInterval(() => {
      void runChecks()
    }, 10000)

    return () => window.clearInterval(id)
  }, [runChecks])

  const overallState: HealthState = probes.some((p) => p.state === "down")
    ? "down"
    : probes.some((p) => p.state === "degraded")
      ? "degraded"
      : probes.every((p) => p.state === "healthy")
        ? "healthy"
        : "unknown"

  return (
    <AdminLayout title="System Monitor">
      <div style={{ display: "grid", gap: 16 }}>
        <GlassCard variant="glow" padding="lg">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.14em" }}>Overall health</p>
              <h2 style={{ margin: "8px 0 4px", color: stateColor(overallState) }}>{stateLabel(overallState)}</h2>
              <p style={{ margin: 0, fontSize: 13 }}>Auto-refresh every 10 seconds with direct runtime probes.</p>
              <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.85 }}>
                Last run: {lastRunAt ?? "-"} • Runs: {runCount}
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 11, opacity: 0.75 }}>
                Build: {monitorBuildTag}
              </p>
            </div>
            <GlassButton type="button" variant="secondary" size="sm" onClick={() => void runChecks()} loading={refreshing}>
              {refreshing ? "Checking..." : "Run checks now"}
            </GlassButton>
          </div>
        </GlassCard>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {probes.map((probe) => (
            <GlassCard key={probe.key} variant="elevated" padding="md">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>{probe.title}</h3>
                <span style={{ color: stateColor(probe.state), fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {stateLabel(probe.state)}
                </span>
              </div>
              <p style={{ margin: "8px 0", fontSize: 13 }}>{probe.note}</p>
              <p style={{ margin: "6px 0", fontSize: 12, opacity: 0.9 }}>URL: {probe.url}</p>
              <p style={{ margin: "6px 0", fontSize: 12, opacity: 0.9 }}>
                {probe.statusCode ? `HTTP ${probe.statusCode}` : "No status yet"}
                {typeof probe.latencyMs === "number" ? ` • ${probe.latencyMs} ms` : ""}
              </p>
              {probe.error && <p style={{ margin: "6px 0", color: "#fca5a5", fontSize: 12 }}>{probe.error}</p>}
              <p style={{ margin: "6px 0 0", fontSize: 11, opacity: 0.75 }}>Checked: {probe.checkedAt ?? "-"}</p>
            </GlassCard>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
          <GlassCard variant="outlined" padding="md">
            <h3 style={{ marginTop: 0 }}>Operations links</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <a href={serviceLinks.web} target="_blank" rel="noreferrer">Web App</a>
              <a href={serviceLinks.swagger} target="_blank" rel="noreferrer">Swagger</a>
              <a href={serviceLinks.apiReady} target="_blank" rel="noreferrer">API Ready</a>
              <a href={serviceLinks.apiMetrics} target="_blank" rel="noreferrer">API Metrics</a>
              <a href={serviceLinks.rabbitmq} target="_blank" rel="noreferrer">RabbitMQ UI</a>
              <a href={serviceLinks.mailhog} target="_blank" rel="noreferrer">MailHog</a>
              <a href={serviceLinks.dozzle} target="_blank" rel="noreferrer">Dozzle</a>
            </div>
          </GlassCard>

          <GlassCard variant="outlined" padding="md">
            <h3 style={{ marginTop: 0 }}>Recent events</h3>
            <div style={{ display: "grid", gap: 8, maxHeight: 280, overflow: "auto" }}>
              {events.length === 0 && <p style={{ margin: 0, fontSize: 13 }}>No events yet.</p>}
              {events.map((event, index) => (
                <div key={`${event.at}-${event.service}-${index}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>{event.at}</div>
                  <div style={{ fontSize: 13 }}>{event.service}</div>
                  <div style={{ fontSize: 12, color: stateColor(event.outcome as HealthState) }}>{event.outcome}</div>
                  {event.previousOutcome && event.previousOutcome !== event.outcome && (
                    <div style={{ fontSize: 11, color: "#facc15" }}>State jump: {event.previousOutcome} {"->"} {event.outcome}</div>
                  )}
                  {event.jump && <div style={{ fontSize: 11, color: "#93c5fd" }}>Value jump: {event.jump}</div>}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>
          <GlassCard variant="outlined" padding="md">
            <h3 style={{ marginTop: 0 }}>Component & data flow</h3>
            <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
              <div>SystemMonitorPage</div>
              <div style={{ opacity: 0.85 }}>{"→"} runChecks() interval + manual trigger</div>
              <div style={{ opacity: 0.85 }}>{"→"} probeUrl() for web/api probes</div>
              <div style={{ opacity: 0.85 }}>{"→"} auth/profile probe (token-aware, 401 pause protection)</div>
              <div style={{ opacity: 0.85 }}>{"→"} setProbes(), setEvents(), setTrace()</div>
              <div style={{ opacity: 0.85 }}>{"→"} overallState derived from probes[]</div>
            </div>
          </GlassCard>

          <GlassCard variant="outlined" padding="md">
            <h3 style={{ marginTop: 0 }}>Session state snapshot</h3>
            <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
              <div>Token: {token ? "Present" : "Missing"}</div>
              <div>Token expired: {token ? (tokenExpired ? "Yes" : "No") : "N/A"}</div>
              <div>User: {claims?.email ?? "Unknown"}</div>
              <div>Primary role: {claims?.primaryRole ?? "Unknown"}</div>
              <div>Roles: {claims?.roles?.join(", ") || "None"}</div>
              <div>Auth probe paused: {authPausedUntilRef.current > Date.now() ? "Yes" : "No"}</div>
            </div>
          </GlassCard>
        </div>

        <GlassCard variant="outlined" padding="md">
          <h3 style={{ marginTop: 0 }}>State transition trace</h3>
          <div style={{ display: "grid", gap: 6, maxHeight: 260, overflow: "auto" }}>
            {trace.length === 0 && <p style={{ margin: 0, fontSize: 13 }}>No trace entries yet.</p>}
            {trace.map((item, index) => (
              <div key={`${item.at}-${item.event}-${index}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 6 }}>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{item.at}</div>
                <div style={{ fontSize: 13 }}>{item.event}</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>{item.detail}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </AdminLayout>
  )
}