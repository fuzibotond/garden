type StatCardProps = {
  label: string
  value: string
  description: string
}

export default function StatCard({ label, value, description }: StatCardProps) {
  return (
    <div className="glass-card glass-card--soft stat-card">
      <p className="stat-card__label">{label}</p>
      <p className="stat-card__value">{value}</p>
      <p className="stat-card__description">{description}</p>
    </div>
  )
}