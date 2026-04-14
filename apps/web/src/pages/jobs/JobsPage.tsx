import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
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
  closeGardenerJob,
  createGardenerJob,
  deleteGardenerJob,
  downloadClientJobInvoice,
  downloadGardenerJobInvoice,
  getAdminClients,
  getAdminGardeners,
  getClientJobs,
  getGardenerClients,
  getGardenerJobs,
  updateGardenerJob,
  type CreateJobRequest,
  type JobDto,
  type UpdateJobRequest,
} from "../../services/apiClient"

type JobFormState = {
  clientId: string
  name: string
  gardenerIds: string[]
}

const gardenerChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(190, 255, 171, 0.24)",
  background: "rgba(255, 255, 255, 0.03)",
  fontSize: 12,
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

function formatCost(value: number | undefined): string {
  if (value == null) return "-"
  return `${value.toFixed(2)} DKK`
}

function formatMinutes(value: number | undefined): string {
  if (value == null) return "-"
  return `${value} min`
}

function isJobClosable(job: JobDto): boolean {
  return (job.progressPercent ?? 0) >= 100
}

export default function JobsPage() {
  const navigate = useNavigate()
  const token = getAccessToken()
  const user = getCurrentUser()
  const isAdmin = hasRole(user, "Admin")
  const isGardener = hasRole(user, "Gardener")
  const isClient = hasRole(user, "Client")
  const canView = isAdmin || isGardener || isClient
  const canManage = isAdmin || isGardener

  const [list, setList] = useState<JobDto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [clients, setClients] = useState<Array<{ id: string; fullName: string; email: string }>>([])
  const [gardeners, setGardeners] = useState<Array<{ id: string; label: string }>>([])

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<JobDto | null>(null)
  const [createForm, setCreateForm] = useState<JobFormState>({
    clientId: "",
    name: "",
    gardenerIds: [],
  })
  const [editForm, setEditForm] = useState<UpdateJobRequest>({
    name: "",
    gardenerIds: [],
  })
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null)
  const [closingJobId, setClosingJobId] = useState<string | null>(null)
  const [downloadingInvoiceJobId, setDownloadingInvoiceJobId] = useState<string | null>(null)

  const clientLabelById = useMemo(() => {
    const map = new Map<string, string>()
    clients.forEach((client) => {
      map.set(client.id, client.fullName || client.email)
    })
    return map
  }, [clients])

  const gardenerLabelById = useMemo(() => {
    const map = new Map<string, string>()
    gardeners.forEach((gardener) => {
      map.set(gardener.id, gardener.label)
    })
    return map
  }, [gardeners])

  const load = useCallback(async () => {
    if (!token || !canView) return
    setLoading(true)
    setError(null)
    try {
      const jobsRes = isClient
        ? await getClientJobs(token, page, pageSize)
        : await getGardenerJobs(token, page, pageSize)

      setList(jobsRes.items)
      setTotal(jobsRes.total)

      if (isClient) {
        setClients([])
        setGardeners([])
      } else {
        const clientsRes = isAdmin
          ? await getAdminClients(token, 1, 200)
          : await getGardenerClients(token, 1, 200)

        setClients(
          clientsRes.items.map((client) => ({
            id: client.clientId,
            fullName: client.fullName,
            email: client.email,
          })),
        )
      }

      if (isAdmin) {
        const gardenersRes = await getAdminGardeners(token, 1, 200)
        setGardeners(
          gardenersRes.items.map((gardener) => ({
            id: gardener.gardenerId,
            label: gardener.contactName || gardener.companyName || gardener.email,
          })),
        )
      } else {
        setGardeners([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs")
    } finally {
      setLoading(false)
    }
  }, [token, canView, isAdmin, isClient, page, pageSize])

  useEffect(() => {
    void load()
  }, [load])

  function toggleGardener(target: "create" | "edit", gardenerId: string) {
    if (target === "create") {
      setCreateForm((current) => {
        const alreadySelected = current.gardenerIds.includes(gardenerId)
        return {
          ...current,
          gardenerIds: alreadySelected
            ? current.gardenerIds.filter((id) => id !== gardenerId)
            : [...current.gardenerIds, gardenerId],
        }
      })
      return
    }

    setEditForm((current) => {
      const currentIds = current.gardenerIds ?? []
      const alreadySelected = currentIds.includes(gardenerId)
      return {
        ...current,
        gardenerIds: alreadySelected
          ? currentIds.filter((id) => id !== gardenerId)
          : [...currentIds, gardenerId],
      }
    })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setSubmitLoading(true)
    setSubmitError(null)
    try {
      const body: CreateJobRequest = {
        clientId: createForm.clientId,
        name: createForm.name,
        gardenerIds: isAdmin ? createForm.gardenerIds : [],
      }
      await createGardenerJob(token, body)
      setShowCreate(false)
      setCreateForm({ clientId: "", name: "", gardenerIds: [] })
      void load()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create job")
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
      await updateGardenerJob(token, editing.jobId, {
        name: editForm.name,
        gardenerIds: isAdmin ? editForm.gardenerIds : undefined,
      })
      setEditing(null)
      setEditForm({ name: "", gardenerIds: [] })
      void load()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to update job")
    } finally {
      setSubmitLoading(false)
    }
  }

  async function handleDelete(job: JobDto) {
    if (!token) return
    if (deletingJobId === job.jobId) return
    if (!window.confirm(`Delete job "${job.name}"?`)) return
    setDeletingJobId(job.jobId)
    try {
      await deleteGardenerJob(token, job.jobId)
      void load()
    } catch (err) {
      if (isAlreadyDeletedError(err)) {
        void load()
        return
      }
      setError(err instanceof Error ? err.message : "Failed to delete job")
    } finally {
      setDeletingJobId((current) => (current === job.jobId ? null : current))
    }
  }

  async function handleClose(job: JobDto) {
    if (!token) return
    if (closingJobId === job.jobId) return
    if (!isJobClosable(job)) {
      setError("Only 100% completed jobs can be closed")
      return
    }
    if (!window.confirm(`Close job "${job.name}"?\nAll tasks must be finished. This action cannot be undone.`)) return
    setClosingJobId(job.jobId)
    try {
      await closeGardenerJob(token, job.jobId)
      void load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close job")
    } finally {
      setClosingJobId((current) => (current === job.jobId ? null : current))
    }
  }

  async function handleDownloadInvoice(job: JobDto) {
    if (!token) return
    if (downloadingInvoiceJobId === job.jobId) return
    setDownloadingInvoiceJobId(job.jobId)
    try {
      if (isClient) {
        await downloadClientJobInvoice(token, job.jobId, job.invoiceNumber)
      } else {
        await downloadGardenerJobInvoice(token, job.jobId, job.invoiceNumber)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download invoice")
    } finally {
      setDownloadingInvoiceJobId((current) => (current === job.jobId ? null : current))
    }
  }

  function openEdit(job: JobDto) {
    const initialGardenerIds =
      job.linkedGardeners?.map((gardener) => gardener.id)
      ?? job.gardenerIds
      ?? []

    setEditing(job)
    setEditForm({
      name: job.name,
      gardenerIds: initialGardenerIds,
    })
    setSubmitError(null)
  }

  function renderClientLabel(job: JobDto): string {
    if (job.client?.name) {
      return job.client.email ? `${job.client.name} (${job.client.email})` : job.client.name
    }
    if (job.clientId) {
      return clientLabelById.get(job.clientId) ?? job.clientId
    }
    return "-"
  }

  function renderAssignedGardeners(job: JobDto): string {
    if (job.linkedGardeners && job.linkedGardeners.length > 0) {
      return job.linkedGardeners
        .map((gardener) => gardener.name || gardener.email || gardener.id.slice(0, 8))
        .join(", ")
    }
    if (!job.gardenerIds || job.gardenerIds.length === 0) return "-"
    return job.gardenerIds
      .map((id) => gardenerLabelById.get(id) ?? id.slice(0, 8))
      .join(", ")
  }

  if (!canView) {
    return (
      <AdminLayout title="Jobs">
        <GlassCard variant="outlined" padding="md">You do not have access to this page.</GlassCard>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Jobs">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            {total} job{total !== 1 ? "s" : ""} total
          </p>
          {canManage && (
            <GlassButton
              type="button"
              onClick={() => {
                setShowCreate(true)
                setSubmitError(null)
              }}
              size="sm"
            >
              Add job
            </GlassButton>
          )}
        </div>

        {error && <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{error}</p>}

        <GlassCard variant="elevated" padding="md">
          {loading ? (
            <p>Loading jobs...</p>
          ) : list.length === 0 ? (
            <p style={{ margin: 0 }}>No jobs yet. Create one to get started.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Name</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Client</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Assigned gardeners</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8, minWidth: 160 }}>Progress</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8, minWidth: 220 }}>Finance / Time</th>
                    <th style={{ width: canManage ? 320 : 160 }} />
                  </tr>
                </thead>
                <tbody>
                  {list.map((job) => (
                    <tr key={job.jobId} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <span>{job.name}</span>
                        {job.isClosed && (
                          <span style={{ marginLeft: 8, fontSize: 10, padding: "2px 7px", borderRadius: 999, background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)", verticalAlign: "middle" }}>
                            Closed
                          </span>
                        )}
                        {job.invoiceNumber && (
                          <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>{job.invoiceNumber}</div>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px" }}>{renderClientLabel(job)}</td>
                      <td style={{ padding: "10px 12px" }}>{renderAssignedGardeners(job)}</td>
                      <td style={{ padding: "10px 12px", minWidth: 160 }}>
                        {job.taskCount != null && job.taskCount > 0 ? (
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                              <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
                                <div style={{ height: "100%", borderRadius: 3, background: "#4ade80", width: `${Math.round(job.progressPercent ?? 0)}%`, transition: "width 0.3s" }} />
                              </div>
                              <span style={{ fontSize: 11, opacity: 0.8, whiteSpace: "nowrap" }}>{Math.round(job.progressPercent ?? 0)}%</span>
                            </div>
                            <div style={{ fontSize: 11, opacity: 0.6 }}>
                              {job.finishedTaskCount ?? 0} done � {job.inProgressTaskCount ?? 0} active � {job.notStartedTaskCount ?? 0} pending
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, opacity: 0.5 }}>No tasks</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", minWidth: 220 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                          <div>
                            <strong>{formatCost(job.totalCost)}</strong>
                            <span style={{ opacity: 0.65 }}> ({formatCost(job.totalMaterialCost)} mat + {formatCost(job.totalLaborCost)} labor)</span>
                          </div>
                          <div style={{ opacity: 0.8 }}>
                            {formatMinutes(job.totalActualTimeMinutes)} / {formatMinutes(job.totalEstimatedTimeMinutes)}
                            <span style={{ marginLeft: 6, color: (job.timeDifferenceMinutes ?? 0) > 0 ? "#fca5a5" : "#86efac" }}>
                              {(job.timeDifferenceMinutes ?? 0) >= 0 ? "+" : ""}
                              {job.timeDifferenceMinutes ?? 0} min
                            </span>
                            <span style={{ opacity: 0.65, marginLeft: 6 }}>
                              ({Math.round(job.actualVsEstimatedPercent ?? 0)}%)
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <GlassButton type="button" onClick={() => navigate(`/admin/tasks?jobId=${job.jobId}`)} size="xs" variant="ghost">
                          Open tasks
                        </GlassButton>
                        {job.isClosed && (
                          <GlassButton
                            type="button"
                            onClick={() => { void handleDownloadInvoice(job) }}
                            size="xs"
                            variant="secondary"
                            disabled={downloadingInvoiceJobId === job.jobId}
                          >
                            {downloadingInvoiceJobId === job.jobId ? "Downloading..." : "Invoice"}
                          </GlassButton>
                        )}
                        {canManage && !job.isClosed && isJobClosable(job) && (
                          <GlassButton
                            type="button"
                            onClick={() => { void handleClose(job) }}
                            size="xs"
                            variant="secondary"
                            disabled={closingJobId === job.jobId}
                          >
                            {closingJobId === job.jobId ? "Closing..." : "Close job"}
                          </GlassButton>
                        )}
                        {canManage && !job.isClosed && (
                          <GlassButton type="button" onClick={() => openEdit(job)} size="xs" variant="secondary">
                            Edit
                          </GlassButton>
                        )}
                        {canManage && !job.isClosed && (
                          <GlassButton
                            type="button"
                            onClick={() => { void handleDelete(job) }}
                            size="xs"
                            variant="danger"
                            disabled={deletingJobId === job.jobId}
                          >
                            {deletingJobId === job.jobId ? "Deleting..." : "Delete"}
                          </GlassButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {total > pageSize && (
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
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Create job</h2>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GlassInput
                label="Job name"
                type="text"
                required
                value={createForm.name}
                onChange={(e) => setCreateForm((current) => ({ ...current, name: e.target.value }))}
                fullWidth
              />

              <GlassSelect
                label="Client"
                value={createForm.clientId}
                onValueChange={(value) => setCreateForm((current) => ({ ...current, clientId: value }))}
                required
                fullWidth
              >
                <GlassSelectTrigger>
                  <GlassSelectValue placeholder="Select client..." />
                </GlassSelectTrigger>
                <GlassSelectContent>
                  {clients.map((client) => (
                    <GlassSelectItem key={client.id} value={client.id}>
                      {client.fullName} ({client.email})
                    </GlassSelectItem>
                  ))}
                </GlassSelectContent>
              </GlassSelect>

              {isAdmin && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 13, color: "rgba(247,248,244,0.9)" }}>Assign gardeners</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {gardeners.map((gardener) => (
                      <label key={gardener.id} style={gardenerChipStyle}>
                        <input
                          type="checkbox"
                          checked={createForm.gardenerIds.includes(gardener.id)}
                          onChange={() => toggleGardener("create", gardener.id)}
                        />
                        <span>{gardener.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

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

        {canManage && editing && !editing.isClosed && (
          <GlassCard variant="elevated" padding="md" style={{ maxWidth: 560 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Edit job</h2>
            <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GlassInput
                label="Job name"
                type="text"
                required
                value={editForm.name ?? ""}
                onChange={(e) => setEditForm((current) => ({ ...current, name: e.target.value }))}
                fullWidth
              />

              {isAdmin && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 13, color: "rgba(247,248,244,0.9)" }}>Assign gardeners</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {gardeners.map((gardener) => (
                      <label key={gardener.id} style={gardenerChipStyle}>
                        <input
                          type="checkbox"
                          checked={(editForm.gardenerIds ?? []).includes(gardener.id)}
                          onChange={() => toggleGardener("edit", gardener.id)}
                        />
                        <span>{gardener.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {submitError && <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{submitError}</p>}

              <div style={{ display: "flex", gap: 12 }}>
                <GlassButton
                  type="button"
                  onClick={() => {
                    setEditing(null)
                    setEditForm({ name: "", gardenerIds: [] })
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
