# BillCycle: Project Docs

BillCycle is our build of the **Subscription Management System** problem statement (Odoo hackathon). The fictional client is **Brightloop Software**.

The docs here turn the PDF problem statement into something we can build against. Read them in order:

| # | File | What it covers |
|---|------|----------------|
| 01 | [01-problem-statement.md](01-problem-statement.md) | Close restatement of the PDF, scene by scene. Nothing interpreted. |
| 02 | [02-requirements.md](02-requirements.md) | Numbered functional and non-functional requirements (FR-/NFR-), traced back to scenes |
| 03 | [03-domain-model.md](03-domain-model.md) | Entities, fields, relationships, and state machines |
| 04 | [04-business-rules.md](04-business-rules.md) | Billing engine, tax, discount, payment and overdue logic, edge cases |
| 05 | [05-roles-permissions.md](05-roles-permissions.md) | Admin / Internal / Portal access matrix |
| 06 | [06-research-notes.md](06-research-notes.md) | How Odoo, Stripe and Chargebee handle this, plus metric definitions (MRR, AR aging) |
| 07 | [07-assumptions-open-questions.md](07-assumptions-open-questions.md) | Ambiguities in the PDF, our working assumptions, and questions to confirm |
| 08 | [08-architecture-and-plan.md](08-architecture-and-plan.md) | Architecture options, screens, build order, demo script |
| 09 | [09-execution-plan.md](09-execution-plan.md) | **Decided stack**, repo layout, API contract, phases, git workflow, demo split |
| 10 | [10-task-distribution.md](10-task-distribution.md) | Who builds what: issue list per member, dependencies, handoff contracts |

AI assistants: read [../AGENTS.md](../AGENTS.md) first (authorship rules: no AI co-authors).

## The problem in one paragraph

Brightloop sells software on monthly or yearly subscriptions, with add-ons and product variants. Today subscriptions live in a spreadsheet, renewals depend on someone remembering, invoices are typed by hand, payments are matched by scrolling bank statements, and revenue reports are built manually each quarter. We need **one platform** that covers the whole lifecycle: auth and roles → products, variants and plans → quotation templates → subscriptions → automatic invoicing with taxes and discounts → payments → reporting. It must stay under 2 s per page with thousands of subscriptions.
