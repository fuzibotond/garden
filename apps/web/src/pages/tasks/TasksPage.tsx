import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
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
  createTaskInGardenerJob,
  deleteGardenerTask,
  getGardenerJobTasks,
  getGardenerJobs,
  getGardenerTaskTypes,
  updateGardenerTask,
  type CreateTaskInJobRequest,
  type JobDto,
  type TaskTypeDto,
  type TaskDto,
  type UpdateTaskRequest,
} from "../../services/apiClient"

type CreateTaskFormState = {
  jobId: string
  taskTypeId: string
  name: string
  description: string
  estimatedTimeMinutes: string
}

type EditTaskFormState = {
  name: string
  description: string
  actualTimeMinutes: string
  startedAt: string
  finishedAt: string
}

function formatDateTime(value: string | undefined): string {
  if (!value) return "-"
  return new Date(value).toLocaleString("da-DK")
}

function toLocalDateTimeInput(value: string | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return offsetDate.toISOString().slice(0, 16)
}

function isAlreadyDeletedError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const message = err.message.toLowerCase()
  return (
    message.includes("not found")
    || message.includes("already deleted")
    || message.includes("no longer exists")
    || message.includes("does not exist")
  )
}

export default function TasksPage() {
  const token = getAccessToken()
  const user = getCurrentUser()
  const isAdmin = hasRole(user, "Admin")
  const canManage = hasRole(user, "Admin") || hasRole(user, "Gardener")
  const [searchParams, setSearchParams] = useSearchParams()

  const initialJobId = searchParams.get("jobId") ?? ""

  const [jobs, setJobs] = useState<JobDto[]>([])
  const [selectedJobId, setSelectedJobId] = useState(initialJobId)
  const [taskTypes, setTaskTypes] = useState<TaskTypeDto[]>([])
  const [taskTypeLoading, setTaskTypeLoading] = useState(false)
  const [taskTypeError, setTaskTypeError] = useState<string | null>(null)
  const [list, setList] = useState<TaskDto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<TaskDto | null>(null)
  const [createForm, setCreateForm] = useState<CreateTaskFormState>({
    jobId: initialJobId,
    taskTypeId: "",
    name: "",
    description: "",
    estimatedTimeMinutes: "",
  })
  const [editForm, setEditForm] = useState<EditTaskFormState>({
    name: "",
    description: "",
    actualTimeMinutes: "",
    startedAt: "",
    finishedAt: "",
  })
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)

  const taskTypeNameById = useMemo(() => {
    const map = new Map<string, string>()
    taskTypes.forEach((taskType) => {
      map.set(taskType.id, taskType.name)
    })
    return map
  }, [taskTypes])

  const loadJobs = useCallback(async () => {
    if (!token || !canManage) return
    try {
      const jobsRes = await getGardenerJobs(token, 1, 200)

      setJobs(jobsRes.items)

      if (!selectedJobId && jobsRes.items.length > 0) {
        const firstJobId = jobsRes.items[0].jobId
        setSelectedJobId(firstJobId)
        setCreateForm((current) => ({ ...current, jobId: firstJobId }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs")
    }
  }, [token, canManage, selectedJobId])

  const loadTaskTypesForCreate = useCallback(async () => {
    if (!token || !canManage) return

    setTaskTypeLoading(true)
    setTaskTypeError(null)
    try {
      const items = await getGardenerTaskTypes(token)
      setTaskTypes(items)
    } catch (err) {
      setTaskTypeError(err instanceof Error ? err.message : "Failed to load task types")
      setTaskTypes([])
    } finally {
      setTaskTypeLoading(false)
    }
  }, [token, canManage])

  const loadTasks = useCallback(async () => {
    if (!token || !canManage) return
    if (!selectedJobId) {
      setList([])
      setTotal(0)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const tasksRes = await getGardenerJobTasks(token, selectedJobId, page, pageSize)
      setList(tasksRes.items)
      setTotal(tasksRes.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks")
    } finally {
      setLoading(false)
    }
  }, [token, canManage, selectedJobId, page, pageSize])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  useEffect(() => {
    if (taskTypes.length === 0) return
    setCreateForm((current) => {
      if (current.taskTypeId && taskTypes.some((taskType) => taskType.id === current.taskTypeId)) {
        return current
      }
      return { ...current, taskTypeId: taskTypes[0].id }
    })
  }, [taskTypes])

  useEffect(() => {
    if (!selectedJobId) return
    setSearchParams((params) => {
      params.set("jobId", selectedJobId)
      return params
    })
  }, [selectedJobId, setSearchParams])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !createForm.jobId) return
    setSubmitLoading(true)
    setSubmitError(null)
    try {
      const body: CreateTaskInJobRequest = {
        taskTypeId: createForm.taskTypeId,
        name: createForm.name,
        description: createForm.description || undefined,
        estimatedTimeMinutes: createForm.estimatedTimeMinutes
          ? Number(createForm.estimatedTimeMinutes)
          : undefined,
      }
      await createTaskInGardenerJob(token, createForm.jobId, body)
      setShowCreate(false)
      setCreateForm((current) => ({
        ...current,
        taskTypeId: "",
        name: "",
        description: "",
        estimatedTimeMinutes: "",
      }))
      void loadTasks()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create task")
    } finally {
      setSubmitLoading(false)
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !editing) return
    setSubmitLoading(true)
    setSubmitError(null)
    try {
      const body: UpdateTaskRequest = {
        name: editForm.name || undefined,
        description: editForm.description || undefined,
        actualTimeMinutes: editForm.actualTimeMinutes ? Number(editForm.actualTimeMinutes) : undefined,
        startedAt: editForm.startedAt ? new Date(editForm.startedAt).toISOString() : undefined,
        finishedAt: editForm.finishedAt ? new Date(editForm.finishedAt).toISOString() : undefined,
      }
      await updateGardenerTask(token, editing.taskId, body)
      setEditing(null)
      setEditForm({ name: "", description: "", actualTimeMinutes: "", startedAt: "", finishedAt: "" })
      void loadTasks()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to update task")
    } finally {
      setSubmitLoading(false)
    }
  }

  async function handleDelete(task: TaskDto) {
    if (!token) return
    if (deletingTaskId === task.taskId) return
    if (!window.confirm(`Delete task \"${task.name}\"?`)) return
    setDeletingTaskId(task.taskId)
    try {
      await deleteGardenerTask(token, task.taskId)
      void loadTasks()
    } catch (err) {
      if (isAlreadyDeletedError(err)) {
        void loadTasks()
        return
      }
      setError(err instanceof Error ? err.message : "Failed to delete task")
    } finally {
      setDeletingTaskId((current) => (current === task.taskId ? null : current))
    }
  }

  function openEdit(task: TaskDto) {
    setEditing(task)
    setEditForm({
      name: task.name,
      description: task.description ?? "",
      actualTimeMinutes: task.actualTimeMinutes?.toString() ?? "",
      startedAt: toLocalDateTimeInput(task.startedAt),
      finishedAt: toLocalDateTimeInput(task.finishedAt),
    })
    setSubmitError(null)
  }

  if (!canManage) {
    return (
      <AdminLayout title="Tasks">
        <GlassCard variant="outlined" padding="md">You do not have access to this page.</GlassCard>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Tasks">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, maxWidth: 420 }}>
            <GlassSelect
              label="Job"
              value={selectedJobId}
              onValueChange={(value) => {
                setSelectedJobId(value)
                setPage(1)
                setCreateForm((current) => ({ ...current, jobId: value }))
              }}
              fullWidth
            >
              <GlassSelectTrigger>
                <GlassSelectValue placeholder="Select job..." />
              </GlassSelectTrigger>
              <GlassSelectContent>
                {jobs.map((job) => (
                  <GlassSelectItem key={job.jobId} value={job.jobId}>
                    {job.name}
                  </GlassSelectItem>
                ))}
              </GlassSelectContent>
            </GlassSelect>
          </div>

          <GlassButton
            type="button"
            onClick={async () => {
              setShowCreate(true)
              setSubmitError(null)
              setCreateForm((current) => ({ ...current, jobId: selectedJobId }))
              await loadTaskTypesForCreate()
            }}
            size="sm"
            disabled={!selectedJobId}
          >
            Add task
          </GlassButton>
        </div>

        {error && <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{error}</p>}

        <GlassCard variant="elevated" padding="md">
          {loading ? (
            <p>Loading tasks...</p>
          ) : !selectedJobId ? (
            <p style={{ margin: 0 }}>Select a job to view linked tasks.</p>
          ) : list.length === 0 ? (
            <p style={{ margin: 0 }}>No tasks for this job yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Task</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Type</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Estimated</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Actual</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Started</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Finished</th>
                    <th style={{ width: 180 }} />
                  </tr>
                </thead>
                <tbody>
                  {list.map((task) => (
                    <tr key={task.taskId} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <td style={{ padding: "10px 12px" }}>{task.name}</td>
                      <td style={{ padding: "10px 12px" }}>
                        {task.taskTypeId ? taskTypeNameById.get(task.taskTypeId) ?? task.taskTypeId : "-"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>{task.estimatedTimeMinutes ?? "-"}</td>
                      <td style={{ padding: "10px 12px" }}>{task.actualTimeMinutes ?? "-"}</td>
                      <td style={{ padding: "10px 12px" }}>{formatDateTime(task.startedAt)}</td>
                      <td style={{ padding: "10px 12px" }}>{formatDateTime(task.finishedAt)}</td>
                      <td style={{ padding: "10px 12px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <GlassButton type="button" onClick={() => openEdit(task)} size="xs" variant="secondary">
                          Edit
                        </GlassButton>
                        <GlassButton
                          type="button"
                          onClick={() => handleDelete(task)}
                          size="xs"
                          variant="danger"
                          disabled={deletingTaskId === task.taskId}
                        >
                          {deletingTaskId === task.taskId ? "Deleting..." : "Delete"}
                        </GlassButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedJobId && total > pageSize && (
            <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
              <GlassButton
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                size="xs"
                variant="ghost"
              >
                Previous
              </GlassButton>
              <span style={{ fontSize: 13 }}>
                Page {page} of {Math.ceil(total / pageSize)}
              </span>
              <GlassButton
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={page >= Math.ceil(total / pageSize)}
                size="xs"
                variant="ghost"
              >
                Next
              </GlassButton>
            </div>
          )}
        </GlassCard>

        {showCreate && (
          <GlassCard variant="elevated" padding="md" style={{ maxWidth: 560 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Create task</h2>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GlassSelect
                label="Job"
                value={createForm.jobId}
                onValueChange={(value) => setCreateForm((current) => ({ ...current, jobId: value }))}
                required
                fullWidth
              >
                <GlassSelectTrigger>
                  <GlassSelectValue placeholder="Select job..." />
                </GlassSelectTrigger>
                <GlassSelectContent>
                  {jobs.map((job) => (
                    <GlassSelectItem key={job.jobId} value={job.jobId}>
                      {job.name}
                    </GlassSelectItem>
                  ))}
                </GlassSelectContent>
              </GlassSelect>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <GlassSelect
                  label="Task type"
                  value={createForm.taskTypeId}
                  onValueChange={(value) => setCreateForm((current) => ({ ...current, taskTypeId: value }))}
                  required
                  fullWidth
                >
                  <GlassSelectTrigger>
                    <GlassSelectValue placeholder={taskTypeLoading ? "Loading task types..." : "Select task type..."} />
                  </GlassSelectTrigger>
                  <GlassSelectContent>
                    {taskTypes.map((taskType) => (
                      <GlassSelectItem key={taskType.id} value={taskType.id}>
                        {taskType.name}
                      </GlassSelectItem>
                    ))}
                  </GlassSelectContent>
                </GlassSelect>
                {!taskTypeLoading && taskTypes.length === 0 && (
                  <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>
                    No task types found for your account. {isAdmin ? "Use Admin Tools to create task types first." : "Ask your admin to create task types."}
                  </p>
                )}
                {taskTypeError && <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{taskTypeError}</p>}
              </div>
              <GlassInput
                label="Task name"
                type="text"
                required
                value={createForm.name}
                onChange={(e) => setCreateForm((current) => ({ ...current, name: e.target.value }))}
                fullWidth
              />
              <GlassInput
                label="Description"
                type="text"
                value={createForm.description}
                onChange={(e) => setCreateForm((current) => ({ ...current, description: e.target.value }))}
                fullWidth
              />
              <GlassInput
                label="Estimated minutes"
                type="number"
                min="0"
                value={createForm.estimatedTimeMinutes}
                onChange={(e) => setCreateForm((current) => ({ ...current, estimatedTimeMinutes: e.target.value }))}
                fullWidth
              />

              {submitError && <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{submitError}</p>}

              <div style={{ display: "flex", gap: 12 }}>
                <GlassButton type="button" onClick={() => setShowCreate(false)} variant="secondary" size="sm">
                  Cancel
                </GlassButton>
                <GlassButton type="submit" loading={submitLoading} size="sm">
                  {submitLoading ? "Creating..." : "Create"}
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        )}

        {editing && (
          <GlassCard variant="elevated" padding="md" style={{ maxWidth: 560 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Edit task</h2>
            <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GlassInput
                label="Task name"
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm((current) => ({ ...current, name: e.target.value }))}
                fullWidth
              />
              <GlassInput
                label="Description"
                type="text"
                value={editForm.description}
                onChange={(e) => setEditForm((current) => ({ ...current, description: e.target.value }))}
                fullWidth
              />
              <GlassInput
                label="Actual minutes"
                type="number"
                min="0"
                value={editForm.actualTimeMinutes}
                onChange={(e) => setEditForm((current) => ({ ...current, actualTimeMinutes: e.target.value }))}
                fullWidth
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, color: "rgba(247,248,244,0.9)" }}>Started at</label>
                  <input
                    type="datetime-local"
                    value={editForm.startedAt}
                    onChange={(e) => setEditForm((current) => ({ ...current, startedAt: e.target.value }))}
                    className="glass-ui-input glass-ui-input--md"
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, color: "rgba(247,248,244,0.9)" }}>Finished at</label>
                  <input
                    type="datetime-local"
                    value={editForm.finishedAt}
                    onChange={(e) => setEditForm((current) => ({ ...current, finishedAt: e.target.value }))}
                    className="glass-ui-input glass-ui-input--md"
                  />
                </div>
              </div>

              {submitError && <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{submitError}</p>}

              <div style={{ display: "flex", gap: 12 }}>
                <GlassButton
                  type="button"
                  onClick={() => {
                    setEditing(null)
                    setEditForm({ name: "", description: "", actualTimeMinutes: "", startedAt: "", finishedAt: "" })
                  }}
                  variant="secondary"
                  size="sm"
                >
                  Cancel
                </GlassButton>
                <GlassButton type="submit" loading={submitLoading} size="sm">
                  {submitLoading ? "Saving..." : "Save"}
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        )}
      </div>
    </AdminLayout>
  )
}