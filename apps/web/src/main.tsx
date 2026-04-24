import { Theme } from '@radix-ui/themes'
import '@radix-ui/themes/styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import "./index.css"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme
      appearance="dark"
      accentColor="green"
      grayColor="sage"
      radius="large"
      scaling="100%"
    >
      <App />
    </Theme>
  </StrictMode>,
)
