import AdminLayout from "../../components/layout/AdminLayout"
import StatCard from "../../components/common/StatCard"
import { getAccessToken, getCurrentUser, hasRole } from "../../lib/auth"
import { useCallback, useEffect, useState } from "react"
import { getNumberOfAdminClients, getNumberOfAdminGardeners, getNumberOfGardenerClients } from "../../services/apiClient"

export default function DashboardPage() {
  const token = getAccessToken()
  const user = getCurrentUser()
  const isAdmin = hasRole(user, "Admin")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<{ label: string; value: string; description: string }[]>([])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      if (isAdmin) {
        const [gardeners, clients] = await Promise.all([
          getNumberOfAdminGardeners(token),
          getNumberOfAdminClients(token),
        ])

        setStats([
          {
            label: "Total Gardeners",
            value: gardeners.numItems.toString(),
            description: "Active gardeners on the platform",
          },
          {
            label: "Total Clients",
            value: clients.numItems.toString(),
            description: "Registered clients",
          },
        ])
      }
      else {
        const res = await getNumberOfGardenerClients(token)
        setStats([{
          label: "Total Clients",
          value: res.numItems.toString(),
          description: "Registered clients",
        }])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }, [token, isAdmin])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <AdminLayout title="Dashboard">
      {error && (
        <p style={{ color: "#fecaca", fontSize: 13, marginBottom: 16 }}>{error}</p>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            description={stat.description}
          />
        ))}
      </div>
    </AdminLayout>
  )
}