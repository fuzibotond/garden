import { useCallback, useEffect, useState } from "react"
import { GlassButton, GlassCard, GlassInput, GlassSwitch } from "../../components/ui/GlassUI"
import AdminLayout from "../../components/layout/AdminLayout"
import { getAccessToken, getCurrentUser, hasRole } from "../../lib/auth"
import {
  createAdminClient,
  deleteAdminClient,
  deleteGardenerClient,
  getAdminClients,
  getGardenerClients,
  inviteClientAsGardener,
  updateAdminClient,
  updateGardenerClient,
  type AdminClientDto,
  type CreateClientRequest,
  type GardenerClientDto,
  type UpdateClientRequest,
} from "../../services/apiClient"

type ClientRow = AdminClientDto | GardenerClientDto

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

export default function ClientsPage() {
  const token = getAccessToken()
  const user = getCurrentUser()
  const isAdmin = hasRole(user, "Admin")
  const isGardener = hasRole(user, "Gardener")
  const canManage = isAdmin || isGardener

  const [list, setList] = useState<ClientRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [showAccepted, setShowAccepted] = useState(false)
  const [editing, setEditing] = useState<ClientRow | null>(null)
  const [createForm, setCreateForm] = useState<CreateClientRequest>({
    email: "",
    fullName: "",
    password: "",
  })
  const [editForm, setEditForm] = useState<UpdateClientRequest>({})
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token || !canManage) return
    setLoading(true)
    setError(null)
    try {
      if (isAdmin) {
        const res = await getAdminClients(token, page, pageSize)
        setList(res.items)
        setTotal(res.total)
      } else {
        const res = await getGardenerClients(token, page, pageSize)
        setList(res.items)
        setTotal(res.total)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clients")
    } finally {
      setLoading(false)
    }
  }, [token, canManage, isAdmin, page, pageSize])

  useEffect(() => {
    void load()
  }, [load])

  function getClientId(c: ClientRow): string {
    return "clientId" in c ? c.clientId : (c as AdminClientDto).clientId
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setSubmitLoading(true)
    setSubmitError(null)
    try {
      if (isAdmin) {
        await createAdminClient(token, { email: createForm.email })
      } else {
        await inviteClientAsGardener(token, { email: createForm.email })
      }
      setShowCreate(false)
      setShowInvite(false)
      setCreateForm({ email: "", fullName: "", password: "" })
      void load()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create client")
    } finally {
      setSubmitLoading(false)
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !editing) return
    setSubmitLoading(true)
    setSubmitError(null)
    const id = getClientId(editing)
    try {
      if (isAdmin) {
        await updateAdminClient(token, id, editForm)
      } else {
        await updateGardenerClient(token, id, editForm)
      }
      setEditing(null)
      setEditForm({})
      void load()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to update client")
    } finally {
      setSubmitLoading(false)
    }
  }

  async function handleDelete(client: ClientRow) {
    if (!token) return
    const id = getClientId(client)
    if (deletingClientId === id) return
    if (!window.confirm(`Delete client "${client.fullName}"?`)) return
    setDeletingClientId(id)
    try {
      if (isAdmin) {
        await deleteAdminClient(token, id)
      } else {
        await deleteGardenerClient(token, id)
      }
      void load()
    } catch (err) {
      if (isAlreadyDeletedError(err)) {
        void load()
        return
      }
      setError(err instanceof Error ? err.message : "Failed to delete client")
    } finally {
      setDeletingClientId((current) => (current === id ? null : current))
    }
  }

  function openEdit(c: ClientRow) {
    setEditing(c)
    setEditForm({
      fullName: c.fullName,
      email: c.email,
    })
    setSubmitError(null)
  }

  function toStatusLabel(status: string | null | undefined): string {
    if (!status) return "Not invited"
    return status
  }

  function formatDate(value: string | null | undefined): string {
    if (!value) return "-"
    return new Date(value).toLocaleDateString("da-DK")
  }

  function getStatusPillStyle(status: string | null | undefined): React.CSSProperties {
    const normalized = (status ?? "").toLowerCase()

    if (normalized === "accepted") {
      return {
        border: "1px solid rgba(74, 222, 128, 0.45)",
        background: "rgba(20, 83, 45, 0.7)",
        color: "#bbf7d0",
      }
    }

    if (normalized === "pending") {
      return {
        border: "1px solid rgba(253, 224, 71, 0.45)",
        background: "rgba(113, 63, 18, 0.55)",
        color: "#fde68a",
      }
    }

    if (normalized === "expired") {
      return {
        border: "1px solid rgba(248, 113, 113, 0.45)",
        background: "rgba(127, 29, 29, 0.45)",
        color: "#fecaca",
      }
    }

    if (normalized === "revoked") {
      return {
        border: "1px solid rgba(251, 146, 60, 0.45)",
        background: "rgba(124, 45, 18, 0.45)",
        color: "#fed7aa",
      }
    }

    return {
      border: "1px solid rgba(148, 163, 184, 0.45)",
      background: "rgba(30, 41, 59, 0.45)",
      color: "#cbd5e1",
    }
  }

  const filteredList = list.filter((client) => {
    const status = (client.invitationStatus ?? "").toLowerCase()
    if (showAccepted) return status === "accepted"
    return status === "pending"
  })

  const visibleList = filteredList

  if (!canManage) {
    return (
      <AdminLayout title="Clients">
        <GlassCard variant="outlined" padding="md">You don't have access to this page.</GlassCard>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Clients">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            {visibleList.length} {showAccepted ? "accepted" : "pending"} client{visibleList.length !== 1 ? "s" : ""}
          </p>
          <div style={{ display: "flex", gap: 12, marginLeft: "auto", alignItems: "center" }}>
            {canManage && (
              <GlassSwitch
                checked={showAccepted}
                onCheckedChange={setShowAccepted}
                label={showAccepted ? "Accepted" : "Pending"}
              />
            )}
            {isAdmin && (
              <GlassButton
                type="button"
                onClick={() => {
                  setShowCreate(true)
                  setSubmitError(null)
                }}
                size="sm"
              >
                Add client
              </GlassButton>
            )}
            {isGardener && (
              <GlassButton
                type="button"
                onClick={() => {
                  setShowInvite(true)
                  setSubmitError(null)
                }}
                variant="secondary"
                size="sm"
              >
                Invite client
              </GlassButton>
            )}
          </div>
        </div>

        {error && <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{error}</p>}

        <GlassCard variant="elevated" padding="md">
          {loading ? (
            <p>Loading...</p>
          ) : visibleList.length === 0 ? (
            <p style={{ margin: 0 }}>
              No {showAccepted ? "accepted" : "pending"} clients on this page.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>
                      Name
                    </th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>
                      Email
                    </th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>
                      Invitation status
                    </th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>
                      Sent
                    </th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>
                      Accepted
                    </th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>
                      Expires
                    </th>
                    <th style={{ width: 220 }} />
                  </tr>
                </thead>
                <tbody>
                  {visibleList.map((c) => (
                    <tr key={getClientId(c)} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <td style={{ padding: "10px 12px" }}>{c.fullName}</td>
                      <td style={{ padding: "10px 12px" }}>{c.email}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "3px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            ...getStatusPillStyle(c.invitationStatus),
                          }}
                        >
                          {toStatusLabel(c.invitationStatus)}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>{formatDate(c.invitationSentAt)}</td>
                      <td style={{ padding: "10px 12px" }}>{formatDate(c.invitationAcceptedAt)}</td>
                      <td style={{ padding: "10px 12px" }}>{formatDate(c.invitationExpiresAt)}</td>
                      <td style={{ padding: "10px 12px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <GlassButton type="button" onClick={() => openEdit(c)} size="xs" variant="secondary">
                          Edit
                        </GlassButton>
                        <GlassButton
                          type="button"
                          onClick={() => handleDelete(c)}
                          size="xs"
                          variant="danger"
                          disabled={deletingClientId === getClientId(c)}
                        >
                          {deletingClientId === getClientId(c) ? "Deleting..." : "Delete"}
                        </GlassButton>
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / pageSize)}
                size="xs"
                variant="ghost"
              >
                Next
              </GlassButton>
            </div>
          )}
        </GlassCard>

        {showCreate && isAdmin && (
          <GlassCard variant="elevated" padding="md" style={{ maxWidth: 480 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Create client</h2>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GlassInput
                label="Full name"
                type="text"
                required
                value={createForm.fullName}
                onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
                fullWidth
              />
              <GlassInput
                label="Email"
                type="email"
                required
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                fullWidth
              />
              <GlassInput
                label="Password (optional)"
                type="password"
                value={createForm.password ?? ""}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Leave blank to generate"
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

        {showInvite && isGardener && (
          <GlassCard variant="elevated" padding="md" style={{ maxWidth: 480 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Invite client</h2>
            <p style={{ marginTop: 0, marginBottom: 16, fontSize: 14 }}>
              Send an invitation email so your client can activate their own account.
            </p>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GlassInput
                label="Client email"
                type="email"
                required
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                fullWidth
              />
              {submitError && <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{submitError}</p>}
              <div style={{ display: "flex", gap: 12 }}>
                <GlassButton
                  type="button"
                  onClick={() => {
                    setShowInvite(false)
                    setCreateForm({ email: "", fullName: "", password: "" })
                  }}
                  variant="secondary"
                  size="sm"
                >
                  Cancel
                </GlassButton>
                <GlassButton type="submit" loading={submitLoading} size="sm">
                  {submitLoading ? "Sending..." : "Send invite"}
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        )}

        {editing && (
          <GlassCard variant="elevated" padding="md" style={{ maxWidth: 480 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Edit client</h2>
            <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GlassInput
                label="Full name"
                type="text"
                required
                value={editForm.fullName ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                fullWidth
              />
              <GlassInput
                label="Email"
                type="email"
                required
                value={editForm.email ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                fullWidth
              />
              {submitError && <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{submitError}</p>}
              <div style={{ display: "flex", gap: 12 }}>
                <GlassButton
                  type="button"
                  onClick={() => {
                    setEditing(null)
                    setEditForm({})
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
