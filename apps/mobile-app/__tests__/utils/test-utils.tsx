/**
 * Test utilities and helpers
 */

import { AuthProvider } from '@/context/AuthContext';
import { render, RenderOptions } from '@testing-library/react';
import React, { ReactElement } from 'react';

/**
 * Render a component with all necessary providers
 */
function AllTheProviders({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

export * from '@testing-library/react';
export { renderWithProviders as render };

/**
 * Mock fetch for API calls
 */
export function mockFetch(response: any, status = 200) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: status < 400,
      status,
      json: async () => response,
      text: async () => JSON.stringify(response),
    } as Response)
  );
  return (global.fetch as jest.Mock);
}

/**
 * Reset all mocks
 */
export function resetMocks() {
  jest.clearAllMocks();
  jest.resetAllMocks();
}

/**
 * Wait for async operations
 */
export async function waitForAsync() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Create a mock async delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
