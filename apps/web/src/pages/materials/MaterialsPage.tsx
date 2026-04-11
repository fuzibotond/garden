import { useCallback, useEffect, useState } from "react"
import { GlassButton, GlassCard, GlassInput } from "../../components/ui/GlassUI"
import AdminLayout from "../../components/layout/AdminLayout"
import { getAccessToken, getCurrentUser, hasRole } from "../../lib/auth"
import {
  createGardenerMaterial,
  deleteGardenerMaterial,
  getGardenerMaterials,
  updateGardenerMaterial,
  type CreateMaterialRequest,
  type MaterialDto,
  type UpdateMaterialRequest,
} from "../../services/apiClient"

type MaterialFormState = {
  name: string
  amount: string
  amountType: string
  pricePerAmount: string
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

function materialToForm(material: MaterialDto): MaterialFormState {
  return {
    name: material.name,
    amount: String(material.amount),
    amountType: material.amountType,
    pricePerAmount: String(material.pricePerAmount),
  }
}

export default function MaterialsPage() {
  const token = getAccessToken()
  const user = getCurrentUser()
  const canManage = hasRole(user, "Admin") || hasRole(user, "Gardener")

  const [list, setList] = useState<MaterialDto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<MaterialDto | null>(null)
  const [createForm, setCreateForm] = useState<MaterialFormState>({
    name: "",
    amount: "",
    amountType: "kg",
    pricePerAmount: "",
  })
  const [editForm, setEditForm] = useState<MaterialFormState>({
    name: "",
    amount: "",
    amountType: "kg",
    pricePerAmount: "",
  })
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [deletingMaterialId, setDeletingMaterialId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token || !canManage) return
    setLoading(true)
    setError(null)
    try {
      const res = await getGardenerMaterials(token, page, pageSize)
      setList(res.items)
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load materials")
    } finally {
      setLoading(false)
    }
  }, [token, canManage, page, pageSize])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return

    setSubmitLoading(true)
    setSubmitError(null)
    try {
      const body: CreateMaterialRequest = {
        name: createForm.name,
        amount: Number(createForm.amount),
        amountType: createForm.amountType,
        pricePerAmount: Number(createForm.pricePerAmount),
      }
      await createGardenerMaterial(token, body)
      setShowCreate(false)
      setCreateForm({ name: "", amount: "", amountType: "kg", pricePerAmount: "" })
      void load()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create material")
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
      const body: UpdateMaterialRequest = {
        name: editForm.name,
        amount: Number(editForm.amount),
        amountType: editForm.amountType,
        pricePerAmount: Number(editForm.pricePerAmount),
      }
      await updateGardenerMaterial(token, editing.materialId, body)
      setEditing(null)
      setEditForm({ name: "", amount: "", amountType: "kg", pricePerAmount: "" })
      void load()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to update material")
    } finally {
      setSubmitLoading(false)
    }
  }

  async function handleDelete(material: MaterialDto) {
    if (!token) return
    if (deletingMaterialId === material.materialId) return
    if (!window.confirm(`Delete material \"${material.name}\"?`)) return

    setDeletingMaterialId(material.materialId)
    try {
      await deleteGardenerMaterial(token, material.materialId)
      void load()
    } catch (err) {
      if (isAlreadyDeletedError(err)) {
        void load()
        return
      }
      setError(err instanceof Error ? err.message : "Failed to delete material")
    } finally {
      setDeletingMaterialId((current) => (current === material.materialId ? null : current))
    }
  }

  function openEdit(material: MaterialDto) {
    setEditing(material)
    setEditForm(materialToForm(material))
    setSubmitError(null)
  }

  if (!canManage) {
    return (
      <AdminLayout title="Materials">
        <GlassCard variant="outlined" padding="md">You do not have access to this page.</GlassCard>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Materials">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            {total} material{total !== 1 ? "s" : ""} total
          </p>
          <GlassButton
            type="button"
            onClick={() => {
              setShowCreate(true)
              setSubmitError(null)
            }}
            size="sm"
          >
            Add material
          </GlassButton>
        </div>

        {error && <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{error}</p>}

        <GlassCard variant="elevated" padding="md">
          {loading ? (
            <p>Loading materials...</p>
          ) : list.length === 0 ? (
            <p style={{ margin: 0 }}>No materials yet. Add one to get started.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Name</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Amount</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Unit</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Price per unit</th>
                    <th style={{ width: 170 }} />
                  </tr>
                </thead>
                <tbody>
                  {list.map((material) => (
                    <tr key={material.materialId} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <td style={{ padding: "10px 12px" }}>{material.name}</td>
                      <td style={{ padding: "10px 12px" }}>{material.amount}</td>
                      <td style={{ padding: "10px 12px" }}>{material.amountType}</td>
                      <td style={{ padding: "10px 12px" }}>{material.pricePerAmount}</td>
                      <td style={{ padding: "10px 12px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <GlassButton type="button" onClick={() => openEdit(material)} size="xs" variant="secondary">
                          Edit
                        </GlassButton>
                        <GlassButton
                          type="button"
                          onClick={() => handleDelete(material)}
                          size="xs"
                          variant="danger"
                          disabled={deletingMaterialId === material.materialId}
                        >
                          {deletingMaterialId === material.materialId ? "Deleting..." : "Delete"}
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
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Create material</h2>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GlassInput
                label="Name"
                type="text"
                required
                value={createForm.name}
                onChange={(e) => setCreateForm((current) => ({ ...current, name: e.target.value }))}
                fullWidth
              />
              <GlassInput
                label="Amount"
                type="number"
                min="0"
                step="0.01"
                required
                value={createForm.amount}
                onChange={(e) => setCreateForm((current) => ({ ...current, amount: e.target.value }))}
                fullWidth
              />
              <GlassInput
                label="Amount type"
                type="text"
                required
                value={createForm.amountType}
                onChange={(e) => setCreateForm((current) => ({ ...current, amountType: e.target.value }))}
                fullWidth
              />
              <GlassInput
                label="Price per amount"
                type="number"
                min="0"
                step="0.01"
                required
                value={createForm.pricePerAmount}
                onChange={(e) => setCreateForm((current) => ({ ...current, pricePerAmount: e.target.value }))}
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
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Edit material</h2>
            <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GlassInput
                label="Name"
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm((current) => ({ ...current, name: e.target.value }))}
                fullWidth
              />
              <GlassInput
                label="Amount"
                type="number"
                min="0"
                step="0.01"
                required
                value={editForm.amount}
                onChange={(e) => setEditForm((current) => ({ ...current, amount: e.target.value }))}
                fullWidth
              />
              <GlassInput
                label="Amount type"
                type="text"
                required
                value={editForm.amountType}
                onChange={(e) => setEditForm((current) => ({ ...current, amountType: e.target.value }))}
                fullWidth
              />
              <GlassInput
                label="Price per amount"
                type="number"
                min="0"
                step="0.01"
                required
                value={editForm.pricePerAmount}
                onChange={(e) => setEditForm((current) => ({ ...current, pricePerAmount: e.target.value }))}
                fullWidth
              />

              {submitError && <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{submitError}</p>}

              <div style={{ display: "flex", gap: 12 }}>
                <GlassButton
                  type="button"
                  onClick={() => {
                    setEditing(null)
                    setEditForm({ name: "", amount: "", amountType: "kg", pricePerAmount: "" })
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
