# Garden Web App

React + TypeScript SPA for the Garden platform. Serves Admin, Gardener, and Client roles.

## Quick Start

```bash
cd apps/web
npm install
```

Create `.env.local`:

```
VITE_API_URL=/api
VITE_TARGET_URL=http://localhost:5055
```

```bash
npm run dev      # starts on http://localhost:8082
npm run build    # output → dist/
npm run preview  # preview production build
npm run lint
```

## Documentation

Full documentation lives in [`docs/WEB_APP.md`](docs/WEB_APP.md):

- Tech stack & dependencies
- Folder structure
- Environment variables & Vite proxy setup
- Authentication & routing
- All pages and their API endpoints
- Design system (`GlassUI`)
- Development setup & build

See [`docs/DEVELOPMENT_GUIDE.md`](docs/DEVELOPMENT_GUIDE.md) for the full backend API reference and architecture overview.

See [`docs/ai-rule.md`](docs/ai-rule.md) for AI development rules and coding standards.
