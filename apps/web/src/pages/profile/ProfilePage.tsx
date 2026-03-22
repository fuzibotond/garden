import { useEffect, useState } from "react"
import { GlassButton, GlassCard, GlassInput } from "../../components/ui/GlassUI"
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
      <GlassCard
        variant="elevated"
        padding="lg"
        style={{
          maxWidth: 520,
        }}
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
                <GlassInput
                  label="Name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  fullWidth
                />
              ) : null}
              {!hasRole(claims, "Client") || hasRole(claims, "Admin") || hasRole(claims, "Gardener") ? (
                <GlassInput
                  label="Company Name"
                  type="text"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  fullWidth
                />
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
              <GlassButton
                type="button"
                onClick={handleDelete}
                variant="danger"
                size="sm"
              >
                Delete profile
              </GlassButton>

              <GlassButton
                type="button"
                onClick={handleSave}
                loading={saving}
                variant="primary"
                size="sm"
              >
                {saving ? "Saving..." : "Save changes"}
              </GlassButton>
            </div>
          </>
        )}
      </GlassCard>
    </AdminLayout>
  )
}

