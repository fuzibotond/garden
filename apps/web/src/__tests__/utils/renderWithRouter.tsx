import { render, type RenderOptions } from "@testing-library/react"
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom"
import type { ReactElement, ReactNode } from "react"

interface RouterWrapperProps extends MemoryRouterProps {
  children: ReactNode
}

function RouterWrapper({ children, ...routerProps }: RouterWrapperProps) {
  return <MemoryRouter {...routerProps}>{children}</MemoryRouter>
}

interface RenderWithRouterOptions extends RenderOptions {
  initialEntries?: string[]
  initialIndex?: number
}

/**
 * Renders a component inside a MemoryRouter, which is required by any
 * component that uses React Router hooks (useNavigate, NavLink, etc.).
 */
export function renderWithRouter(
  ui: ReactElement,
  { initialEntries = ["/"], initialIndex, ...renderOptions }: RenderWithRouterOptions = {},
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <RouterWrapper initialEntries={initialEntries} initialIndex={initialIndex}>
        {children}
      </RouterWrapper>
    ),
    ...renderOptions,
  })
}
