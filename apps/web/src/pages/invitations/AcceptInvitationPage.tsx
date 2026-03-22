import { type FormEventHandler, useEffect, useState } from "react"
import { GlassButton, GlassCard, GlassInput } from "../../components/ui/GlassUI"
import { useLocation, useNavigate } from "react-router-dom"
import { acceptInvitation, validateInvitationToken } from "../../services/apiClient"

export default function AcceptInvitationPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(location.search)
  const token = searchParams.get("token") ?? ""

  const [email, setEmail] = useState<string | null>(null)
  const [gardenerName, setGardenerName] = useState<string | undefined>()
  const [status, setStatus] = useState<string | null>(null)
  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError("Missing invitation token.")
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await validateInvitationToken(token)
        setEmail(result.email)
        setGardenerName(result.gardenerName)
        setStatus(result.status)
        if (result.status !== "Pending") {
          setError("This invitation is not available anymore.")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid or expired invitation.")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [token])

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    if (!token) return
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    setSubmitting(true)
    setError(null)

    try {
      await acceptInvitation({
        token,
        password,
        confirmPassword,
        fullName,
      })
      setSuccess(true)
      setTimeout(() => {
        navigate("/login", { replace: true })
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invitation.")
    } finally {
      setSubmitting(false)
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
          maxWidth: "460px",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 26 }}>Activate your client account</h1>
        {gardenerName && (
          <p style={{ marginTop: 0, fontSize: 14 }}>
            You have been invited by <strong>{gardenerName}</strong> to manage your garden online.
          </p>
        )}

        {loading ? (
          <p>Validating invitation…</p>
        ) : error ? (
          <p style={{ color: "#fecaca", fontSize: 14 }}>{error}</p>
        ) : (
          <>
            <p style={{ marginTop: 8, fontSize: 14 }}>
              Invitation for <strong>{email}</strong>. Choose a password to finish setting up your
              account.
            </p>

            <form
              onSubmit={handleSubmit}
              style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}
            >
              <GlassInput
                label="Full name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                fullWidth
              />

              <GlassInput
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
              />

              <GlassInput
                label="Confirm password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
              />

              {status && (
                <p style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                  Status: <strong>{status}</strong>
                </p>
              )}

              {success && (
                <p style={{ color: "#bbf7d0", fontSize: 13, margin: 0 }}>
                  Invitation accepted. Redirecting to login…
                </p>
              )}

              {error && !loading && (
                <p style={{ color: "#fecaca", fontSize: 13, margin: 0 }}>{error}</p>
              )}

              <GlassButton
                type="submit"
                loading={submitting}
                fullWidth
              >
                {submitting ? "Activating…" : "Activate account"}
              </GlassButton>
            </form>
          </>
        )}
      </GlassCard>
    </div>
  )
}

