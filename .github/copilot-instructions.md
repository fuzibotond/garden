# Gardener App — Copilot Instructions

## Project purpose
This is a learning project for a gardener service platform.

The platform has 3 roles:
- Admin
- Gardener
- Client

Main goals:
- Help gardeners manage clients, services, jobs, schedules, and working hours
- Help clients create tasks, request work, and see upcoming visits
- Help admin users view and manage everything

## Product and domain language
Use these terms consistently:

- **Task** = an individual work item requested by a client  
  Example: "Trim front hedge"

- **Job** = a scheduled visit or work order that may contain one or more tasks  
  Example: "Visit on Tuesday at 14:00"

- **Service** = a gardener-defined offering  
  Example: "Lawn mowing"

- **Recurring service** = a repeating service plan that creates planned work over time

Do not confuse **task** and **job**.
A job can contain multiple tasks.

## Tech stack
Frontend:
- React Native + Expo for mobile app
- React web for admin/browser access
- TypeScript

Backend:
- ASP.NET Core
- Modular monolith first
- SQL Server
- RabbitMQ later for async workflows
- gRPC later when services are extracted

Infrastructure:
- Docker Compose for local development
- Kubernetes later
- Azure DevOps for CI/CD

## Architecture rules
- Start with a **modular monolith**, not microservices
- Prefer **simple, maintainable solutions**
- Use **clear module boundaries**
- Prefer **vertical slice architecture** inside modules
- Keep business logic out of controllers
- Do not introduce gRPC or RabbitMQ unless the feature actually needs it
- Do not prematurely optimize for distributed systems

Current backend modules:
- Identity
- Gardeners
- Clients
- Catalog
- Tasks
- Scheduling
- Notifications
- TimeTracking

## Coding principles
- Write clear, boring, maintainable code
- Prefer readability over cleverness
- Avoid unnecessary abstractions
- Keep functions small and focused
- Use explicit names
- Follow existing project patterns
- Add comments only when they explain intent, not obvious code

## Backend rules
- Use ASP.NET Core conventions
- Validate input at the application boundary
- Keep controllers/endpoints thin
- Put use-case logic in application handlers/services
- Keep domain logic close to the domain model
- Use SQL Server with EF Core
- Add migrations when changing persistence
- Handle errors explicitly
- Use structured logging
- Enforce authorization in every protected endpoint

## Frontend rules
- Use TypeScript strictly
- Prefer functional React components
- Keep screens/components focused
- Separate server state from UI state
- Reuse shared contracts where possible
- Do not over-share UI between mobile and web
- Design mobile for gardener/client workflows
- Design web for admin workflows

## Authorization rules
There are 3 roles:
- **Admin**: full access to all data and operations
- **Gardener**: access only to their own clients, services, jobs, and time tracking
- **Client**: access only to their own tasks, jobs, and invitations

Never bypass authorization rules.
When writing endpoints, always check both:
- role-based authorization
- resource ownership where relevant

## Testing rules
Always add or update tests for business logic.

Prioritize tests for:
- authorization rules
- task/job behavior
- scheduling conflict logic
- invitation flow
- recurring service logic
- multi-task job behavior

Prefer:
- unit tests for domain/application logic
- integration tests for API + database behavior

## Domain behavior rules
- A gardener can invite a client by email or phone
- A client can accept an invitation and register
- A gardener can define services
- A client can create tasks
- A gardener can schedule jobs
- A job can include multiple tasks
- Working hours/time entries must be attachable to completed work
- Admin can inspect and manage everything

## What to avoid
- Do not merge Task and Job into one entity
- Do not create microservices by default
- Do not create generic base classes unless clearly needed
- Do not add infrastructure complexity without a real reason
- Do not skip tests for business rules
- Do not skip authorization
- Do not invent requirements not supported by the domain

## Preferred workflow when generating code
When implementing a feature:
1. Define or confirm the use case
2. Identify the module
3. Add or update contracts/models
4. Implement the backend vertical slice
5. Add tests
6. Implement the frontend screen/form
7. Wire API integration
8. Keep the change small and reviewable

## Output expectations
When generating code:
- explain assumptions briefly
- keep changes small
- prefer production-style code over throwaway demo code
- include tests when adding business logic
- match the existing folder structure and naming conventions