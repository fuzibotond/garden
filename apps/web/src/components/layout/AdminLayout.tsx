import type { ReactNode } from "react"
import { NavLink } from "react-router-dom"

type AdminLayoutProps = {
  title: string
  children: ReactNode
}

export default function AdminLayout({ title, children }: AdminLayoutProps) {
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
          <NavLink to="/admin" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
            Users
          </NavLink>
          <NavLink to="/admin/gardeners" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
            Gardeners
          </NavLink>
          <NavLink to="/admin/clients" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
            Clients
          </NavLink>
          <NavLink to="/admin/jobs" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
            Jobs
          </NavLink>
          <NavLink to="/admin/tasks" className={({ isActive }) => `admin-nav-link${isActive ? " active" : ""}`}>
            Tasks
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
        </header>

        <main>{children}</main>
      </div>
    </div>
  )
}