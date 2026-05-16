import { useCallback, useEffect, useState } from "react"
import { GlassButton, GlassCard, GlassInput } from "../../components/ui/GlassUI"
import AdminLayout from "../../components/layout/AdminLayout"
import { getAccessToken, getCurrentUser, hasRole } from "../../lib/auth"
import {
  createGardenerPricingItem,
  deleteGardenerPricingItem,
  getGardenerPricingItems,
  updateGardenerPricingItem,
  type CreatePricingItemRequest,
  type PricingConditionDto,
  type PricingItemDto,
  type UpdatePricingItemRequest,
} from "../../services/apiClient"

type ConditionRow = { key: string; value: string }

type PricingFormState = {
  name: string
  description: string
  priceAmount: string
  priceUnit: string
  conditions: ConditionRow[]
}

const emptyForm: PricingFormState = {
  name: "",
  description: "",
  priceAmount: "",
  priceUnit: "DKK/m",
  conditions: [],
}

function itemToForm(item: PricingItemDto): PricingFormState {
  return {
    name: item.name,
    description: item.description ?? "",
    priceAmount: String(item.priceAmount),
    priceUnit: item.priceUnit,
    conditions: item.conditions.map((c) => ({ key: c.key, value: c.value })),
  }
}

function conditionsToDto(rows: ConditionRow[]): PricingConditionDto[] {
  return rows.filter((r) => r.key.trim() !== "").map((r) => ({ key: r.key.trim(), value: r.value.trim() }))
}

function isAlreadyDeletedError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return msg.includes("not found") || msg.includes("already deleted") || msg.includes("does not exist")
}

function ConditionsEditor({
  conditions,
  onChange,
}: {
  conditions: ConditionRow[]
  onChange: (rows: ConditionRow[]) => void
}) {
  function updateRow(index: number, field: "key" | "value", value: string) {
    const updated = conditions.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    onChange(updated)
  }

  function addRow() {
    onChange([...conditions, { key: "", value: "" }])
  }

  function removeRow(index: number) {
    onChange(conditions.filter((_, i) => i !== index))
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, opacity: 0.8 }}>Conditions</span>
        <GlassButton type="button" onClick={addRow} size="xs" variant="ghost">
          + Add condition
        </GlassButton>
      </div>
      {conditions.length === 0 && (
        <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>No conditions. Add one to describe when this price applies.</p>
      )}
      {conditions.map((row, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <GlassInput
            label=""
            placeholder="Condition (e.g. height)"
            type="text"
            value={row.key}
            onChange={(e) => updateRow(i, "key", e.target.value)}
            style={{ flex: 1 }}
          />
          <GlassInput
            label=""
            placeholder="Value (e.g. >200cm)"
            type="text"
            value={row.value}
            onChange={(e) => updateRow(i, "value", e.target.value)}
            style={{ flex: 1 }}
          />
          <GlassButton type="button" onClick={() => removeRow(i)} size="xs" variant="danger">
            ✕
          </GlassButton>
        </div>
      ))}
    </div>
  )
}

function PricingForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  loading,
  error,
}: {
  form: PricingFormState
  onChange: (form: PricingFormState) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  submitLabel: string
  loading: boolean
  error: string | null
}) {
  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <GlassInput
        label="Name"
        type="text"
        required
        value={form.name}
        onChange={(e) => onChange({ ...form, name: e.target.value })}
        fullWidth
      />
      <GlassInput
        label="Description"
        type="text"
        value={form.description}
        onChange={(e) => onChange({ ...form, description: e.target.value })}
        fullWidth
      />
      <div style={{ display: "flex", gap: 12 }}>
        <GlassInput
          label="Price"
          type="number"
          min="0"
          step="0.01"
          required
          value={form.priceAmount}
          onChange={(e) => onChange({ ...form, priceAmount: e.target.value })}
          style={{ flex: 1 }}
        />
        <GlassInput
          label="Unit"
          type="text"
          required
          placeholder="DKK/m"
          value={form.priceUnit}
          onChange={(e) => onChange({ ...form, priceUnit: e.target.value })}
          style={{ flex: 1 }}
        />
      </div>
      <ConditionsEditor
        conditions={form.conditions}
        onChange={(rows) => onChange({ ...form, conditions: rows })}
      />
      {error && <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{error}</p>}
      <div style={{ display: "flex", gap: 12 }}>
        <GlassButton type="button" onClick={onCancel} variant="secondary" size="sm">
          Cancel
        </GlassButton>
        <GlassButton type="submit" loading={loading} size="sm">
          {loading ? `${submitLabel}...` : submitLabel}
        </GlassButton>
      </div>
    </form>
  )
}

export default function PricingPage() {
  const token = getAccessToken()
  const user = getCurrentUser()
  const canManage = hasRole(user, "Admin") || hasRole(user, "Gardener")

  const [list, setList] = useState<PricingItemDto[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<PricingItemDto | null>(null)
  const [createForm, setCreateForm] = useState<PricingFormState>(emptyForm)
  const [editForm, setEditForm] = useState<PricingFormState>(emptyForm)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token || !canManage) return
    setLoading(true)
    setError(null)
    try {
      const res = await getGardenerPricingItems(token, page, pageSize)
      setList(res.items)
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pricing items")
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
      const body: CreatePricingItemRequest = {
        name: createForm.name,
        description: createForm.description || undefined,
        priceAmount: Number(createForm.priceAmount),
        priceUnit: createForm.priceUnit,
        conditions: conditionsToDto(createForm.conditions),
      }
      await createGardenerPricingItem(token, body)
      setShowCreate(false)
      setCreateForm(emptyForm)
      void load()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create pricing item")
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
      const body: UpdatePricingItemRequest = {
        name: editForm.name,
        description: editForm.description || undefined,
        priceAmount: Number(editForm.priceAmount),
        priceUnit: editForm.priceUnit,
        conditions: conditionsToDto(editForm.conditions),
      }
      await updateGardenerPricingItem(token, editing.pricingItemId, body)
      setEditing(null)
      setEditForm(emptyForm)
      void load()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to update pricing item")
    } finally {
      setSubmitLoading(false)
    }
  }

  async function handleDelete(item: PricingItemDto) {
    if (!token || deletingId === item.pricingItemId) return
    if (!window.confirm(`Delete pricing item "${item.name}"?`)) return
    setDeletingId(item.pricingItemId)
    try {
      await deleteGardenerPricingItem(token, item.pricingItemId)
      void load()
    } catch (err) {
      if (isAlreadyDeletedError(err)) {
        void load()
        return
      }
      setError(err instanceof Error ? err.message : "Failed to delete pricing item")
    } finally {
      setDeletingId((current) => (current === item.pricingItemId ? null : current))
    }
  }

  function openEdit(item: PricingItemDto) {
    setEditing(item)
    setEditForm(itemToForm(item))
    setSubmitError(null)
  }

  if (!canManage) {
    return (
      <AdminLayout title="Pricing">
        <GlassCard variant="outlined" padding="md">You do not have access to this page.</GlassCard>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Pricing">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            {total} pricing item{total !== 1 ? "s" : ""} total
          </p>
          <GlassButton
            type="button"
            onClick={() => {
              setShowCreate(true)
              setSubmitError(null)
            }}
            size="sm"
          >
            Add pricing item
          </GlassButton>
        </div>

        {error && <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{error}</p>}

        <GlassCard variant="elevated" padding="md">
          {loading ? (
            <p>Loading pricing items...</p>
          ) : list.length === 0 ? (
            <p style={{ margin: 0 }}>No pricing items yet. Add one to define your price templates.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Name</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Price</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, opacity: 0.8 }}>Conditions</th>
                    <th style={{ width: 170 }} />
                  </tr>
                </thead>
                <tbody>
                  {list.map((item) => (
                    <tr key={item.pricingItemId} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <div>{item.name}</div>
                        {item.description && (
                          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{item.description}</div>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                        {item.priceAmount} {item.priceUnit}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        {item.conditions.length === 0 ? (
                          <span style={{ opacity: 0.4, fontSize: 12 }}>—</span>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {item.conditions.map((c, i) => (
                              <span
                                key={i}
                                style={{
                                  fontSize: 11,
                                  background: "rgba(255,255,255,0.08)",
                                  borderRadius: 4,
                                  padding: "2px 6px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {c.key}: {c.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "10px 12px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <GlassButton type="button" onClick={() => openEdit(item)} size="xs" variant="secondary">
                          Edit
                        </GlassButton>
                        <GlassButton
                          type="button"
                          onClick={() => handleDelete(item)}
                          size="xs"
                          variant="danger"
                          disabled={deletingId === item.pricingItemId}
                        >
                          {deletingId === item.pricingItemId ? "Deleting..." : "Delete"}
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

        {showCreate && (
          <GlassCard variant="elevated" padding="md" style={{ maxWidth: 600 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Create pricing item</h2>
            <PricingForm
              form={createForm}
              onChange={setCreateForm}
              onSubmit={handleCreate}
              onCancel={() => {
                setShowCreate(false)
                setCreateForm(emptyForm)
              }}
              submitLabel="Create"
              loading={submitLoading}
              error={submitError}
            />
          </GlassCard>
        )}

        {editing && (
          <GlassCard variant="elevated" padding="md" style={{ maxWidth: 600 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Edit pricing item</h2>
            <PricingForm
              form={editForm}
              onChange={setEditForm}
              onSubmit={handleUpdate}
              onCancel={() => {
                setEditing(null)
                setEditForm(emptyForm)
              }}
              submitLabel="Save"
              loading={submitLoading}
              error={submitError}
            />
          </GlassCard>
        )}
      </div>
    </AdminLayout>
  )
}
