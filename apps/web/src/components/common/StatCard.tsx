import { GlassCard } from "../ui/GlassUI"

type StatCardProps = {
  label: string
  value: string
  description: string
}

export default function StatCard({ label, value, description }: StatCardProps) {
  return (
    <GlassCard variant="elevated" padding="md" className="stat-card">
      <p className="stat-card__label">{label}</p>
      <p className="stat-card__value">{value}</p>
      <p className="stat-card__description">{description}</p>
    </GlassCard>
  )
}