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
  getClientJobTasks,
  getClientJobs,
  getGardenerJobTasks,
  getGardenerJobs,
  getGardenerMaterials,
  getGardenerTaskById,
  getGardenerTaskTypes,
  updateGardenerTask,
  type CreateTaskInJobRequest,
  type JobDto,
  type MaterialDto,
  type TaskMaterialInput,
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
  wagePerHour: string
}

type EditTaskFormState = {
  name: string
  description: string
  actualTimeMinutes: string
  wagePerHour: string
  startedAt: string
  finishedAt: string
}

type TaskMaterialFormRow = {
  id: string
  materialId: string
  usedQuantity: string
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

function formatCost(value: number | undefined): string {
  if (value == null) return "-"
  return `${value.toFixed(2)} DKK`
}

function formatMinutes(value: number | undefined): string {
  if (value == null) return "-"
  return `${value} min`
}

function createMaterialRow(materialId = "", usedQuantity = ""): TaskMaterialFormRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    materialId,
    usedQuantity,
  }
}

function normalizeTaskMaterialRows(rows: TaskMaterialFormRow[]): TaskMaterialInput[] {
  const mergedByMaterial = new Map<string, number>()

  rows.forEach((row) => {
    const materialId = row.materialId.trim()
    const usedQuantity = row.usedQuantity.trim()

    if (!materialId && !usedQuantity) return
    if (!materialId || !usedQuantity) {
      throw new Error("Each material row must include both material and used quantity.")
    }

    const parsed = Number(usedQuantity)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error("Material used quantity must be greater than 0.")
    }

    mergedByMaterial.set(materialId, (mergedByMaterial.get(materialId) ?? 0) + parsed)
  })

  return Array.from(mergedByMaterial.entries()).map(([materialId, usedQuantity]) => ({
    materialId,
    usedQuantity,
  }))
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
  const isGardener = hasRole(user, "Gardener")
  const isClient = hasRole(user, "Client")
  const canView = isAdmin || isGardener || isClient
  const canManage = isAdmin || isGardener
  const [searchParams, setSearchParams] = useSearchParams()

  const initialJobId = searchParams.get("jobId") ?? ""

  const [jobs, setJobs] = useState<JobDto[]>([])
  const [selectedJobId, setSelectedJobId] = useState(initialJobId)
  const [taskTypes, setTaskTypes] = useState<TaskTypeDto[]>([])
  const [materials, setMaterials] = useState<MaterialDto[]>([])
  const [taskTypeLoading, setTaskTypeLoading] = useState(false)
  const [materialsLoading, setMaterialsLoading] = useState(false)
  const [taskTypeError, setTaskTypeError] = useState<string | null>(null)
  const [materialsError, setMaterialsError] = useState<string | null>(null)
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
    wagePerHour: "",
  })
  const [editForm, setEditForm] = useState<EditTaskFormState>({
    name: "",
    description: "",
    actualTimeMinutes: "",
    wagePerHour: "",
    startedAt: "",
    finishedAt: "",
  })
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)
  const [createMaterialRows, setCreateMaterialRows] = useState<TaskMaterialFormRow[]>([])
  const [editMaterialRows, setEditMaterialRows] = useState<TaskMaterialFormRow[]>([])
  const [editDetailsLoading, setEditDetailsLoading] = useState(false)

  const taskTypeNameById = useMemo(() => {
    const map = new Map<string, string>()
    taskTypes.forEach((taskType) => {
      map.set(taskType.id, taskType.name)
    })
    return map
  }, [taskTypes])

  const selectedJob = useMemo(() => jobs.find((job) => job.jobId === selectedJobId), [jobs, selectedJobId])

  const loadJobs = useCallback(async () => {
    if (!token || !canView) return
    try {
      const jobsRes = isClient
        ? await getClientJobs(token, 1, 200)
        : await getGardenerJobs(token, 1, 200)

      setJobs(jobsRes.items)

      if (!selectedJobId && jobsRes.items.length > 0) {
        const firstJobId = jobsRes.items[0].jobId
        setSelectedJobId(firstJobId)
        setCreateForm((current) => ({ ...current, jobId: firstJobId }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs")
    }
  }, [token, canView, isClient, selectedJobId])

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

  const loadMaterials = useCallback(async () => {
    if (!token || !canManage) return

    setMaterialsLoading(true)
    setMaterialsError(null)
    try {
      const items = await getGardenerMaterials(token, 1, 500)
      setMaterials(items.items)
    } catch (err) {
      setMaterialsError(err instanceof Error ? err.message : "Failed to load materials")
      setMaterials([])
    } finally {
      setMaterialsLoading(false)
    }
  }, [token, canManage])

  const loadTasks = useCallback(async () => {
    if (!token || !canView) return
    if (!selectedJobId) {
      setList([])
      setTotal(0)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const tasksRes = isClient
        ? await getClientJobTasks(token, selectedJobId, page, pageSize)
        : await getGardenerJobTasks(token, selectedJobId, page, pageSize)
      setList(tasksRes.items)
      setTotal(tasksRes.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks")
    } finally {
      setLoading(false)
    }
  }, [token, canView, isClient, selectedJobId, page, pageSize])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  useEffect(() => {
    void loadTaskTypesForCreate()
    void loadMaterials()
  }, [loadTaskTypesForCreate, loadMaterials])

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
      const materialsPayload = normalizeTaskMaterialRows(createMaterialRows)
      const body: CreateTaskInJobRequest = {
        taskTypeId: createForm.taskTypeId,
        name: createForm.name,
        description: createForm.description || undefined,
        estimatedTimeMinutes: createForm.estimatedTimeMinutes
          ? Number(createForm.estimatedTimeMinutes)
          : undefined,
        wagePerHour: createForm.wagePerHour ? Number(createForm.wagePerHour) : undefined,
        materials: materialsPayload.length > 0 ? materialsPayload : undefined,
      }
      await createTaskInGardenerJob(token, createForm.jobId, body)
      setShowCreate(false)
      setCreateForm((current) => ({
        ...current,
        taskTypeId: "",
        name: "",
        description: "",
        estimatedTimeMinutes: "",
        wagePerHour: "",
      }))
      setCreateMaterialRows([])
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
      const materialsPayload = normalizeTaskMaterialRows(editMaterialRows)

      if (editForm.finishedAt && !editForm.startedAt) {
        setSubmitError("Finish time requires a start time.")
        setSubmitLoading(false)
        return
      }
      if (editForm.finishedAt && editForm.startedAt) {
        const start = new Date(editForm.startedAt)
        const finish = new Date(editForm.finishedAt)
        if (finish < start) {
          setSubmitError("Finish time cannot be earlier than start time.")
          setSubmitLoading(false)
          return
        }
      }

      const body: UpdateTaskRequest = {
        name: editForm.name || undefined,
        description: editForm.description || undefined,
        actualTimeMinutes: editForm.actualTimeMinutes ? Number(editForm.actualTimeMinutes) : undefined,
        wagePerHour: editForm.wagePerHour ? Number(editForm.wagePerHour) : undefined,
        startedAt: editForm.startedAt ? new Date(editForm.startedAt).toISOString() : undefined,
        finishedAt: editForm.finishedAt ? new Date(editForm.finishedAt).toISOString() : undefined,
        // Backend treats materials as full replacement when this field is sent.
        materials: materialsPayload,
      }
      await updateGardenerTask(token, editing.taskId, body)
      setEditing(null)
      setEditForm({ name: "", description: "", actualTimeMinutes: "", wagePerHour: "", startedAt: "", finishedAt: "" })
      setEditMaterialRows([])
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

  async function openEdit(task: TaskDto) {
    setEditing(task)
    setEditForm({
      name: task.name,
      description: task.description ?? "",
      actualTimeMinutes: task.actualTimeMinutes?.toString() ?? "",
      wagePerHour: task.wagePerHour?.toString() ?? "",
      startedAt: toLocalDateTimeInput(task.startedAt),
      finishedAt: toLocalDateTimeInput(task.finishedAt),
    })
    setEditMaterialRows(
      (task.materials ?? []).map((material) => createMaterialRow(material.materialId, String(material.usedQuantity))),
    )
    setSubmitError(null)

    if (!token) return

    setEditDetailsLoading(true)
    try {
      const fullTask = await getGardenerTaskById(token, task.taskId)
      setEditing(fullTask)
      setEditForm({
        name: fullTask.name,
        description: fullTask.description ?? "",
        actualTimeMinutes: fullTask.actualTimeMinutes?.toString() ?? "",
        wagePerHour: fullTask.wagePerHour?.toString() ?? "",
        startedAt: toLocalDateTimeInput(fullTask.startedAt),
        finishedAt: toLocalDateTimeInput(fullTask.finishedAt),
      })
      setEditMaterialRows(
        (fullTask.materials ?? []).map((material) => createMaterialRow(material.materialId, String(material.usedQuantity))),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load task details")
    } finally {
      setEditDetailsLoading(false)
    }
  }

  if (!canView) {
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

          {canManage && (
            <GlassButton
              type="button"
              onClick={async () => {
                setShowCreate(true)
                setSubmitError(null)
                setCreateForm((current) => ({ ...current, jobId: selectedJobId }))
                await Promise.all([loadTaskTypesForCreate(), loadMaterials()])
              }}
              size="sm"
              disabled={!selectedJobId}
            >
              Add task
            </GlassButton>
          )}
        </div>

        {error && <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{error}</p>}

        {selectedJob && (
          <GlassCard variant="outlined" padding="md">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
              <div>
                <p style={{ margin: 0, opacity: 0.72, fontSize: 12 }}>Job Total Cost</p>
                <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700 }}>{formatCost(selectedJob.totalCost)}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.68 }}>
                  {formatCost(selectedJob.totalMaterialCost)} material + {formatCost(selectedJob.totalLaborCost)} labor
                </p>
              </div>

              <div>
                <p style={{ margin: 0, opacity: 0.72, fontSize: 12 }}>Actual vs Estimated Time</p>
                <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 600 }}>
                  {formatMinutes(selectedJob.totalActualTimeMinutes)} / {formatMinutes(selectedJob.totalEstimatedTimeMinutes)}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 12,
                    color: (selectedJob.timeDifferenceMinutes ?? 0) > 0 ? "#fca5a5" : "#86efac",
                  }}
                >
                  {(selectedJob.timeDifferenceMinutes ?? 0) >= 0 ? "+" : ""}
                  {selectedJob.timeDifferenceMinutes ?? 0} min ({Math.round(selectedJob.actualVsEstimatedPercent ?? 0)}%)
                </p>
              </div>

              <div>
                <p style={{ margin: 0, opacity: 0.72, fontSize: 12 }}>Task Progress</p>
                <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 600 }}>{Math.round(selectedJob.progressPercent ?? 0)}%</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, opacity: 0.68 }}>
                  {selectedJob.finishedTaskCount ?? 0} done · {selectedJob.inProgressTaskCount ?? 0} active · {selectedJob.notStartedTaskCount ?? 0} pending
                </p>
              </div>
            </div>
          </GlassCard>
        )}

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
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Est. min</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Actual min</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Material</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Labor</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Total</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Started</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Finished</th>
                    <th style={{ width: canManage ? 180 : 1 }} />
                  </tr>
                </thead>
                <tbody>
                  {list.map((task) => (
                    <tr key={task.taskId} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <td style={{ padding: "10px 12px" }}>{task.name}</td>
                      <td style={{ padding: "10px 12px" }}>
                        {task.taskTypeName ?? (task.taskTypeId ? (taskTypeNameById.get(task.taskTypeId) ?? task.taskTypeId) : "-")}
                      </td>
                      <td style={{ padding: "10px 12px" }}>{task.estimatedTimeMinutes ?? "-"}</td>
                      <td style={{ padding: "10px 12px" }}>{task.actualTimeMinutes ?? "-"}</td>
                      <td style={{ padding: "10px 12px" }}>{formatCost(task.totalMaterialCost)}</td>
                      <td style={{ padding: "10px 12px" }}>{formatCost(task.totalLaborCost)}</td>
                      <td style={{ padding: "10px 12px" }}><strong>{formatCost(task.totalCost)}</strong></td>
                      <td style={{ padding: "10px 12px" }}>{formatDateTime(task.startedAt)}</td>
                      <td style={{ padding: "10px 12px" }}>{formatDateTime(task.finishedAt)}</td>
                      <td style={{ padding: "10px 12px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        {canManage && (
                          <GlassButton type="button" onClick={() => { void openEdit(task) }} size="xs" variant="secondary">
                            Edit
                          </GlassButton>
                        )}
                        {canManage && (
                          <GlassButton
                            type="button"
                            onClick={() => handleDelete(task)}
                            size="xs"
                            variant="danger"
                            disabled={deletingTaskId === task.taskId}
                          >
                            {deletingTaskId === task.taskId ? "Deleting..." : "Delete"}
                          </GlassButton>
                        )}
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

        {canManage && showCreate && (
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

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <label style={{ fontSize: 13, color: "rgba(247,248,244,0.9)" }}>Materials used (optional)</label>
                  <GlassButton
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => setCreateMaterialRows((current) => [...current, createMaterialRow()])}
                    disabled={materialsLoading || materials.length === 0}
                  >
                    Add material
                  </GlassButton>
                </div>
                {createMaterialRows.map((row) => (
                  <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1fr 140px auto", gap: 8, alignItems: "end" }}>
                    <GlassSelect
                      label="Material"
                      value={row.materialId}
                      onValueChange={(value) => {
                        setCreateMaterialRows((current) => current.map((item) => (
                          item.id === row.id ? { ...item, materialId: value } : item
                        )))
                      }}
                      fullWidth
                    >
                      <GlassSelectTrigger>
                        <GlassSelectValue placeholder={materialsLoading ? "Loading materials..." : "Select material..."} />
                      </GlassSelectTrigger>
                      <GlassSelectContent>
                        {materials.map((material) => (
                          <GlassSelectItem key={material.materialId} value={material.materialId}>
                            {material.name} ({material.amountType}, {material.pricePerAmount.toFixed(2)} DKK)
                          </GlassSelectItem>
                        ))}
                      </GlassSelectContent>
                    </GlassSelect>
                    <GlassInput
                      label="Used qty"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={row.usedQuantity}
                      onChange={(event) => {
                        const value = event.target.value
                        setCreateMaterialRows((current) => current.map((item) => (
                          item.id === row.id ? { ...item, usedQuantity: value } : item
                        )))
                      }}
                      fullWidth
                    />
                    <GlassButton
                      type="button"
                      size="xs"
                      variant="danger"
                      onClick={() => {
                        setCreateMaterialRows((current) => current.filter((item) => item.id !== row.id))
                      }}
                    >
                      Remove
                    </GlassButton>
                  </div>
                ))}
                {!materialsLoading && materials.length === 0 && (
                  <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>
                    No materials available yet. Add materials on the Materials page first.
                  </p>
                )}
                {materialsError && <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{materialsError}</p>}
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
              <GlassInput
                label="Wage per hour (DKK)"
                type="number"
                min="0"
                step="0.01"
                value={createForm.wagePerHour}
                onChange={(e) => setCreateForm((current) => ({ ...current, wagePerHour: e.target.value }))}
                fullWidth
              />

              {submitError && <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{submitError}</p>}

              <div style={{ display: "flex", gap: 12 }}>
                <GlassButton
                  type="button"
                  onClick={() => {
                    setShowCreate(false)
                    setCreateMaterialRows([])
                    setCreateForm((current) => ({ ...current, wagePerHour: "" }))
                  }}
                  variant="secondary"
                  size="sm"
                >
                  Cancel
                </GlassButton>
                <GlassButton type="submit" loading={submitLoading} size="sm">
                  {submitLoading ? "Creating..." : "Create"}
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        )}

        {canManage && editing && (
          <GlassCard variant="elevated" padding="md" style={{ maxWidth: 560 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Edit task</h2>
            <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <div style={{ fontSize: 13 }}>
                  <span style={{ opacity: 0.8 }}>Materials (snapshot)</span><br />
                  <strong>{formatCost(editing.totalMaterialCost)}</strong>
                </div>
                <div style={{ fontSize: 13 }}>
                  <span style={{ opacity: 0.8 }}>Labor</span><br />
                  <strong>{formatCost(editing.totalLaborCost)}</strong>
                </div>
                <div style={{ fontSize: 13 }}>
                  <span style={{ opacity: 0.8 }}>Total</span><br />
                  <strong style={{ color: "rgba(190,255,171,0.95)" }}>{formatCost(editing.totalCost)}</strong>
                </div>
              </div>
              {editDetailsLoading ? (
                <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>Loading task details...</p>
              ) : editing.materials && editing.materials.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                        <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 12, opacity: 0.8 }}>Material</th>
                        <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 12, opacity: 0.8 }}>Used</th>
                        <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 12, opacity: 0.8 }}>Price at save</th>
                        <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 12, opacity: 0.8 }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editing.materials.map((material) => (
                        <tr key={material.materialId} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: "8px 10px" }}>{material.name}</td>
                          <td style={{ padding: "8px 10px" }}>{material.usedQuantity} {material.amountType}</td>
                          <td style={{ padding: "8px 10px" }}>{formatCost(material.pricePerAmount)}</td>
                          <td style={{ padding: "8px 10px" }}>{formatCost(material.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>No materials assigned.</p>
              )}
            </div>
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
                helperText="Auto-set by backend when finish time is provided."
                fullWidth
              />
              <GlassInput
                label="Wage per hour (DKK)"
                type="number"
                min="0"
                step="0.01"
                value={editForm.wagePerHour}
                onChange={(e) => setEditForm((current) => ({ ...current, wagePerHour: e.target.value }))}
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

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <label style={{ fontSize: 13, color: "rgba(247,248,244,0.9)" }}>Materials (full replacement on save)</label>
                  <GlassButton
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => setEditMaterialRows((current) => [...current, createMaterialRow()])}
                    disabled={materialsLoading || materials.length === 0}
                  >
                    Add material
                  </GlassButton>
                </div>
                {editMaterialRows.map((row) => (
                  <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1fr 140px auto", gap: 8, alignItems: "end" }}>
                    <GlassSelect
                      label="Material"
                      value={row.materialId}
                      onValueChange={(value) => {
                        setEditMaterialRows((current) => current.map((item) => (
                          item.id === row.id ? { ...item, materialId: value } : item
                        )))
                      }}
                      fullWidth
                    >
                      <GlassSelectTrigger>
                        <GlassSelectValue placeholder={materialsLoading ? "Loading materials..." : "Select material..."} />
                      </GlassSelectTrigger>
                      <GlassSelectContent>
                        {materials.map((material) => (
                          <GlassSelectItem key={material.materialId} value={material.materialId}>
                            {material.name} ({material.amountType}, {material.pricePerAmount.toFixed(2)} DKK)
                          </GlassSelectItem>
                        ))}
                      </GlassSelectContent>
                    </GlassSelect>
                    <GlassInput
                      label="Used qty"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={row.usedQuantity}
                      onChange={(event) => {
                        const value = event.target.value
                        setEditMaterialRows((current) => current.map((item) => (
                          item.id === row.id ? { ...item, usedQuantity: value } : item
                        )))
                      }}
                      fullWidth
                    />
                    <GlassButton
                      type="button"
                      size="xs"
                      variant="danger"
                      onClick={() => {
                        setEditMaterialRows((current) => current.filter((item) => item.id !== row.id))
                      }}
                    >
                      Remove
                    </GlassButton>
                  </div>
                ))}
              </div>

              {submitError && <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{submitError}</p>}

              <div style={{ display: "flex", gap: 12 }}>
                <GlassButton
                  type="button"
                  onClick={() => {
                    setEditing(null)
                    setEditForm({ name: "", description: "", actualTimeMinutes: "", wagePerHour: "", startedAt: "", finishedAt: "" })
                    setEditMaterialRows([])
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