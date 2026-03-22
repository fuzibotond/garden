import { useCallback, useEffect, useState } from "react"
import { GlassButton, GlassCard, GlassInput } from "../../components/ui/GlassUI"
import AdminLayout from "../../components/layout/AdminLayout"
import {
  createAdminGardener,
  deleteAdminGardener,
  getAdminGardeners,
  updateAdminGardener,
  type AdminGardenerClientDto,
  type AdminGardenerDto,
  type CreateGardenerRequest,
  type UpdateGardenerRequest,
} from "../../services/apiClient"
import { getAccessToken, getCurrentUser, hasRole } from "../../lib/auth"

export default function GardenersPage() {
  const token = getAccessToken()
  const user = getCurrentUser()
  const isAdmin = hasRole(user, "Admin")
  const [list, setList] = useState<AdminGardenerDto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<AdminGardenerDto | null>(null)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [createForm, setCreateForm] = useState<CreateGardenerRequest>({
    email: "",
    password: "",
    companyName: "",
    contactName: "",
  })
  const [editForm, setEditForm] = useState<UpdateGardenerRequest>({})
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token || !isAdmin) return
    setLoading(true)
    setError(null)
    try {
      const res = await getAdminGardeners(token, page, pageSize)
      setList(res.items)
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load gardeners")
    } finally {
      setLoading(false)
    }
  }, [token, isAdmin, page, pageSize])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setSubmitLoading(true)
    setSubmitError(null)
    try {
      await createAdminGardener(token, createForm)
      setShowCreate(false)
      setCreateForm({ email: "", password: "", companyName: "", contactName: "" })
      void load()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create gardener")
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
      await updateAdminGardener(token, editing.gardenerId, editForm)
      setEditing(null)
      setEditForm({})
      void load()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to update gardener")
    } finally {
      setSubmitLoading(false)
    }
  }

  async function handleDelete(gardener: AdminGardenerDto) {
    if (!token) return
    if (!window.confirm(`Delete gardener "${gardener.contactName || gardener.email}"?`)) return
    try {
      await deleteAdminGardener(token, gardener.gardenerId)
      void load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete gardener")
    }
  }

  function openEdit(g: AdminGardenerDto) {
    setEditing(g)
    setEditForm({
      email: g.email,
      companyName: g.companyName ?? "",
      contactName: g.contactName ?? "",
    })
    setSubmitError(null)
  }

  function toggleDetails(gardenerId: string) {
    setExpandedRows((current) => ({
      ...current,
      [gardenerId]: !current[gardenerId],
    }))
  }

  function renderClientsTable(clients: AdminGardenerClientDto[] | undefined) {
    if (!clients || clients.length === 0) {
      return <p style={{ margin: 0, fontSize: 13 }}>This gardener has no clients yet.</p>
    }

    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>
                Client name
              </th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>
                Email
              </th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.clientId} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "10px 12px" }}>{client.fullName}</td>
                <td style={{ padding: "10px 12px" }}>{client.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <AdminLayout title="Gardeners">
        <GlassCard variant="outlined" padding="md">You don’t have access to this page.</GlassCard>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Gardeners">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            {total} gardener{total !== 1 ? "s" : ""} total
          </p>
          <GlassButton
            type="button"
            onClick={() => {
              setShowCreate(true)
              setSubmitError(null)
            }}
            size="sm"
          >
            Add gardener
          </GlassButton>
        </div>

        {error && (
          <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{error}</p>
        )}

        <GlassCard variant="elevated" padding="md">
          {loading ? (
            <p>Loading…</p>
          ) : list.length === 0 ? (
            <p style={{ margin: 0 }}>No gardeners yet. Create one to get started.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>
                      Contact
                    </th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>
                      Email
                    </th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>
                      Company
                    </th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>
                      Clients
                    </th>
                    <th style={{ width: 260 }} />
                  </tr>
                </thead>
                <tbody>
                  {list.map((g) => {
                    const isExpanded = !!expandedRows[g.gardenerId]

                    return (
                      <>
                        <tr key={g.gardenerId} style={{ borderBottom: isExpanded ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
                          <td style={{ padding: "10px 12px" }}>{g.contactName ?? "—"}</td>
                          <td style={{ padding: "10px 12px" }}>{g.email}</td>
                          <td style={{ padding: "10px 12px" }}>{g.companyName ?? "—"}</td>
                          <td style={{ padding: "10px 12px" }}>{g.clientsCount ?? g.clients?.length ?? 0}</td>
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                            <GlassButton
                              type="button"
                              onClick={() => toggleDetails(g.gardenerId)}
                              size="xs"
                              variant="ghost"
                              style={{ marginRight: 8 }}
                            >
                              {isExpanded ? "Hide details ▲" : "Show details ▼"}
                            </GlassButton>
                            <GlassButton
                              type="button"
                              onClick={() => openEdit(g)}
                              size="xs"
                              variant="secondary"
                              style={{ marginRight: 8 }}
                            >
                              Edit
                            </GlassButton>
                            <GlassButton
                              type="button"
                              onClick={() => handleDelete(g)}
                              size="xs"
                              variant="danger"
                            >
                              Delete
                            </GlassButton>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${g.gardenerId}-details`} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <td colSpan={5} style={{ padding: "0 12px 14px" }}>
                              <div
                                style={{
                                  marginTop: 4,
                                  borderRadius: 18,
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  background: "rgba(255,255,255,0.03)",
                                  padding: 14,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 10,
                                  }}
                                >
                                  <h3 style={{ margin: 0, fontSize: 14 }}>Clients of {g.companyName ?? g.email}</h3>
                                  <span style={{ fontSize: 12, opacity: 0.75 }}>
                                    {g.clientsCount ?? g.clients?.length ?? 0} total
                                  </span>
                                </div>
                                {renderClientsTable(g.clients)}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
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

        {showCreate && (
          <GlassCard variant="elevated" padding="md" style={{ maxWidth: 480 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Create gardener</h2>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GlassInput label="Email" type="email" required value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} fullWidth />
              <GlassInput label="Password" type="password" required value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} fullWidth />
              <GlassInput label="Company name" type="text" required value={createForm.companyName} onChange={(e) => setCreateForm((f) => ({ ...f, companyName: e.target.value }))} fullWidth />
              <GlassInput label="Contact name" type="text" required value={createForm.contactName} onChange={(e) => setCreateForm((f) => ({ ...f, contactName: e.target.value }))} fullWidth />
              {submitError && (
                <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{submitError}</p>
              )}
              <div style={{ display: "flex", gap: 12 }}>
                <GlassButton type="button" onClick={() => setShowCreate(false)} variant="secondary" size="sm">
                  Cancel
                </GlassButton>
                <GlassButton type="submit" loading={submitLoading} size="sm">
                  {submitLoading ? "Creating…" : "Create"}
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        )}

        {editing && (
          <GlassCard variant="elevated" padding="md" style={{ maxWidth: 480 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Edit gardener</h2>
            <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GlassInput label="Email" type="email" required value={editForm.email ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} fullWidth />
              <GlassInput label="Company name" type="text" value={editForm.companyName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, companyName: e.target.value }))} fullWidth />
              <GlassInput label="Contact name" type="text" value={editForm.contactName ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, contactName: e.target.value }))} fullWidth />
              {submitError && (
                <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{submitError}</p>
              )}
              <div style={{ display: "flex", gap: 12 }}>
                <GlassButton type="button" onClick={() => { setEditing(null); setEditForm({}) }} variant="secondary" size="sm">
                  Cancel
                </GlassButton>
                <GlassButton type="submit" loading={submitLoading} size="sm">
                  {submitLoading ? "Saving…" : "Save"}
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        )}
      </div>
    </AdminLayout>
  )
}
