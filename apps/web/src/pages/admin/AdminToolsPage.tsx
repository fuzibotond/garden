import { useCallback, useEffect, useMemo, useState } from "react"
import AdminLayout from "../../components/layout/AdminLayout"
import { GlassButton, GlassCard, GlassInput } from "../../components/ui/GlassUI"
import { getAccessToken, getCurrentUser, hasRole } from "../../lib/auth"
import {
  createAdminTaskType,
  deleteAdminTaskType,
  getAdminGardeners,
  getAdminTaskTypesByGardener,
} from "../../services/apiClient"

type AdminToolsTab = "task-types" | "entities"
type TaskTypeEntry = {
  id: string
  name: string
  gardenerId: string
}

export default function AdminToolsPage() {
  const token = getAccessToken()
  const user = getCurrentUser()
  const isAdmin = hasRole(user, "Admin")

  const [activeTab, setActiveTab] = useState<AdminToolsTab>("task-types")
  const [gardeners, setGardeners] = useState<Array<{ id: string; label: string }>>([])
  const [selectedGardenerIds, setSelectedGardenerIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [taskTypeName, setTaskTypeName] = useState("")
  const [taskTypeEntries, setTaskTypeEntries] = useState<TaskTypeEntry[]>([])
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createResult, setCreateResult] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteResult, setDeleteResult] = useState<string | null>(null)

  const loadGardeners = useCallback(async () => {
    if (!token || !isAdmin) return

    setLoading(true)
    setError(null)
    try {
      const response = await getAdminGardeners(token, 1, 200)
      setGardeners(
        response.items.map((gardener) => ({
          id: gardener.gardenerId,
          label: gardener.contactName || gardener.companyName || gardener.email,
        })),
      )
      setSelectedGardenerIds((current) => {
        if (current.length > 0) {
          return current.filter((id) => response.items.some((gardener) => gardener.gardenerId === id))
        }
        return response.items.map((gardener) => gardener.gardenerId)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load gardeners")
    } finally {
      setLoading(false)
    }
  }, [token, isAdmin])

  const loadTaskTypes = useCallback(async () => {
    if (!token || !isAdmin || gardeners.length === 0) {
      setTaskTypeEntries([])
      return
    }

    try {
      const results = await Promise.all(
        gardeners.map((gardener) => getAdminTaskTypesByGardener(token, gardener.id)),
      )

      const entries: TaskTypeEntry[] = []
      for (let index = 0; index < gardeners.length; index += 1) {
        const gardener = gardeners[index]
        const types = results[index] ?? []
        types.forEach((taskType) => {
          entries.push({
            id: taskType.id,
            name: taskType.name,
            gardenerId: gardener.id,
          })
        })
      }

      setTaskTypeEntries(entries)
    } catch {
      // Keep page functional even if one gardener lookup fails.
    }
  }, [token, isAdmin, gardeners])

  useEffect(() => {
    void loadGardeners()
  }, [loadGardeners])

  useEffect(() => {
    void loadTaskTypes()
  }, [loadTaskTypes])

  const canCreateTaskType = useMemo(
    () => isAdmin && taskTypeName.trim().length > 0 && gardeners.length > 0,
    [isAdmin, taskTypeName, gardeners.length],
  )

  const canCreateForSelection = useMemo(
    () => canCreateTaskType && selectedGardenerIds.length > 0,
    [canCreateTaskType, selectedGardenerIds.length],
  )

  const groupedTaskTypes = useMemo(() => {
    const grouped = new Map<string, { name: string; gardenerIds: Set<string>; ids: string[] }>()
    taskTypeEntries.forEach((entry) => {
      const key = entry.name.trim().toLowerCase()
      const existing = grouped.get(key)
      if (existing) {
        existing.gardenerIds.add(entry.gardenerId)
        existing.ids.push(entry.id)
      } else {
        grouped.set(key, {
          name: entry.name,
          gardenerIds: new Set([entry.gardenerId]),
          ids: [entry.id],
        })
      }
    })

    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [taskTypeEntries])

  function toggleGardenerSelection(gardenerId: string) {
    setSelectedGardenerIds((current) => (
      current.includes(gardenerId)
        ? current.filter((id) => id !== gardenerId)
        : [...current, gardenerId]
    ))
  }

  async function createTaskTypeForGardeners(targetGardenerIds: string[]) {
    if (!token || targetGardenerIds.length === 0) return

    setCreating(true)
    setCreateError(null)
    setCreateResult(null)
    setDeleteError(null)
    setDeleteResult(null)

    const normalizedName = taskTypeName.trim()

    try {
      const settled = await Promise.allSettled(
        targetGardenerIds.map((gardenerId) =>
          createAdminTaskType(token, gardenerId, {
            name: normalizedName,
          }),
        ),
      )

      const successCount = settled.filter((result) => result.status === "fulfilled").length
      const failCount = settled.length - successCount

      if (successCount > 0) {
        setTaskTypeName("")
        setCreateResult(
          failCount > 0
            ? `Created for ${successCount} gardeners, failed for ${failCount}.`
            : `Created for ${successCount} gardeners.`,
        )
        await loadTaskTypes()
      } else {
        setCreateError("Failed to create task type for any gardener.")
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create task type")
    } finally {
      setCreating(false)
    }
  }

  async function handleCreateTaskType(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !canCreateTaskType) return
    await createTaskTypeForGardeners(gardeners.map((gardener) => gardener.id))
  }

  async function handleCreateTaskTypeForSelection() {
    if (!canCreateForSelection) return
    await createTaskTypeForGardeners(selectedGardenerIds)
  }

  async function deleteTaskTypeByName(taskTypeNameToDelete: string, targetGardenerIds: string[]) {
    if (!token || targetGardenerIds.length === 0) return

    const targetSet = new Set(targetGardenerIds)
    const normalized = taskTypeNameToDelete.trim().toLowerCase()
    const matching = taskTypeEntries.filter(
      (entry) => entry.name.trim().toLowerCase() === normalized && targetSet.has(entry.gardenerId),
    )

    if (matching.length === 0) {
      setDeleteError("No matching task type instances found for selected gardeners.")
      setDeleteResult(null)
      return
    }

    setDeleting(true)
    setDeleteError(null)
    setDeleteResult(null)
    setCreateError(null)
    setCreateResult(null)

    try {
      const settled = await Promise.allSettled(
        matching.map((entry) => deleteAdminTaskType(token, entry.id)),
      )

      const successCount = settled.filter((result) => result.status === "fulfilled").length
      const failCount = settled.length - successCount

      if (successCount > 0) {
        setDeleteResult(
          failCount > 0
            ? `Deleted ${successCount} task type entries, failed to delete ${failCount}.`
            : `Deleted ${successCount} task type entries.`,
        )
        await loadTaskTypes()
      } else {
        setDeleteError("Failed to delete task type entries.")
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete task type entries")
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeleteForSelection(taskTypeNameToDelete: string) {
    if (selectedGardenerIds.length === 0) return
    const confirmed = window.confirm(`Delete '${taskTypeNameToDelete}' for selected gardeners?`)
    if (!confirmed) return
    await deleteTaskTypeByName(taskTypeNameToDelete, selectedGardenerIds)
  }

  async function handleDeleteForAll(taskTypeNameToDelete: string) {
    if (gardeners.length === 0) return
    const confirmed = window.confirm(`Delete '${taskTypeNameToDelete}' for ALL gardeners?`)
    if (!confirmed) return
    await deleteTaskTypeByName(taskTypeNameToDelete, gardeners.map((gardener) => gardener.id))
  }

  if (!isAdmin) {
    return (
      <AdminLayout title="Admin Tools">
        <GlassCard variant="outlined" padding="md">
          You do not have access to this page.
        </GlassCard>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Admin Tools">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <GlassButton
            type="button"
            size="sm"
            variant={activeTab === "task-types" ? "primary" : "secondary"}
            onClick={() => setActiveTab("task-types")}
          >
            Task Types
          </GlassButton>
          <GlassButton
            type="button"
            size="sm"
            variant={activeTab === "entities" ? "primary" : "secondary"}
            onClick={() => setActiveTab("entities")}
          >
            More Entities
          </GlassButton>
        </div>

        {activeTab === "task-types" && (
          <GlassCard variant="elevated" padding="md" style={{ maxWidth: 760 }}>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Register Task Types</h2>
            <p style={{ marginTop: 0, fontSize: 13 }}>
              This is admin-only. Task types are registered in bulk so gardeners and clients can use them when creating tasks.
            </p>

            <form onSubmit={handleCreateTaskType} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GlassInput
                label="Task type name"
                type="text"
                required
                value={taskTypeName}
                onChange={(event) => setTaskTypeName(event.target.value)}
                fullWidth
              />

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, opacity: 0.9 }}>Target gardeners</span>
                  <GlassButton
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => setSelectedGardenerIds(gardeners.map((gardener) => gardener.id))}
                    disabled={gardeners.length === 0}
                  >
                    Select all
                  </GlassButton>
                  <GlassButton
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => setSelectedGardenerIds([])}
                    disabled={selectedGardenerIds.length === 0}
                  >
                    Clear
                  </GlassButton>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {gardeners.map((gardener) => (
                    <label
                      key={gardener.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid rgba(190, 255, 171, 0.24)",
                        fontSize: 12,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedGardenerIds.includes(gardener.id)}
                        onChange={() => toggleGardenerSelection(gardener.id)}
                      />
                      <span>{gardener.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <GlassButton
                  type="button"
                  size="sm"
                  variant="secondary"
                  loading={creating || deleting}
                  disabled={!canCreateForSelection || deleting}
                  onClick={() => {
                    void handleCreateTaskTypeForSelection()
                  }}
                >
                  {creating ? "Creating..." : "Create for selected gardeners"}
                </GlassButton>
                <GlassButton
                  type="submit"
                  size="sm"
                  loading={creating || deleting}
                  disabled={!canCreateTaskType || deleting}
                >
                  {creating ? "Creating..." : "Create for all gardeners"}
                </GlassButton>

                <span style={{ fontSize: 13, opacity: 0.85 }}>
                  {loading
                    ? "Loading gardeners..."
                    : `${selectedGardenerIds.length}/${gardeners.length} selected`}
                </span>
              </div>

              {error && <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{error}</p>}
              {createError && <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{createError}</p>}
              {createResult && <p style={{ color: "#bbf7d0", fontSize: 13, margin: 0 }}>{createResult}</p>}
              {deleteError && <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{deleteError}</p>}
              {deleteResult && <p style={{ color: "#bbf7d0", fontSize: 13, margin: 0 }}>{deleteResult}</p>}
            </form>

            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.9 }}>
                Existing task types ({groupedTaskTypes.length})
              </p>
              {groupedTaskTypes.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {groupedTaskTypes.map((item) => {
                    const selectedOverlap = selectedGardenerIds.filter((id) => item.gardenerIds.has(id)).length
                    return (
                      <div
                        key={item.name}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          padding: "8px 10px",
                          borderRadius: 12,
                          border: "1px solid rgba(190, 255, 171, 0.24)",
                          background: "rgba(255,255,255,0.03)",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <strong style={{ fontSize: 13 }}>{item.name}</strong>
                          <span style={{ fontSize: 12, opacity: 0.8 }}>
                            Linked to {item.gardenerIds.size} gardener{item.gardenerIds.size !== 1 ? "s" : ""}
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <GlassButton
                            type="button"
                            size="xs"
                            variant="danger"
                            loading={deleting}
                            disabled={deleting || creating || selectedOverlap === 0}
                            onClick={() => {
                              void handleDeleteForSelection(item.name)
                            }}
                          >
                            Delete selected ({selectedOverlap})
                          </GlassButton>
                          <GlassButton
                            type="button"
                            size="xs"
                            variant="danger"
                            loading={deleting}
                            disabled={deleting || creating}
                            onClick={() => {
                              void handleDeleteForAll(item.name)
                            }}
                          >
                            Delete all ({item.gardenerIds.size})
                          </GlassButton>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {!loading && groupedTaskTypes.length === 0 && (
                <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>
                  No task types yet.
                </p>
              )}
            </div>
          </GlassCard>
        )}

        {activeTab === "entities" && (
          <GlassCard variant="outlined" padding="md" style={{ maxWidth: 760 }}>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>More Entity Management</h2>
            <p style={{ margin: 0, fontSize: 13 }}>
              This tab is reserved for future admin-only editing tools (for example, shared catalogs and reference entities).
            </p>
          </GlassCard>
        )}
      </div>
    </AdminLayout>
  )
}
