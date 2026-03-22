import { type FormEventHandler, useState } from "react"
import { GlassButton, GlassCard, GlassInput } from "../../components/ui/GlassUI"
import { useNavigate, useSearchParams } from "react-router-dom"
import { clientSignup } from "../../services/apiClient"

export default function ClientSignup() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await clientSignup({
        email,
        password,
        confirmPassword,
        fullName: name,
        token: token as string,
      })
      navigate("/login", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background:
          "radial-gradient(circle at top left, rgba(119,199,92,0.14), transparent 55%), radial-gradient(circle at bottom right, rgba(73,169,90,0.3), transparent 60%), linear-gradient(160deg,#08140b 0%,#050a06 40%,#020402 100%)",
      }}
    >
      <GlassCard
        variant="glow"
        padding="lg"
        style={{
          width: "100%",
          maxWidth: "420px",
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <span className="pill">
            <span className="pill-dot" />
            <span>Welcome back, client</span>
          </span>
        </div>
        <h1 style={{ margin: 0, fontSize: 26 }}>Sign up to Garden Care</h1>
        <p style={{ marginTop: 8, fontSize: 14 }}>
          Manage your jobs and tasks in one lush dashboard.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <GlassInput
            label="Name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            fullWidth
          />
          <GlassInput
            label="Email (use the same email as the one in the invitation)"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            fullWidth
          />
          <GlassInput
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            fullWidth
          />
          <GlassInput
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            fullWidth
          />

          {error && (
            <div
              style={{
                marginTop: 4,
                fontSize: 13,
                color: "#fecaca",
              }}
            >
              {error}
            </div>
          )}

          <GlassButton
            type="submit"
            loading={loading}
            fullWidth
          >
            {loading ? "Creating account..." : "Create account"}
          </GlassButton>
        </form>
      </GlassCard>
    </div>
  )
}