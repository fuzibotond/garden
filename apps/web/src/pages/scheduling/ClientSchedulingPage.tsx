import { useCallback, useEffect, useState } from "react"
import {
  GlassButton,
  GlassCard,
  GlassInput,
} from "../../components/ui/GlassUI"
import AdminLayout from "../../components/layout/AdminLayout"
import { getAccessToken, getCurrentUser, hasRole } from "../../lib/auth"
import {
  getClientSchedulingCalendar,
  clientApproveSchedule,
  clientDeclineSchedule,
  clientProposeAlternativeTime,
  type TaskScheduleDto,
  type ApproveScheduleRequest,
  type DeclineScheduleRequest,
  type ProposeAlternativeTimeRequest,
} from "../../services/apiClient"

type ActionModalType = "approve" | "decline" | "propose" | null

const statusBadgeStyle = (status: string): React.CSSProperties => {
  const statusColors: Record<string, string> = {
    Pending: "rgba(255, 193, 7, 0.2)",
    Approved: "rgba(76, 175, 80, 0.2)",
    Declined: "rgba(244, 67, 54, 0.2)",
    ProposedAlternative: "rgba(33, 150, 243, 0.2)",
    Rescheduled: "rgba(156, 39, 176, 0.2)",
    Cancelled: "rgba(158, 158, 158, 0.2)",
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    borderRadius: 6,
    background: statusColors[status] || statusColors.Pending,
    fontSize: 12,
    fontWeight: 500,
    width: "fit-content",
  }
}

function formatDateTime(value: string | undefined): string {
  if (!value) return "-"
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export default function ClientSchedulingPage() {
  const token = getAccessToken()
  const user = getCurrentUser()
  const isClient = hasRole(user, "Client")

  const [schedules, setSchedules] = useState<TaskScheduleDto[]>([])
  const page = 1
  const [pageSize] = useState(200)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [actionModal, setActionModal] = useState<ActionModalType>(null)
  const [selectedSchedule, setSelectedSchedule] = useState<TaskScheduleDto | null>(null)
  const [proposedTime, setProposedTime] = useState("")
  const [actionSubmitting, setActionSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<TaskScheduleDto | null>(null)

  const loadSchedules = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const response = await getClientSchedulingCalendar(token, page, pageSize)
      setSchedules(response?.scheduledTasks ?? [])
    } catch (err) {
      console.error("Failed to load schedule requests:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to load schedule requests"
      setError(`Unable to load schedule data: ${errorMessage}. Please check if the backend API is running.`)
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }, [token, page, pageSize])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  const handleApprove = async () => {
    if (!token || !selectedSchedule) return
    setActionSubmitting(true)
    setActionError(null)
    try {
      const request: ApproveScheduleRequest = {
        scheduleRequestId: selectedSchedule.scheduleRequestId,
      }
      await clientApproveSchedule(token, request)
      setActionModal(null)
      setSelectedSchedule(null)
      await loadSchedules()
    } catch (err) {
      console.error("Failed to approve schedule:", err)
      setActionError(`Failed to approve schedule: ${err instanceof Error ? err.message : "Unknown error"}. Please check if the backend API is running.`)
    } finally {
      setActionSubmitting(false)
    }
  }

  const handleDecline = async () => {
    if (!token || !selectedSchedule) return
    setActionSubmitting(true)
    setActionError(null)
    try {
      const request: DeclineScheduleRequest = {
        scheduleRequestId: selectedSchedule.scheduleRequestId,
      }
      await clientDeclineSchedule(token, request)
      setActionModal(null)
      setSelectedSchedule(null)
      await loadSchedules()
    } catch (err) {
      console.error("Failed to decline schedule:", err)
      setActionError(`Failed to decline schedule: ${err instanceof Error ? err.message : "Unknown error"}. Please check if the backend API is running.`)
    } finally {
      setActionSubmitting(false)
    }
  }

  const handleProposeAlternative = async () => {
    if (!token || !selectedSchedule) return

    if (!proposedTime) {
      setActionError("Proposed time is required")
      return
    }

    // Validate proposed time is in future
    const proposedTimeDate = new Date(proposedTime)
    void proposedTimeDate

    setActionSubmitting(true)
    setActionError(null)
    try {
      const request: ProposeAlternativeTimeRequest = {
        scheduleRequestId: selectedSchedule.scheduleRequestId,
        proposedAtUtc: proposedTime,
      }
      await clientProposeAlternativeTime(token, request)
      setActionModal(null)
      setSelectedSchedule(null)
      setProposedTime("")
      await loadSchedules()
    } catch (err) {
      console.error("Failed to propose alternative time:", err)
      setActionError(`Failed to propose alternative time: ${err instanceof Error ? err.message : "Unknown error"}. Please check if the backend API is running.`)
    } finally {
      setActionSubmitting(false)
    }
  }

  const canTakeAction = (schedule: TaskScheduleDto) => {
    return schedule.status === "Pending" || schedule.status === "Rescheduled"
  }

  const openModal = (type: ActionModalType, schedule: TaskScheduleDto) => {
    setActionModal(type)
    setSelectedSchedule(schedule)
    setProposedTime("")
    setActionError(null)
  }

  const closeModal = () => {
    setActionModal(null)
    setSelectedSchedule(null)
    setProposedTime("")
    setActionError(null)
  }

  if (!isClient) {
    return (
      <AdminLayout title="Unauthorized">
        <div style={{ padding: 24, color: "rgba(255, 255, 255, 0.7)" }}>
          <p>Unauthorized. Only clients can access this page.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Schedule Requests">
      <div style={{ padding: 24 }}>
        {error && (
          <GlassCard
            style={{
              padding: 16,
              marginBottom: 24,
              borderLeft: "3px solid rgba(244, 67, 54, 0.6)",
              background: "rgba(244, 67, 54, 0.1)",
            }}
          >
            <p style={{ margin: 0, color: "rgba(244, 67, 54, 0.9)" }}>{error}</p>
          </GlassCard>
        )}

        {(() => {
          const { year, month } = calendarDate
          const monthName = new Date(year, month).toLocaleString("default", { month: "long" })
          const firstDay = new Date(year, month, 1)
          const lastDay = new Date(year, month + 1, 0)
          const startOffset = (firstDay.getDay() + 6) % 7
          const cells: (number | null)[] = []
          for (let i = 0; i < startOffset; i++) cells.push(null)
          for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d)
          while (cells.length % 7 !== 0) cells.push(null)

          const schedulesByDay: Record<number, TaskScheduleDto[]> = {}
          for (const s of schedules) {
            const d = new Date(s.scheduledAtUtc)
            if (d.getFullYear() === year && d.getMonth() === month) {
              const day = d.getDate()
              if (!schedulesByDay[day]) schedulesByDay[day] = []
              schedulesByDay[day].push(s)
            }
          }

          const today = new Date()
          const eventColors: Record<string, string> = {
            Pending: "rgba(255, 193, 7, 0.5)",
            Approved: "rgba(76, 175, 80, 0.5)",
            Declined: "rgba(244, 67, 54, 0.5)",
            ProposedAlternative: "rgba(33, 150, 243, 0.5)",
            Rescheduled: "rgba(156, 39, 176, 0.5)",
            Cancelled: "rgba(158, 158, 158, 0.5)",
          }

          const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

          return (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <GlassButton
                  onClick={() =>
                    setCalendarDate(prev => {
                      const d = new Date(prev.year, prev.month - 1)
                      return { year: d.getFullYear(), month: d.getMonth() }
                    })
                  }
                  style={{ padding: "6px 14px", fontSize: 18 }}
                >
                  ‹
                </GlassButton>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.9)",
                    minWidth: 170,
                    textAlign: "center",
                  }}
                >
                  {monthName} {year}
                </span>
                <GlassButton
                  onClick={() =>
                    setCalendarDate(prev => {
                      const d = new Date(prev.year, prev.month + 1)
                      return { year: d.getFullYear(), month: d.getMonth() }
                    })
                  }
                  style={{ padding: "6px 14px", fontSize: 18 }}
                >
                  ›
                </GlassButton>
                <GlassButton
                  onClick={() => {
                    const now = new Date()
                    setCalendarDate({ year: now.getFullYear(), month: now.getMonth() })
                  }}
                  style={{ padding: "6px 12px", fontSize: 12, background: "transparent", border: "1px solid rgba(255,255,255,0.35)", marginLeft: 4 }}
                >
                  Today
                </GlassButton>
              </div>

              {loading ? (
                <GlassCard style={{ padding: 24, textAlign: "center", color: "rgba(255, 255, 255, 0.6)" }}>
                  Loading schedule requests...
                </GlassCard>
              ) : (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, 1fr)",
                      gap: 2,
                      marginBottom: 2,
                    }}
                  >
                    {dayNames.map(dn => (
                      <div
                        key={dn}
                        style={{
                          textAlign: "center",
                          fontSize: 11,
                          color: "rgba(255,255,255,0.4)",
                          padding: "4px 0",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase" as const,
                        }}
                      >
                        {dn}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                    {cells.map((day, i) => {
                      if (day === null) {
                        return <div key={`e-${i}`} style={{ minHeight: 90 }} />
                      }
                      const isToday =
                        day === today.getDate() &&
                        month === today.getMonth() &&
                        year === today.getFullYear()
                      const daySchedules = schedulesByDay[day] ?? []
                      return (
                        <div
                          key={day}
                          style={{
                            minHeight: 90,
                            padding: "6px 4px",
                            borderRadius: 8,
                            background: isToday
                              ? "rgba(190, 255, 171, 0.07)"
                              : "rgba(255, 255, 255, 0.025)",
                            border: isToday
                              ? "1px solid rgba(190, 255, 171, 0.38)"
                              : "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: isToday ? 700 : 400,
                              color: isToday
                                ? "rgba(190, 255, 171, 0.95)"
                                : "rgba(255,255,255,0.55)",
                              marginBottom: 4,
                              textAlign: "right",
                              paddingRight: 2,
                            }}
                          >
                            {day}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {daySchedules.slice(0, 3).map(s => (
                              <div
                                key={s.scheduleRequestId}
                                onClick={() =>
                                  setSelectedCalendarEvent(
                                    selectedCalendarEvent?.scheduleRequestId === s.scheduleRequestId ? null : s,
                                  )
                                }
                                title={`${s.taskName}\nStatus: ${s.status}`}
                                style={{
                                  fontSize: 10,
                                  padding: "2px 5px",
                                  borderRadius: 4,
                                  background: eventColors[s.status] ?? "rgba(255,193,7,0.5)",
                                  color: "rgba(255,255,255,0.92)",
                                  cursor: "pointer",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  outline:
                                    selectedCalendarEvent?.scheduleRequestId === s.scheduleRequestId
                                      ? "1px solid rgba(255,255,255,0.5)"
                                      : "none",
                                }}
                              >
                                {new Date(s.scheduledAtUtc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{" "}
                                {s.taskName}
                              </div>
                            ))}
                            {daySchedules.length > 3 && (
                              <div
                                style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", paddingLeft: 2 }}
                              >
                                +{daySchedules.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )
        })()}

        {/* Pending requests list */}
        {!loading && schedules.some(s => canTakeAction(s)) && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 15, color: "rgba(255,255,255,0.7)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
              Awaiting your response ({schedules.filter(s => canTakeAction(s)).length})
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {schedules.filter(s => canTakeAction(s)).map(s => (
                <GlassCard
                  key={s.scheduleRequestId}
                  style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" as const }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: "rgba(255,255,255,0.95)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                        {s.taskName}
                      </span>
                      <span style={statusBadgeStyle(s.status)}>{s.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                      {s.gardenerName} · {formatDateTime(s.scheduledAtUtc)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <GlassButton
                      onClick={() => openModal("approve", s)}
                      style={{ background: "rgba(76,175,80,0.2)", border: "1px solid rgba(76,175,80,0.4)", fontSize: 13, padding: "6px 14px" }}
                    >
                      Approve
                    </GlassButton>
                    <GlassButton
                      onClick={() => openModal("propose", s)}
                      style={{ background: "rgba(33,150,243,0.15)", border: "1px solid rgba(33,150,243,0.35)", fontSize: 13, padding: "6px 14px" }}
                    >
                      Propose Time
                    </GlassButton>
                    <GlassButton
                      onClick={() => openModal("decline", s)}
                      style={{ background: "rgba(244,67,54,0.15)", border: "1px solid rgba(244,67,54,0.35)", fontSize: 13, padding: "6px 14px" }}
                    >
                      Decline
                    </GlassButton>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {selectedCalendarEvent && (          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => setSelectedCalendarEvent(null)}
          >
            <GlassCard
              style={{ padding: 28, maxWidth: 480, width: "92%", maxHeight: "85vh", overflow: "auto" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <h2 style={{ margin: 0, marginBottom: 6, color: "rgba(255,255,255,0.98)", fontSize: 18 }}>
                    {selectedCalendarEvent.taskName}
                  </h2>
                  <span style={statusBadgeStyle(selectedCalendarEvent.status)}>
                    {selectedCalendarEvent.status}
                  </span>
                </div>
                <GlassButton
                  onClick={() => setSelectedCalendarEvent(null)}
                  style={{ padding: "4px 10px", fontSize: 14, background: "transparent", border: "1px solid rgba(255,255,255,0.35)", color: "rgba(255,255,255,0.85)", flexShrink: 0 }}
                >
                  ✕
                </GlassButton>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "6px 12px", fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 20 }}>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Scheduled</span>
                <span>{formatDateTime(selectedCalendarEvent.scheduledAtUtc)}</span>

                <span style={{ color: "rgba(255,255,255,0.4)" }}>Gardener</span>
                <span>{selectedCalendarEvent.gardenerName}</span>

                {selectedCalendarEvent.proposedAtUtc && (
                  <>
                    <span style={{ color: "rgba(33,150,243,0.8)" }}>Your proposal</span>
                    <span style={{ color: "rgba(33,150,243,0.9)" }}>{formatDateTime(selectedCalendarEvent.proposedAtUtc)}</span>
                  </>
                )}
                {selectedCalendarEvent.approvedAtUtc && (
                  <>
                    <span style={{ color: "rgba(76,175,80,0.8)" }}>Approved</span>
                    <span style={{ color: "rgba(76,175,80,0.9)" }}>{formatDateTime(selectedCalendarEvent.approvedAtUtc)}</span>
                  </>
                )}
                {selectedCalendarEvent.declinedAtUtc && (
                  <>
                    <span style={{ color: "rgba(244,67,54,0.8)" }}>Declined</span>
                    <span style={{ color: "rgba(244,67,54,0.9)" }}>{formatDateTime(selectedCalendarEvent.declinedAtUtc)}</span>
                  </>
                )}
              </div>

              {canTakeAction(selectedCalendarEvent) && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <GlassButton
                    onClick={() => { openModal("approve", selectedCalendarEvent); setSelectedCalendarEvent(null) }}
                    style={{ background: "rgba(76,175,80,0.2)" }}
                  >
                    Approve
                  </GlassButton>
                  <GlassButton
                    onClick={() => { openModal("propose", selectedCalendarEvent); setSelectedCalendarEvent(null) }}
                    style={{ background: "rgba(33,150,243,0.2)" }}
                  >
                    Propose Time
                  </GlassButton>
                  <GlassButton
                    onClick={() => { openModal("decline", selectedCalendarEvent); setSelectedCalendarEvent(null) }}
                    style={{ background: "rgba(244,67,54,0.2)" }}
                  >
                    Decline
                  </GlassButton>
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {actionModal && selectedSchedule && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={closeModal}
          >
            <GlassCard
              style={{
                padding: 24,
                maxWidth: 400,
                width: "90%",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                style={{
                  marginTop: 0,
                  marginBottom: 16,
                  color: "rgba(255, 255, 255, 0.98)",
                }}
              >
                {actionModal === "approve" && "Approve Schedule"}
                {actionModal === "decline" && "Decline Schedule"}
                {actionModal === "propose" && "Propose Alternative Time"}
              </h2>

              {actionError && (
                <div
                  style={{
                    padding: 12,
                    marginBottom: 16,
                    borderRadius: 6,
                    background: "rgba(244, 67, 54, 0.1)",
                    color: "rgba(244, 67, 54, 0.9)",
                    fontSize: 14,
                  }}
                >
                  {actionError}
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.7)" }}>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Task:</strong> {selectedSchedule.taskName}
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    <strong>Proposed Time:</strong>{" "}
                    {formatDateTime(selectedSchedule.scheduledAtUtc)}
                  </p>
                </div>
              </div>

              {actionModal === "propose" && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>
                    Your Alternative Time (UTC) *
                  </label>
                  <GlassInput
                    type="datetime-local"
                    value={proposedTime}
                    onChange={(e) => setProposedTime(e.target.value)}
                    disabled={actionSubmitting}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: 12 }}>
                <GlassButton
                  onClick={() => {
                    if (actionModal === "approve") handleApprove()
                    else if (actionModal === "decline") handleDecline()
                    else if (actionModal === "propose") handleProposeAlternative()
                  }}
                  disabled={actionSubmitting}
                >
                  {actionSubmitting ? "Processing..." : "Confirm"}
                </GlassButton>
                <GlassButton
                  onClick={closeModal}
                  disabled={actionSubmitting}
                  style={{ background: "transparent", border: "1px solid rgba(244,67,54,0.45)", color: "rgba(244,100,100,0.9)" }}
                >
                  Cancel
                </GlassButton>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
