import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom"
import { getAccessToken, getCurrentUser, hasRole, type Role } from "../../lib/auth"
import AdminToolsPage from "../../pages/admin/AdminToolsPage"
import SystemMonitorPage from "../../pages/admin/SystemMonitorPage"
import ClientSignup from "../../pages/clients/ClientSignup"
import ClientsPage from "../../pages/clients/ClientsPage"
import DashboardPage from "../../pages/dashboard/DashboardPage"
import GardenersPage from "../../pages/gardeners/GardenersPage"
import AcceptInvitationPage from "../../pages/invitations/AcceptInvitationPage"
import JobsPage from "../../pages/jobs/JobsPage"
import LandingPage from "../../pages/landing/LandingPage"
import LoginPage from "../../pages/login/LoginPage"
import MaterialsPage from "../../pages/materials/MaterialsPage"
import ProfilePage from "../../pages/profile/ProfilePage"
import ClientSchedulingPage from "../../pages/scheduling/ClientSchedulingPage"
import GardenerSchedulingPage from "../../pages/scheduling/GardenerSchedulingPage"
import TasksPage from "../../pages/tasks/TasksPage"
import UsersPage from "../../pages/users/UsersPage"
import GardenerQuestionsPage from "../../pages/questions/GardenerQuestionsPage"
import ClientQuestionsPage from "../../pages/questions/ClientQuestionsPage"

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
        <Route path="/" element={<LandingPage />} />
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
          <Route path="/admin/tools" element={<AdminToolsPage />} />
          <Route path="/admin/monitor" element={<SystemMonitorPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["Admin", "Gardener", "Client"]} />}>
          <Route path="/admin/clients" element={<ClientsPage />} />
          <Route path="/admin/jobs" element={<JobsPage />} />
          <Route path="/admin/tasks" element={<TasksPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["Admin", "Gardener"]} />}>
          <Route path="/admin/materials" element={<MaterialsPage />} />
          <Route path="/gardener/scheduling" element={<GardenerSchedulingPage />} />
          <Route path="/gardener/questions" element={<GardenerQuestionsPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["Client"]} />}>
          <Route path="/client/scheduling" element={<ClientSchedulingPage />} />
          <Route path="/client/questions" element={<ClientQuestionsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}