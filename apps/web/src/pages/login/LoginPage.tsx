import { type FormEventHandler, useState } from "react"
import { GlassButton, GlassCard, GlassInput } from "../../components/ui/GlassUI"
import { useNavigate } from "react-router-dom"
import { login } from "../../services/apiClient"
import { hasRole, parseClaimsFromToken } from "../../lib/auth"

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  
  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await login({ email, password })
      localStorage.setItem("accessToken", result.accessToken)
      const claims = parseClaimsFromToken(result.accessToken)

      if (hasRole(claims, "Admin")) {
        navigate("/admin", { replace: true })
      } else if (hasRole(claims, "Gardener")) {
        navigate("/admin/clients", { replace: true })
      } else {
        navigate("/profile", { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
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
            <span>Welcome back, gardener</span>
          </span>
        </div>
        <h1 style={{ margin: 0, fontSize: 26 }}>Sign in to Garden Admin</h1>
        <p style={{ marginTop: 8, fontSize: 14 }}>
           Manage your jobs and tasks in one lush dashboard.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <GlassInput
            label="Email"
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
            variant="primary"
            size="md"
          >
            {loading ? "Signing in..." : "Sign in"}
          </GlassButton>
        </form>
      </GlassCard>
    </div>
  )
}