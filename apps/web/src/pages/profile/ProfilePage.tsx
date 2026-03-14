import { useEffect, useState } from "react"
import AdminLayout from "../../components/layout/AdminLayout"
import { deleteMyProfile, getMyProfile, updateMyProfile } from "../../services/apiClient"
import { getAccessToken, getCurrentUser, hasRole } from "../../lib/auth"

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getMyProfile>> | null>(null)
  const [companyName, setCompanyName] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)

  const token = getAccessToken()
  const claims = getCurrentUser()

  useEffect(() => {
    if (!token) return

    const load = async () => {
      try {
        const data = await getMyProfile(token)
        setProfile(data)
        console.log(data)
        const isPureClient = hasRole(claims, "Client") && !hasRole(claims, "Admin") && !hasRole(claims, "Gardener")
        if (isPureClient) {
          // For clients the backend uses Name, not CompanyName
          setName(data.name ?? "")
        } else {
          setCompanyName(data.companyName ?? "")
          setName(data.name ?? "")
          
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [token])

  async function handleSave() {
    if (!token) return

    setSaving(true)
    setError(null)

    try {
      const body: { companyName?: string; name?: string } = {}
      const isPureClient = hasRole(claims, "Client") && !hasRole(claims, "Admin") && !hasRole(claims, "Gardener")

      if (isPureClient) {
        // Client entity maps only Name, so persist via Name
        body.name = name || undefined
      } else {
        body.companyName = companyName || undefined
        body.name = name || undefined
      }

      const updated = await updateMyProfile(body, token)
      setProfile(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!token) return

    const confirmed = window.confirm("Delete your profile? This cannot be undone.")
    if (!confirmed) return

    try {
      await deleteMyProfile(token)
      localStorage.removeItem("accessToken")
      window.location.href = "/login"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete profile")
    }
  }

  const title = "Profile"

  return (
    <AdminLayout title={title}>
      <div
        style={{
          maxWidth: 520,
        }}
        className="glass-card glass-card--soft"
      >
        {loading ? (
          <p>Loading profile...</p>
        ) : (
          <>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Your details</h2>
            {error && (
              <p style={{ color: "#fecaca", fontSize: 13, marginTop: 0, marginBottom: 12 }}>
                {error}
              </p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Email</div>
                <div style={{ fontSize: 14 }}>{profile?.email}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Role</div>
                <div style={{ fontSize: 14 }}>{claims?.roles.join(", ")}</div>
              </div>

              {hasRole(claims, "Client") || hasRole(claims, "Admin") || hasRole(claims, "Gardener") ? (
                <div>
                  <label style={{ fontSize: 12, opacity: 0.8 }}>Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    style={{
                      marginTop: 4,
                      width: "100%",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.18)",
                      padding: "8px 12px",
                      backgroundColor: "rgba(3,15,8,0.9)",
                      color: "white",
                      outline: "none",
                    }}
                  />
                </div>
              ) : null}
              {!hasRole(claims, "Client") || hasRole(claims, "Admin") || hasRole(claims, "Gardener") ? (
                <div>
                  <label style={{ fontSize: 12, opacity: 0.8 }}>Company Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    style={{
                      marginTop: 4,
                      width: "100%",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.18)",
                      padding: "8px 12px",
                      backgroundColor: "rgba(3,15,8,0.9)",
                      color: "white",
                      outline: "none",
                    }}
                  />
                </div>
              ) : null}
            </div>

            <div
              style={{
                marginTop: 20,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(248,113,113,0.6)",
                  padding: "8px 14px",
                  background: "rgba(127, 29, 29, 0.5)",
                  color: "#fee2e2",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Delete profile
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  borderRadius: 999,
                  border: "none",
                  padding: "8px 16px",
                  background:
                    "linear-gradient(135deg, #d9ff6a 0%, #9dff4f 40%, #4fe368 100%)",
                  color: "#071108",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: saving ? "default" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}

