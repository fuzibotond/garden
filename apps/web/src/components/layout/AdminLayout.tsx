import type { ReactNode } from "react"
import { GlassButton, GlassCard } from "../ui/GlassUI"
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
  const isClient = hasRole(user, "Client")

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
      <GlassCard variant="elevated" padding="lg" className="admin-sidebar">
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
              <NavLink to="/admin/tools" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
                Admin Tools
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
              <NavLink to="/admin/materials" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
                Materials
              </NavLink>
              <NavLink to="/gardener/scheduling" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
                Schedule
              </NavLink>
              <NavLink to="/gardener/questions" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
                Questions
              </NavLink>
            </>
          )}

          {isClient && !isAdmin && !isGardener && (
            <>
              <NavLink to="/admin/jobs" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
                Jobs
              </NavLink>
              <NavLink to="/admin/tasks" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
                Tasks
              </NavLink>
              <NavLink to="/client/scheduling" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
                Schedule
              </NavLink>
              <NavLink to="/client/questions" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
                Questions
              </NavLink>
            </>
          )}

          <NavLink to="/profile" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
            My profile
          </NavLink>
        </nav>
      </GlassCard>

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
          <GlassButton type="button" variant="secondary" size="sm" onClick={handleLogout}>
            Logout
          </GlassButton>
        </header>

        <main>{children}</main>
      </div>
    </div>
  )
}