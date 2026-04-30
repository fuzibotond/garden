import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  define: {
    // Provide a stable API URL for all test runs so env.ts resolves correctly
    "import.meta.env.VITE_API_URL": JSON.stringify("http://localhost:5000"),
    "import.meta.env.MODE": JSON.stringify("test"),
    "import.meta.env.DEV": JSON.stringify(false),
    "import.meta.env.PROD": JSON.stringify(false),
    "import.meta.env.SSR": JSON.stringify(false),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      include: [
        "src/lib/auth.ts",
        "src/services/apiClient.ts",
        "src/pages/login/LoginPage.tsx",
        "src/pages/dashboard/DashboardPage.tsx",
        "src/pages/jobs/JobsPage.tsx",
        "src/pages/scheduling/ClientSchedulingPage.tsx",
      ],
      thresholds: {
        // Thresholds reflect actual coverage of the tested files.
        // auth.ts and LoginPage.tsx are fully covered; JobsPage and apiClient
        // have large untested surface area in edit/delete/invoice flows.
        statements: 45,
        branches: 45,
        functions: 30,
        lines: 48,
      },
    },
  },
})
