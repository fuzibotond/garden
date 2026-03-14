import { useState } from "react"
import AdminLayout from "../../components/layout/AdminLayout"
import { adminCreateClient } from "../../services/apiClient"
import { getAccessToken, getCurrentUser, hasRole } from "../../lib/auth"

export default function ClientsPage() {
  const token = getAccessToken()
  const user = getCurrentUser()
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const canCreateClient = hasRole(user, "Admin")

  async function handleCreate() {
    if (!token || !canCreateClient) return
    setLoading(true)
    setMessage(null)

    try {
      await adminCreateClient({ email, name }, token)
      setMessage("Client created.")
      setEmail("")
      setName("")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create client")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout title="Clients">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {canCreateClient && (
          <div className="glass-card glass-card--soft" style={{ maxWidth: 520 }}>
            <h2 style={{ marginTop: 0, marginBottom: 12 }}>Create client</h2>
            <p style={{ marginTop: 0, marginBottom: 16, fontSize: 14 }}>
              Invite a new client by email. They will receive credentials separately.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>Client name</label>
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
              <div>
                <label style={{ fontSize: 12, opacity: 0.8 }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading}
              style={{
                marginTop: 18,
                borderRadius: 999,
                border: "none",
                padding: "8px 16px",
                background:
                  "linear-gradient(135deg, #d9ff6a 0%, #9dff4f 40%, #4fe368 100%)",
                color: "#071108",
                fontWeight: 600,
                fontSize: 14,
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Creating..." : "Create client"}
            </button>
            {message && (
              <p style={{ marginTop: 10, fontSize: 13 }}>
                {message}
              </p>
            )}
          </div>
        )}

        {!canCreateClient && (
          <p style={{ fontSize: 14 }}>
            Gardeners can browse clients here once listing is implemented. For now, only
            admins can create clients.
          </p>
        )}
      </div>
    </AdminLayout>
  )
}