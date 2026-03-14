import { type FormEventHandler, useState } from "react"
import { useNavigate } from "react-router-dom"
import { login } from "../../services/apiClient"

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
      navigate("/admin", { replace: true })
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
      <div
        className="glass-card"
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
          Manage your plants, jobs, and clients in one lush dashboard.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              style={{
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.18)",
                padding: "10px 14px",
                backgroundColor: "rgba(3,15,8,0.9)",
                color: "white",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              style={{
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.18)",
                padding: "10px 14px",
                backgroundColor: "rgba(3,15,8,0.9)",
                color: "white",
                outline: "none",
              }}
            />
          </div>

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

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              border: "none",
              borderRadius: 999,
              padding: "10px 16px",
              fontWeight: 600,
              fontSize: 14,
              background:
                "linear-gradient(135deg, #d9ff6a 0%, #9dff4f 40%, #4fe368 100%)",
              color: "#071108",
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  )
}