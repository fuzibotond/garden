import { useCallback, useEffect, useState } from "react"
import AdminLayout from "../../components/layout/AdminLayout"
import {
  createAdminGardener,
  deleteAdminGardener,
  getAdminGardeners,
  updateAdminGardener,
  type AdminGardenerDto,
  type CreateGardenerRequest,
  type UpdateGardenerRequest,
} from "../../services/apiClient"
import { getAccessToken, getCurrentUser, hasRole } from "../../lib/auth"

const inputStyle = {
  width: "100%" as const,
  marginTop: 4,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.18)",
  padding: "8px 12px",
  backgroundColor: "rgba(3,15,8,0.9)",
  color: "white",
  outline: "none" as const,
}

const primaryButtonStyle = {
  borderRadius: 999,
  border: "none" as const,
  padding: "8px 16px",
  background: "linear-gradient(135deg, #d9ff6a 0%, #9dff4f 40%, #4fe368 100%)",
  color: "#071108",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer" as const,
}

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

  if (!isAdmin) {
    return (
      <AdminLayout title="Gardeners">
        <p className="glass-card glass-card--soft">You don’t have access to this page.</p>
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
          <button
            type="button"
            onClick={() => {
              setShowCreate(true)
              setSubmitError(null)
            }}
            style={primaryButtonStyle}
          >
            Add gardener
          </button>
        </div>

        {error && (
          <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{error}</p>
        )}

        <div className="glass-card glass-card--soft">
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
                    <th style={{ width: 120 }} />
                  </tr>
                </thead>
                <tbody>
                  {list.map((g) => (
                    <tr key={g.gardenerId} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <td style={{ padding: "10px 12px" }}>{g.contactName ?? "—"}</td>
                      <td style={{ padding: "10px 12px" }}>{g.email}</td>
                      <td style={{ padding: "10px 12px" }}>{g.companyName ?? "—"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <button
                          type="button"
                          onClick={() => openEdit(g)}
                          style={{
                            marginRight: 8,
                            padding: "4px 10px",
                            fontSize: 12,
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,0.25)",
                            background: "transparent",
                            color: "inherit",
                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(g)}
                          style={{
                            padding: "4px 10px",
                            fontSize: 12,
                            borderRadius: 999,
                            border: "1px solid rgba(248,113,113,0.5)",
                            background: "rgba(127,29,29,0.4)",
                            color: "#fee2e2",
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {total > pageSize && (
            <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "transparent",
                  color: "inherit",
                  cursor: page <= 1 ? "default" : "pointer",
                  opacity: page <= 1 ? 0.5 : 1,
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: 13 }}>
                Page {page} of {Math.ceil(total / pageSize)}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / pageSize)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "transparent",
                  color: "inherit",
                  cursor: page >= Math.ceil(total / pageSize) ? "default" : "pointer",
                  opacity: page >= Math.ceil(total / pageSize) ? 0.5 : 1,
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {showCreate && (
          <div className="glass-card glass-card--soft" style={{ maxWidth: 480 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Create gardener</h2>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>Email</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>Password</label>
                <input
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>Company name</label>
                <input
                  type="text"
                  required
                  value={createForm.companyName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, companyName: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>Contact name</label>
                <input
                  type="text"
                  required
                  value={createForm.contactName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, contactName: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              {submitError && (
                <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{submitError}</p>
              )}
              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ ...primaryButtonStyle, background: "rgba(255,255,255,0.1)", color: "inherit" }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitLoading} style={{ ...primaryButtonStyle, opacity: submitLoading ? 0.7 : 1 }}>
                  {submitLoading ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        )}

        {editing && (
          <div className="glass-card glass-card--soft" style={{ maxWidth: 480 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Edit gardener</h2>
            <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>Email</label>
                <input
                  type="email"
                  required
                  value={editForm.email ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>Company name</label>
                <input
                  type="text"
                  value={editForm.companyName ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, companyName: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>Contact name</label>
                <input
                  type="text"
                  value={editForm.contactName ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, contactName: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              {submitError && (
                <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{submitError}</p>
              )}
              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" onClick={() => { setEditing(null); setEditForm({}) }} style={{ ...primaryButtonStyle, background: "rgba(255,255,255,0.1)", color: "inherit" }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitLoading} style={{ ...primaryButtonStyle, opacity: submitLoading ? 0.7 : 1 }}>
                  {submitLoading ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
