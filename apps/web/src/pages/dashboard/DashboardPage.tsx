import AdminLayout from "../../components/layout/AdminLayout"
import StatCard from "../../components/common/StatCard"

const stats = [
  {
    label: "Total Gardeners",
    value: "24",
    description: "Active gardeners on the platform",
  },
  {
    label: "Total Clients",
    value: "186",
    description: "Registered clients",
  },
  {
    label: "Upcoming Jobs",
    value: "43",
    description: "Scheduled in the next 7 days",
  },
  {
    label: "Pending Tasks",
    value: "17",
    description: "Waiting for planning",
  },
]

export default function DashboardPage() {
  return (
    <AdminLayout title="Dashboard">
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