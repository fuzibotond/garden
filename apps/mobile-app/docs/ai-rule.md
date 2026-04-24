# AI Development Rules & Standards

**Project:** Gardener App
**Version:** 1.0.0
**Last Updated:** 2026-04-24
**Status:** Active

---

# 1. Purpose

This document defines the **rules, patterns, and constraints** that AI tools (Copilot, ChatGPT) MUST follow when generating or modifying code and documentation in this repository.

The goal is to:

* Maintain **consistency**
* Prevent **duplication**
* Enforce **architecture decisions**
* Keep **documentation accurate and up to date**

---

# 2. Core Principles

## 2.1 Single Source of Truth

* Every concept MUST have **one canonical location**
* Existing files MUST be updated instead of creating new ones

❌ Bad:

* scheduling-v2.md
* scheduling-new.md

✅ Good:

* Update: scheduling.md

---

## 2.2 No Duplication

* Do NOT duplicate:

  * Documentation
  * Services
  * DTOs
  * Domain concepts

* Always search for an existing implementation before creating a new one

---

## 2.3 Extend, Don’t Recreate

* Modify existing:

  * Modules
  * Handlers
  * Services
  * Documentation

* Only create new files when:

  * The concept does not exist
  * It introduces a clearly new responsibility

---

## 2.4 Follow Domain Language

The system uses strict domain terminology:

* **Task** = requested work
* **Job** = scheduled work

These MUST NEVER be mixed or redefined.

---

# 3. Documentation Rules

## 3.1 Documentation Location

All documentation MUST live in:

```
/docs
```

---

## 3.2 Update Policy

* If documentation exists → UPDATE IT
* NEVER create duplicate versions

---

## 3.3 Structure

Each document SHOULD follow:

* Purpose
* Scope
* Definitions
* Flows / Examples
* Notes / Decisions

---

## 3.4 Versioning

Each document MUST include:

```
Version: X.Y.Z
Last Updated: YYYY-MM-DD
```

### Version Rules

* **MAJOR (X)** → Breaking conceptual changes
* **MINOR (Y)** → New sections / features
* **PATCH (Z)** → Edits, clarifications

---

## 3.5 Change Log (Required)

Each document MUST include:

```
## Change Log

### [1.0.0] - 2026-04-24
- Initial version

### [1.1.0]
- Added scheduling flow

### [1.1.1]
- Fixed terminology
```

---

# 4. Architecture Rules

## 4.1 Architecture Style

* Modular Monolith (initial phase)
* Clear module boundaries

Modules include:

* Identity
* Gardeners
* Clients
* Tasks
* Scheduling
* Notifications
* TimeTracking

---

## 4.2 Module Boundaries

* Modules MUST NOT directly depend on each other’s internal logic
* Communication via:

  * Application layer
  * Events (later)

---

## 4.3 Vertical Slice Pattern

Inside each module:

* Feature-based structure
* Each feature contains:

  * Request
  * Handler
  * Validator
  * Domain logic

---

## 4.4 No Cross-Module Leakage

❌ Bad:

* Scheduling directly accessing Task database tables

✅ Good:

* Scheduling uses contracts or events

---

# 5. Code Generation Rules

## 5.1 File Creation Rules

AI MUST:

* Prefer updating existing files
* Avoid creating:

  * `*v2*`
  * `*new*`
  * `*updated*`

---

## 5.2 Service Rules

* Reuse existing services
* Do NOT create similar services with overlapping responsibility

---

## 5.3 DTO & Contract Rules

* Reuse existing DTOs
* Extend DTOs when needed
* Do NOT duplicate similar structures

---

## 5.4 Naming Consistency

* Follow existing naming patterns
* Use domain-aligned names only

---

# 6. Anti-Chaos Rules (Critical)

AI MUST NOT:

* Create duplicate documents
* Create alternative versions of the same concept
* Introduce similar concepts with different names
* Ignore existing architecture

AI MUST ALWAYS:

* Search for existing implementation first
* Extend instead of duplicating
* Keep naming consistent
* Respect module boundaries

---

# 7. Decision Awareness

AI MUST respect documented decisions in:

```
/docs/decisions.md
```

If a decision exists:

* It MUST be followed
* It MUST NOT be redefined

---

# 8. When in Doubt

AI SHOULD:

1. Check if the concept already exists
2. Update instead of creating
3. Follow existing patterns
4. Keep changes minimal and consistent

---

# 9. Usage Instruction (For Developers)

When using AI tools, ALWAYS include:

```
Follow the rules in /docs/ai-rules.md
```

Optional:

```
Do not create new files unless necessary.
Update existing documentation.
Follow modular monolith structure.
```

---

# 10. Future Evolution

This document will evolve as the system grows:

* v1.x → Modular monolith phase
* v2.x → Microservices transition
* v3.x → Distributed system maturity

---

# Change Log

### [1.0.0] - 2026-04-24

* Initial version of AI rules
* Defined documentation, architecture, and code generation rules
* Introduced versioning and anti-chaos enforcement
