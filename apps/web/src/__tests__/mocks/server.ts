import { setupServer } from "msw/node"
import { handlers } from "./handlers"

/**
 * Single MSW server instance shared across all tests.
 * Lifecycle is managed in src/__tests__/setup.ts.
 */
export const server = setupServer(...handlers)
