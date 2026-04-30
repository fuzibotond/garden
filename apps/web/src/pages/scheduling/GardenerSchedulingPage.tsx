import { useCallback, useEffect, useState } from "react"
import {
  GlassButton,
  GlassCard,
  GlassInput,
  GlassSelect,
  GlassSelectContent,
  GlassSelectItem,
  GlassSelectTrigger,
  GlassSelectValue,
} from "../../components/ui/GlassUI"
import AdminLayout from "../../components/layout/AdminLayout"
import { getAccessToken, getCurrentUser, hasRole } from "../../lib/auth"
import {
  gardenerScheduleTask,
  getGardenerSchedulingCalendar,
  getGardenerClients,
  getGardenerTasksByClientId,
  gardenerRescheduleTask,
  type TaskDto,
  type TaskScheduleDto,
  type ScheduleTaskRequest,
  type RescheduleTaskRequest,
} from "../../services/apiClient"

type RescheduleFormState = {
  scheduleRequestId: string
  rescheduledAtUtc: string
}

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

export default function GardenerSchedulingPage() {
  const token = getAccessToken()
  const user = getCurrentUser()
  const isGardener = hasRole(user, "Gardener")

  const [schedules, setSchedules] = useState<TaskScheduleDto[]>([])
  const page = 1
  const [pageSize] = useState(200)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [clients, setClients] = useState<
    Array<{ id: string; fullName: string; email: string }>
  >([])
  const [loadingClients, setLoadingClients] = useState(false)

  // Schedule modal state
  const [scheduleModal, setScheduleModal] = useState(false)
  const [scheduleClientId, setScheduleClientId] = useState("")
  const [clientTasks, setClientTasks] = useState<TaskDto[]>([])
  const [loadingClientTasks, setLoadingClientTasks] = useState(false)
  const [scheduleTaskId, setScheduleTaskId] = useState("")
  const [scheduleDateTime, setScheduleDateTime] = useState("")
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  const [rescheduleModal, setRescheduleModal] = useState<TaskScheduleDto | null>(null)
  const [rescheduleForm, setRescheduleForm] = useState<RescheduleFormState>({
    scheduleRequestId: "",
    rescheduledAtUtc: "",
  })
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false)
  const [rescheduleError, setRescheduleError] = useState<string | null>(null)

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
      const response = await getGardenerSchedulingCalendar(token, page, pageSize)
      const items: TaskScheduleDto[] = response?.scheduledTasks ?? []
      setSchedules(items)
    } catch (err) {
      console.error("Failed to load schedules:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to load schedules"
      setError(`Unable to load schedule data: ${errorMessage}. Please check if the backend API is running.`)
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }, [token, page, pageSize])

  const loadClients = useCallback(async () => {
    if (!token) return
    setLoadingClients(true)
    try {
      const response = await getGardenerClients(token, 1, 200)
      setClients(response.items.map(c => ({ id: c.clientId, fullName: c.fullName, email: c.email })))
    } catch (err) {
      console.error("Failed to load clients:", err)
    } finally {
      setLoadingClients(false)
    }
  }, [token])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  // Load tasks when client is selected
  useEffect(() => {
    if (!token || !scheduleClientId) {
      setClientTasks([])
      setScheduleTaskId("")
      return
    }
    setLoadingClientTasks(true)
    setScheduleTaskId("")
    setClientTasks([])
    getGardenerTasksByClientId(token, scheduleClientId)
      .then(setClientTasks)
      .catch(() => setClientTasks([]))
      .finally(() => setLoadingClientTasks(false))
  }, [token, scheduleClientId])

  const openScheduleModal = (prefillDate?: string) => {
    setScheduleClientId("")
    setClientTasks([])
    setScheduleTaskId("")
    setScheduleDateTime(prefillDate ?? "")
    setScheduleError(null)
    setScheduleModal(true)
  }

  const closeScheduleModal = () => {
    setScheduleModal(false)
    setScheduleError(null)
  }

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    if (!scheduleClientId || !scheduleTaskId || !scheduleDateTime) {
      setScheduleError("All fields are required")
      return
    }

    const scheduledTime = new Date(scheduleDateTime)

    setScheduleSubmitting(true)
    setScheduleError(null)
    try {
      const request: ScheduleTaskRequest = {
        taskId: scheduleTaskId,
        clientId: scheduleClientId,
        scheduledAtUtc: scheduledTime.toISOString(),
      }
      await gardenerScheduleTask(token, request)
      closeScheduleModal()
      await loadSchedules()
    } catch (err) {
      console.error("Failed to schedule task:", err)
      setScheduleError(
        `Failed to schedule task: ${err instanceof Error ? err.message : "Unknown error"}.`,
      )
    } finally {
      setScheduleSubmitting(false)
    }
  }

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !rescheduleModal) return

    if (!rescheduleForm.rescheduledAtUtc) {
      setRescheduleError("Rescheduled time is required")
      return
    }

    setRescheduleSubmitting(true)
    setRescheduleError(null)
    try {
      const request: RescheduleTaskRequest = {
        scheduleRequestId: rescheduleModal.scheduleRequestId,
        rescheduledAtUtc: rescheduleForm.rescheduledAtUtc,
      }
      await gardenerRescheduleTask(token, request)
      setRescheduleModal(null)
      setRescheduleForm({ scheduleRequestId: "", rescheduledAtUtc: "" })
      await loadSchedules()
    } catch (err) {
      console.error("Failed to reschedule task:", err)
      setRescheduleError(`Failed to reschedule task: ${err instanceof Error ? err.message : "Unknown error"}. Please check if the backend API is running.`)
    } finally {
      setRescheduleSubmitting(false)
    }
  }

  const canReschedule = (schedule: TaskScheduleDto) => {
    return (
      schedule.status === "Pending" ||
      schedule.status === "Declined" ||
      schedule.status === "ProposedAlternative" ||
      schedule.status === "Rescheduled"
    )
  }

  if (!isGardener) {
    return (
      <AdminLayout title="Unauthorized">
        <div style={{ padding: 24, color: "rgba(255, 255, 255, 0.7)" }}>
          <p>Unauthorized. Only gardeners can access this page.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Task Scheduling">
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

        <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
          <GlassButton onClick={() => openScheduleModal()}>
            Schedule New Task
          </GlassButton>
          {!loading && (
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
              {schedules.length} schedule{schedules.length !== 1 ? "s" : ""} total
            </span>
          )}
        </div>

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
                  Loading schedules...
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
                      const prefillDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T09:00`
                      return (
                        <div
                          key={day}
                          onClick={() => openScheduleModal(prefillDate)}
                          style={{
                            minHeight: 90,
                            padding: "6px 4px",
                            borderRadius: 8,
                            cursor: "pointer",
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
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedCalendarEvent(
                                    selectedCalendarEvent?.scheduleRequestId === s.scheduleRequestId ? null : s,
                                  )
                                }}
                                title={`${s.taskName}\n${s.status}`}
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

        {selectedCalendarEvent && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => setSelectedCalendarEvent(null)}
          >
            <GlassCard
              style={{
                padding: 28,
                maxWidth: 480,
                width: "92%",
                maxHeight: "85vh",
                overflow: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 20,
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      marginBottom: 6,
                      color: "rgba(255,255,255,0.98)",
                      fontSize: 18,
                    }}
                  >
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

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  fontSize: 13,
                  color: "rgba(255,255,255,0.7)",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 1fr",
                    gap: "6px 12px",
                  }}
                >
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>Scheduled</span>
                  <span>{formatDateTime(selectedCalendarEvent.scheduledAtUtc)}</span>

                  {selectedCalendarEvent.proposedAtUtc && (
                    <>
                      <span style={{ color: "rgba(33, 150, 243, 0.8)" }}>Client proposed</span>
                      <span style={{ color: "rgba(33, 150, 243, 0.9)" }}>
                        {formatDateTime(selectedCalendarEvent.proposedAtUtc)}
                      </span>
                    </>
                  )}

                  {selectedCalendarEvent.approvedAtUtc && (
                    <>
                      <span style={{ color: "rgba(76, 175, 80, 0.8)" }}>Approved</span>
                      <span style={{ color: "rgba(76, 175, 80, 0.9)" }}>
                        {formatDateTime(selectedCalendarEvent.approvedAtUtc)}
                      </span>
                    </>
                  )}

                  {selectedCalendarEvent.declinedAtUtc && (
                    <>
                      <span style={{ color: "rgba(244, 67, 54, 0.8)" }}>Declined</span>
                      <span style={{ color: "rgba(244, 67, 54, 0.9)" }}>
                        {formatDateTime(selectedCalendarEvent.declinedAtUtc)}
                      </span>
                    </>
                  )}

                  <span style={{ color: "rgba(255,255,255,0.4)" }}>Client</span>
                  <span>{selectedCalendarEvent.clientName}</span>

                  <span style={{ color: "rgba(255,255,255,0.4)" }}>Schedule ID</span>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.5)",
                      wordBreak: "break-all",
                    }}
                  >
                    {selectedCalendarEvent.scheduleRequestId}
                  </span>
                </div>
              </div>

              {canReschedule(selectedCalendarEvent) && (
                <GlassButton
                  onClick={() => {
                    const prefilled = new Date(
                          new Date(selectedCalendarEvent.scheduledAtUtc).getTime() -
                            new Date().getTimezoneOffset() * 60000,
                        )
                          .toISOString()
                          .slice(0, 16)
                    setRescheduleModal(selectedCalendarEvent)
                    setRescheduleForm({
                      scheduleRequestId: selectedCalendarEvent.scheduleRequestId,
                      rescheduledAtUtc: prefilled,
                    })
                    setSelectedCalendarEvent(null)
                  }}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  Reschedule
                </GlassButton>
              )}
            </GlassCard>
          </div>
        )}

        {scheduleModal && (
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
            onClick={closeScheduleModal}
          >
            <GlassCard
              style={{
                padding: 24,
                maxWidth: 520,
                width: "92%",
                maxHeight: "88vh",
                overflow: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ marginTop: 0, marginBottom: 20, color: "rgba(255, 255, 255, 0.98)" }}>
                Schedule a Task
              </h2>

              {scheduleError && (
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
                  {scheduleError}
                </div>
              )}

              <form
                onSubmit={handleScheduleSubmit}
                style={{ display: "flex", flexDirection: "column", gap: 20 }}
              >
                {/* Step 1: Client */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontSize: 13,
                      color: "rgba(255,255,255,0.5)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    1. Select Client
                  </label>
                  <GlassSelect
                    value={scheduleClientId}
                    onValueChange={setScheduleClientId}
                    disabled={loadingClients || scheduleSubmitting}
                  >
                    <GlassSelectTrigger>
                      <GlassSelectValue
                        placeholder={loadingClients ? "Loading clients..." : "Choose a client"}
                      />
                    </GlassSelectTrigger>
                    <GlassSelectContent>
                      {clients.map((c) => (
                        <GlassSelectItem key={c.id} value={c.id}>
                          {c.fullName || c.email}
                        </GlassSelectItem>
                      ))}
                    </GlassSelectContent>
                  </GlassSelect>
                </div>

                {/* Step 2: Task list for selected client */}
                {scheduleClientId && (
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 13,
                        color: "rgba(255,255,255,0.5)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      2. Select Task
                    </label>
                    {loadingClientTasks ? (
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", padding: "8px 0" }}>
                        Loading tasks…
                      </div>
                    ) : clientTasks.length === 0 ? (
                      <div
                        style={{
                          fontSize: 13,
                          color: "rgba(255,255,255,0.4)",
                          padding: "12px",
                          borderRadius: 8,
                          border: "1px dashed rgba(255,255,255,0.12)",
                          textAlign: "center",
                        }}
                      >
                        No tasks found for this client
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          maxHeight: 220,
                          overflowY: "auto",
                        }}
                      >
                        {clientTasks.map((task) => (
                          <div
                            key={task.taskId}
                            onClick={() =>
                              setScheduleTaskId(
                                scheduleTaskId === task.taskId ? "" : task.taskId,
                              )
                            }
                            style={{
                              padding: "10px 14px",
                              borderRadius: 8,
                              cursor: "pointer",
                              border:
                                scheduleTaskId === task.taskId
                                  ? "1px solid rgba(190, 255, 171, 0.5)"
                                  : "1px solid rgba(255,255,255,0.08)",
                              background:
                                scheduleTaskId === task.taskId
                                  ? "rgba(190, 255, 171, 0.08)"
                                  : "rgba(255,255,255,0.03)",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 500,
                                color: "rgba(255,255,255,0.9)",
                              }}
                            >
                              {task.name}
                            </div>
                            {task.taskTypeName && (
                              <div
                                style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}
                              >
                                {task.taskTypeName}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Date & time */}
                {scheduleTaskId && (
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 13,
                        color: "rgba(255,255,255,0.5)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      3. Date &amp; Time
                    </label>
                    <GlassInput
                      type="datetime-local"
                      value={scheduleDateTime}
                      onChange={(e) => setScheduleDateTime(e.target.value)}
                      disabled={scheduleSubmitting}
                    />
                  </div>
                )}

                <div style={{ display: "flex", gap: 12, paddingTop: 4 }}>
                  <GlassButton
                    type="submit"
                    disabled={scheduleSubmitting || !scheduleClientId || !scheduleTaskId || !scheduleDateTime}
                  >
                    {scheduleSubmitting ? "Scheduling…" : "Confirm Schedule"}
                  </GlassButton>
                  <GlassButton
                    onClick={closeScheduleModal}
                    disabled={scheduleSubmitting}
                    style={{ background: "transparent", border: "1px solid rgba(244,67,54,0.45)", color: "rgba(244,100,100,0.9)" }}
                  >
                    Cancel
                  </GlassButton>
                </div>
              </form>
            </GlassCard>
          </div>
        )}

        {rescheduleModal && (
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
            onClick={() => {
              setRescheduleModal(null)
              setRescheduleError(null)
            }}
          >
            <GlassCard
              style={{
                padding: 24,
                maxWidth: 400,
                width: "90%",
                maxHeight: "80vh",
                overflow: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ marginTop: 0, marginBottom: 16, color: "rgba(255, 255, 255, 0.98)" }}>
                Reschedule Task
              </h2>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                {rescheduleModal.taskName}
              </p>

              {rescheduleError && (
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
                  {rescheduleError}
                </div>
              )}

              <form
                onSubmit={handleRescheduleSubmit}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div>
                  <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>
                    Current Status
                  </label>
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 6,
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(190, 255, 171, 0.24)",
                      fontSize: 14,
                    }}
                  >
                    <span style={statusBadgeStyle(rescheduleModal.status)}>
                      {rescheduleModal.status}
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>
                    New Scheduled Date & Time (UTC) *
                  </label>
                  <GlassInput
                    type="datetime-local"
                    value={rescheduleForm.rescheduledAtUtc}
                    onChange={(e) =>
                      setRescheduleForm({
                        ...rescheduleForm,
                        rescheduledAtUtc: e.target.value,
                      })
                    }
                    disabled={rescheduleSubmitting}
                  />
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <GlassButton type="submit" disabled={rescheduleSubmitting}>
                    {rescheduleSubmitting ? "Rescheduling..." : "Reschedule"}
                  </GlassButton>
                  <GlassButton
                    onClick={() => {
                      setRescheduleModal(null)
                      setRescheduleError(null)
                    }}
                    disabled={rescheduleSubmitting}
                    style={{ background: "transparent", border: "1px solid rgba(244,67,54,0.45)", color: "rgba(244,100,100,0.9)" }}
                  >
                    Cancel
                  </GlassButton>
                </div>
              </form>
            </GlassCard>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
