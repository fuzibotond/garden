import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom"
import LoginPage from "../../pages/login/LoginPage"
import DashboardPage from "../../pages/dashboard/DashboardPage"
import UsersPage from "../../pages/users/UsersPage"
import GardenersPage from "../../pages/gardeners/GardenersPage"
import JobsPage from "../../pages/jobs/JobsPage"
import TasksPage from "../../pages/tasks/TasksPage"
import ClientsPage from "../../pages/clients/ClientsPage"
import ProfilePage from "../../pages/profile/ProfilePage"
import AcceptInvitationPage from "../../pages/invitations/AcceptInvitationPage"
import { getAccessToken, getCurrentUser, hasRole, type Role } from "../../lib/auth"
import ClientSignup from "../../pages/clients/ClientSignup"

type ProtectedRouteProps = {
  allowedRoles?: Role[]
}

function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const token = getAccessToken()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  const user = getCurrentUser()

  if (allowedRoles && (!user || !allowedRoles.some((role) => hasRole(user, role)))) {
    // Authenticated but not authorized – send to their profile
    return <Navigate to="/profile" replace />
  }

  return <Outlet />
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/invite/accept" element={<AcceptInvitationPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<ClientSignup />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["Admin"]} />}>
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/gardeners" element={<GardenersPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["Admin", "Gardener"]} />}>
          <Route path="/admin/clients" element={<ClientsPage />} />
          <Route path="/admin/jobs" element={<JobsPage />} />
          <Route path="/admin/tasks" element={<TasksPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}