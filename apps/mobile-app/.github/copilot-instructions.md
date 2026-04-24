# Copilot Repository Instructions

Always follow the project rules in:

/docs/ai-rules.md

---

## Mandatory Behavior

* Before changing code, check whether documentation must be updated.
* If behavior, API contracts, architecture, domain model, folder structure, or setup steps change, update the related documentation in /docs.
* Do not create a new documentation file if an existing one can be updated.
* Update the document version and Change Log when editing documentation.
* Follow existing project patterns before creating new patterns.
* Do not create duplicate concepts, services, DTOs, handlers, or docs.

---

## README Enforcement (GitHub Standards)

The `README.md` file is the **primary project entry point** and MUST always reflect the current state of the system.

### When to Update README

Update `README.md` when ANY of the following change:

* Project setup or installation steps
* Environment configuration
* Running the application (Docker, scripts, commands)
* Project structure or folder organization
* Technologies used
* Key architecture decisions
* Available scripts or commands
* CI/CD or deployment instructions

---

### README Rules

* The README MUST follow **GitHub standard structure**
* The README MUST be **kept up to date**
* The README MUST NOT be duplicated or versioned (no README-v2.md)

---

### Required README Structure

The README SHOULD contain:

```md
# Project Name

## Description
Short explanation of the project

## Tech Stack
List of technologies used

## Getting Started
Setup instructions

## Running the Project
How to run locally (Docker / commands)

## Project Structure
High-level folder explanation

## Architecture
Short explanation (e.g., modular monolith)

## Documentation
Link to /docs folder

## Contributing
(Optional)

## License
(Optional)
```

---

### README Update Rules

* Prefer updating existing sections over adding new ones
* Keep it concise and clear
* Do not introduce duplicate or conflicting information
* Ensure consistency with `/docs`

---

## Self-Check (MANDATORY)

Before finishing ANY task:

* Did I update documentation if needed?
* Did I update README if setup/usage changed?
* Did I reuse existing files instead of creating new ones?
* Did I follow project patterns and rules?

If NOT → fix it before completing the task.
