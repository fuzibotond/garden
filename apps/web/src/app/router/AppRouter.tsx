import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom"
import LoginPage from "../../pages/login/LoginPage"
import DashboardPage from "../../pages/dashboard/DashboardPage"
import UsersPage from "../../pages/users/UsersPage"
import GardenersPage from "../../pages/gardeners/GardenersPage"
import JobsPage from "../../pages/jobs/JobsPage"
import TasksPage from "../../pages/tasks/TasksPage"
import ClientsPage from "../../pages/clients/ClientsPage"

function isAuthenticated() {
  return Boolean(localStorage.getItem("accessToken"))
}

function ProtectedRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/gardeners" element={<GardenersPage />} />
          <Route path="/admin/clients" element={<ClientsPage />} />
          <Route path="/admin/jobs" element={<JobsPage />} />
          <Route path="/admin/tasks" element={<TasksPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}