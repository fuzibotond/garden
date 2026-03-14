import type { ReactNode } from "react"
import { NavLink } from "react-router-dom"

type Props = {
  children: ReactNode
}

const navItemStyle = {
  display: "block",
  padding: "10px 12px",
  borderRadius: "8px",
  textDecoration: "none",
  color: "#1f2937",
  marginBottom: "6px",
}

export default function AdminLayout({ children }: Props) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <aside
        style={{
          width: "240px",
          padding: "20px",
          borderRight: "1px solid #e5e7eb",
          background: "#ffffff",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Garden Admin</h2>

        <nav>
          <NavLink
            to="/admin"
            style={({ isActive }) => ({
              ...navItemStyle,
              background: isActive ? "#e0f2fe" : "transparent",
              fontWeight: isActive ? 700 : 400,
            })}
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/admin/users"
            style={({ isActive }) => ({
              ...navItemStyle,
              background: isActive ? "#e0f2fe" : "transparent",
              fontWeight: isActive ? 700 : 400,
            })}
          >
            Users
          </NavLink>

          <NavLink
            to="/admin/gardeners"
            style={({ isActive }) => ({
              ...navItemStyle,
              background: isActive ? "#e0f2fe" : "transparent",
              fontWeight: isActive ? 700 : 400,
            })}
          >
            Gardeners
          </NavLink>

          <NavLink
            to="/admin/clients"
            style={({ isActive }) => ({
              ...navItemStyle,
              background: isActive ? "#e0f2fe" : "transparent",
              fontWeight: isActive ? 700 : 400,
            })}
          >
            Clients
          </NavLink>

          <NavLink
            to="/admin/jobs"
            style={({ isActive }) => ({
              ...navItemStyle,
              background: isActive ? "#e0f2fe" : "transparent",
              fontWeight: isActive ? 700 : 400,
            })}
          >
            Jobs
          </NavLink>

          <NavLink
            to="/admin/tasks"
            style={({ isActive }) => ({
              ...navItemStyle,
              background: isActive ? "#e0f2fe" : "transparent",
              fontWeight: isActive ? 700 : 400,
            })}
          >
            Tasks
          </NavLink>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: "24px" }}>{children}</main>
    </div>
  )
}