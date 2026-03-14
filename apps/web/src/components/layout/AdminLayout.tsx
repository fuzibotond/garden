import type { ReactNode } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { getCurrentUser, hasRole } from "../../lib/auth"
import { logout } from "../../services/apiClient"

type AdminLayoutProps = {
  title: string
  children: ReactNode
}

export default function AdminLayout({ title, children }: AdminLayoutProps) {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const isAdmin = hasRole(user, "Admin")
  const isGardener = hasRole(user, "Gardener")

  async function handleLogout() {
    const token = localStorage.getItem("accessToken")
    if (token) {
      try {
        await logout(token)
      } catch {
        // ignore, we'll still clear the token client-side
      }
    }
    localStorage.removeItem("accessToken")
    navigate("/login", { replace: true })
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar glass-card">
        <div>
          <div className="admin-sidebar__brand">Garden Admin</div>
          <p style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>
            Manage plants, people, and jobs.
          </p>
        </div>

        <nav>
          {isAdmin && (
            <>
              <NavLink to="/admin" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
                Dashboard
              </NavLink>
              <NavLink to="/admin/users" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
                Users
              </NavLink>
              <NavLink to="/admin/gardeners" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
                Gardeners
              </NavLink>
            </>
          )}

          {(isAdmin || isGardener) && (
            <>
              <NavLink to="/admin/clients" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
                Clients
              </NavLink>
              <NavLink to="/admin/jobs" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
                Jobs
              </NavLink>
              <NavLink to="/admin/tasks" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
                Tasks
              </NavLink>
            </>
          )}

          <NavLink to="/profile" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
            My profile
          </NavLink>
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <div>
            <div className="pill">
              <span className="pill-dot" />
              <span>All Plants overview</span>
            </div>
            <h1 className="admin-header__title">{title}</h1>
            <p className="admin-header__subtitle">
              High-level view of your garden marketplace.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.25)",
              padding: "8px 14px",
              background: "rgba(5,18,9,0.9)",
              color: "white",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </header>

        <main>{children}</main>
      </div>
    </div>
  )
}