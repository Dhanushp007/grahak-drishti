# GRAHAK-DRISHTI — POC Stabilization, Demo Readiness & Presentation Plan

**Document type:** Implementation / execution plan
**Purpose:** Turn the existing GRAHAK-DRISHTI repository into a clean, fast, web-accessible, end-to-end hackathon proof of concept without unnecessarily removing or rewriting working functionality.
**Primary audience:** Copilot Agent / engineering agent
**Status:** Ready for execution

---

## 1. Mission

GRAHAK-DRISHTI must be presented as a **working web prototype for consumer intelligence**, not as a generic complaint portal and not as a replacement for CPGRAMS, NCH, e-Jagriti, or other government systems.

The prototype must let a judge complete the main journey from start to finish in a browser using synthetic/demo data:

```text
Citizen enters demo web app
        ↓
Instant demo login
        ↓
Reports a consumer problem
        ↓
Backend stores the complaint
        ↓
AI / intelligence layer understands the complaint
        ↓
Similar complaints / issue cluster identified
        ↓
Citizen sees a useful explanation and next step
        ↓
Citizen can choose "I experienced this too"
        ↓
System requests supporting proof/evidence before accepting the corroboration
        ↓
Evidence is recorded as synthetic/demo evidence metadata
        ↓
Issue/cluster confidence and counts update appropriately
        ↓
Government view shows the systemic issue
        ↓
India/state-level pattern analysis is visible where already implemented and functional
        ↓
Issue drill-down shows impact, evidence, trend and routing recommendation
        ↓
Judge understands the product value immediately
```

The central product message remains:

> **From Individual Complaints to Consumer Intelligence**

and:

> **See patterns. Route smarter. Resolve faster.**

GRAHAK-DRISHTI is a **citizen-facing intelligence and escalation layer across India's consumer-protection ecosystem**. It is not a replacement for existing government systems.

The project documentation explicitly frames NCH 2.0 as already solving digital access and complaint registration, while GRAHAK-DRISHTI addresses the information-scalability problem created by the accumulated complaint stream. The system is intended to complement existing systems rather than replace them. See the project PRD for the established positioning.

---

## 2. Critical positioning: CPGRAMS vs NCH vs GRAHAK-DRISHTI

### 2.1 Do not position GRAHAK-DRISHTI as CPGRAMS

GRAHAK-DRISHTI is **not a CPGRAMS clone** and should not be described as one.

The existing project documentation is centered on the **National Consumer Helpline / NCH 2.0 and the broader consumer-protection ecosystem**, with e-Jagriti, convergence partners, regulators and other government systems forming part of the downstream ecosystem.

The correct conceptual relationship is:

```text
Existing consumer-protection ecosystem

NCH / consumer grievance access
        │
e-Jagriti / formal consumer dispute resolution
        │
other regulators / departments / convergence mechanisms
        │
        ▼
GRAHAK-DRISHTI
intelligence + orchestration layer
        │
        ├── complaint understanding
        ├── duplicate / similarity detection
        ├── systemic issue detection
        ├── consumer signals
        ├── geographic pattern analysis
        └── intelligent routing / escalation recommendation
```

The PRD explicitly states that the project should not say **"We built a better NCH"**. The intended message is that India already has multiple consumer-protection systems and GRAHAK-DRISHTI connects the citizen journey and adds an intelligence layer above them.

### 2.2 What to say in the demo

Use language such as:

> "Existing consumer systems can receive and process grievances. GRAHAK-DRISHTI identifies when many individual complaints are actually one larger consumer problem."

Avoid:

- "We replaced CPGRAMS."
- "We replaced NCH."
- "We built a new government grievance portal."
- "We directly integrate with live government systems."

Unless an actual integration exists and is explicitly documented, all government routing or escalation must be shown as a **recommendation / mock handoff**.

---

## 3. Hackathon success criteria

The implementation must optimize for the stated hackathon criteria:

1. Solve one clearly defined user problem.
2. Complete the main user journey from start to finish.
3. Be easier to understand and use than a traditional grievance workflow.
4. Work well for Indian users, including mobile web users, slower connections and people with limited digital experience.
5. Use mock/synthetic data wherever real identity, payment, OTP, or government integrations would otherwise be required.
6. Demonstrate a clear product idea, not merely a technology stack.
7. Keep the interface clean, useful, lightweight and purposeful.

The project principle is:

> **Ideas over code.**

The evaluator should remember the product idea and the user journey, not the number of services or infrastructure components.

---

## 4. Current repository preservation policy

### 4.1 Preserve existing implementation

The repository already contains significant implementation across:

- root configuration/documentation
- GitHub/Copilot governance
- GitHub Actions
- citizen web app
- admin web app
- FastAPI API
- database migrations
- complaints API/domain
- issue/signal APIs
- AI classification
- dark-pattern detection
- duplicate detection
- embeddings
- clustering
- signal generation
- routing engine
- tests
- load/smoke scripts

The current tree shows existing API migrations through issue signals, AI modules for classification, dark-pattern detection, duplicates and embeddings, and clustering/routing tests. Preserve these implementations and validate them before replacing anything.

### 4.2 Never remove working functionality merely for cleanliness

Do not delete existing modules, services or infrastructure simply because the implementation plan has changed.

Only remove, disable, isolate or comment out existing functionality when one of the following is true:

- it causes a demonstrable runtime/build/test failure;
- it creates a direct architecture conflict;
- it materially harms performance;
- it creates duplicated functionality that is clearly dead code;
- it introduces security problems;
- it prevents the browser prototype from working;
- it creates excessive tool/agent complexity that blocks implementation.

When something is questionable but not harmful, **preserve it**.

### 4.3 Prefer integration over replacement

If an existing implementation provides 70% of a required capability, extend it.

Do not create a second competing implementation of the same feature.

Examples:

- Extend existing issue APIs instead of creating another issue service.
- Extend existing duplicate detection instead of creating a new duplicate detector.
- Extend existing routing engine instead of writing a second routing module.
- Reuse existing dashboard analytics if they work.
- Reuse existing CSS/components where they are clean enough.

---

## 5. Web-first requirement

This project is a **web application prototype**.

Do not build a native Android application.

Do not build a native iOS application.

Do not spend hackathon time on APKs, App Store packaging, native navigation or native device APIs.

The primary deliverable is a browser-accessible website.

### 5.1 Required browser targets

The citizen application must work well on:

- mobile browsers
- tablet browsers
- desktop browsers

The government/admin application is primarily desktop/tablet oriented but must remain responsive enough for smaller widths.

### 5.2 Responsive design priority

Citizen design priority:

1. mobile web
2. tablet web
3. desktop web

The UI must not become a miniature desktop dashboard on mobile.

---

## 6. Product architecture for the POC

Keep the existing architecture but simplify the **demonstration path**.

```text
                    GRAHAK-DRISHTI
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
       Citizen Web                Government Web
             │                           │
             └─────────────┬─────────────┘
                           │
                           ▼
                      FastAPI API
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
         Complaints     Issues      Dashboard
              │            │            │
              └────────────┼────────────┘
                           ▼
                  Intelligence Layer
                           │
           ┌───────────────┼────────────────┐
           ▼               ▼                ▼
       AI analysis     Similarity        Routing
                           │
                           ▼
                    Clusters / Signals
                           │
                           ▼
                     PostgreSQL
                     + pgvector
```

Infrastructure such as Kafka, Valkey/Redis, OpenSearch, MinIO and observability may remain in the repository where already implemented, but those components must not block the browser POC unless the feature being demonstrated actually requires them.

The project PRD recommends an event-driven architecture with complaint ingestion, AI classification, vector similarity, duplicate detection, clustering, priority and escalation. Preserve this architectural intent while ensuring that the demo path remains reliable.

---

## 7. Primary user journeys

The POC must prioritize three journeys.

### Journey A — Citizen reports a problem

```text
Landing page
  ↓
Demo login
  ↓
Report an issue
  ↓
Describe what happened
  ↓
Optional company/seller + amount
  ↓
Add evidence
  ↓
Submit
  ↓
Processing state
  ↓
AI/intelligence summary
  ↓
Similar issue discovered
  ↓
Recommended next step
```

### Journey B — Citizen corroborates an existing issue

```text
Explore issue
  ↓
Issue details
  ↓
"I experienced this too"
  ↓
Evidence requirement
  ↓
Submit supporting proof
  ↓
Evidence confirmation
  ↓
System records corroboration
  ↓
Cluster / issue metrics update
```

### Journey C — Government sees systemic intelligence

```text
Government demo login
  ↓
Command center
  ↓
Emerging issue
  ↓
Issue drill-down
  ↓
Complaint pattern
  ↓
State/geographic analysis
  ↓
Evidence quality / confidence
  ↓
Impact
  ↓
Routing recommendation
```

---

## 8. "I experienced this too" must NOT be a blind vote

This is a mandatory product rule.

The interaction must **not** simply increment a counter when the user clicks a button.

Bad flow:

```text
Click "I experienced this too"
      ↓
+1 consumer
```

Required flow:

```text
Click "I experienced this too"
      ↓
Explain why supporting evidence helps
      ↓
Ask the user to submit proof
      ↓
Evidence type
      ├── invoice / bill
      ├── order screenshot
      ├── refund/cancellation screenshot
      ├── email/message screenshot
      ├── warranty document
      ├── photo/video
      └── other supporting proof
      ↓
Optional short explanation
      ↓
Submit corroboration
      ↓
Evidence stored / validated in demo backend
      ↓
Corroboration accepted
      ↓
Cluster count / confidence updates
```

### 8.1 Evidence does not need to be legally verified in the POC

The prototype must **not pretend that synthetic evidence is legally verified**.

Use states such as:

- `submitted`
- `demo-checked`
- `pending-review`
- `accepted-for-signal`
- `rejected`

For the hackathon demo, the backend may simulate evidence checking, but the UI must be transparent:

> "Demo evidence submitted. In a production system this would be reviewed/validated before being treated as verified evidence."

### 8.2 Do not use fake proof as if it were real

Never label generated demo evidence as real evidence.

Use:

> **Synthetic demo evidence**

or:

> **Demo-only supporting document**

### 8.3 Cluster metrics

Distinguish between:

- reports submitted
- corroborated reports
- evidence-backed reports
- reviewed reports

For example:

```text
439 consumer reports
312 evidence-backed
178 reviewed
```

This is more credible than simply showing one large number.

---

## 9. AI/intelligence requirements

The existing AI capabilities must be validated and integrated rather than recreated.

The system should be able to derive structured information such as:

- merchant/company
- sector/category
- problem type
- amount
- severity
- evidence presence
- similarity/duplicate relationship
- potential routing destination

The PRD explicitly defines these extraction targets.

### 9.1 Reliable fallback

The demo must not fail just because an external model/API is unavailable.

Use a layered strategy:

```text
Actual AI/model path when configured
              │
              ▼
      structured result
              │
              │ fallback if unavailable
              ▼
Deterministic demo intelligence
```

The deterministic fallback must use the same output schema so the frontend does not care which path produced the result.

### 9.2 Never expose raw model uncertainty as fact

Use confidence indicators where useful.

Examples:

- High confidence
- Moderate confidence
- Needs review

Do not claim certainty where the system only has a heuristic match.

---

## 10. Mock/demo backend requirements

The backend must be real HTTP/API behavior backed by synthetic data.

Do not implement the prototype as a frontend-only mock.

### 10.1 Required behavior

The frontend must call the backend for:

- demo login
- complaint creation
- complaint retrieval
- issue listing
- issue details
- corroboration submission
- evidence metadata
- dashboard metrics
- geographic analytics
- routing recommendations

### 10.2 Synthetic data only

Use fictional identities, merchants and cases.

Do not commit:

- real names tied to real contact information;
- real phone numbers;
- real OTPs;
- real government credentials;
- real consumer documents;
- real bank/payment data.

---

## 11. Synthetic dataset strategy

Do not merely generate random complaints.

Create a **scenario-driven synthetic dataset** that produces meaningful patterns.

### 11.1 Core datasets

Create or complete:

```text
data/
├── seed/
│   ├── consumers.json
│   ├── merchants.json
│   ├── complaints.json
│   ├── clusters.json
│   ├── signals.json
│   ├── routing-rules.json
│   └── evidence.json
│
└── synthetic/
    ├── scenarios/
    │   ├── refund-delays.json
    │   ├── hidden-charges.json
    │   ├── warranty-rejection.json
    │   ├── fake-listings.json
    │   └── subscription-traps.json
    └── README.md
```

This structure is illustrative. Reuse the project's existing structure if an equivalent already exists.

### 11.2 Recommended demo-scale dataset

Use enough data for the UI to feel credible but not so much that local startup or CI becomes slow.

Target order of magnitude:

- 500–2,000 synthetic consumers
- 5,000–20,000 synthetic complaints
- 20–50 issue clusters
- 20–100 consumer signals
- 10–30 routing rules
- a small set of evidence metadata records

The exact volume is less important than the quality of the patterns.

### 11.3 Showcase scenarios

At minimum include:

1. Refund delays
2. Hidden charges
3. Warranty rejection
4. Fake listings
5. Subscription traps

Make at least one scenario strong enough to demonstrate the full journey.

Recommended golden scenario:

```text
QuickKart
Refund delays
12 states
hundreds of reports
strong evidence-backed subset
increasing monthly trend
high-confidence systemic signal
```

All statistics must be labeled synthetic unless sourced from an official source.

---

## 12. Instant demo login

The prototype must avoid OTP or external identity dependencies.

Provide a clear demo entry point such as:

```text
Continue as Citizen
Continue as Government Official
```

or:

```text
Citizen Demo
Government Demo
```

The user should enter the experience immediately.

Show a compact notice:

> **Demo environment — synthetic data only.**

Do not implement real OTP flows for this POC.

---

## 13. Citizen web design

The citizen web app must be clean, lightweight and understandable within seconds.

### 13.1 Primary navigation

Keep the citizen navigation intentionally small, for example:

```text
Home
Report an Issue
My Reports
Explore Issues
```

Use whatever equivalent routes already exist rather than creating duplicate pages.

### 13.2 Home page

Primary content:

```text
GRAHAK-DRISHTI
Consumer Protection Intelligence

What happened?
[ Describe your problem ]

[ Report an Issue ]

Emerging consumer issues
```

Do not overload the landing page with architecture, large dashboards or excessive metrics.

### 13.3 Form language

Prefer plain language:

- "What happened?"
- "Company or seller"
- "How much money is involved?"
- "Add proof"
- "Submit complaint"

Avoid unnecessarily bureaucratic wording.

### 13.4 Mobile web

Design for narrow screens first.

Touch targets must be comfortable.

Avoid horizontal scrolling.

Avoid large dense tables on mobile.

Use progressive disclosure for supporting details.

---

## 14. Issue discovery and consumer network

The public issue layer must contain **anonymized system-level information**, not private consumer complaints.

Example:

```text
Refund delays on QuickKart

438 consumers reported this
12 states affected
₹31.4L reported impact
+240% this month

[ I experienced this too ]
[ View details ]
```

This aligns with the existing product concept that repeated complaints become anonymized public issue signals.

Do not expose raw personal information in the public issue layer.

---

## 15. Government/admin web design

The admin dashboard is the judge-facing intelligence experience.

It should feel like a **consumer intelligence command center**, not a generic CRUD admin portal.

### 15.1 Overview

Show a small set of meaningful metrics:

```text
New complaints
Systemic issues detected
High-severity issues
Potential fraud clusters
Dark-pattern reports
```

### 15.2 Emerging issues

Show:

- issue name
- affected consumers
- geographic spread
- trend
- severity
- confidence
- impact

### 15.3 Issue drill-down

The issue drill-down should answer:

1. What is happening?
2. Who is affected?
3. Where is it happening?
4. How fast is it growing?
5. What evidence supports it?
6. How severe is it?
7. What action is recommended?

---

## 16. India / geographic analysis

The existing repository **does not prove from the project tree alone that an India-state visualization is already implemented**. The project tree shows existing dashboard/frontend code and map-related packages/icons, but those do not by themselves establish that a functional India complaint map exists.

Therefore the agent must inspect the actual frontend and backend implementation before deciding what to change.

### 16.1 If the India geographic analysis already exists and is functional

**Preserve it and include it in the demo.**

Do not rebuild it just for visual reasons.

Use it to demonstrate:

```text
India
 ↓
State-level complaint distribution
 ↓
Emerging issue concentration
 ↓
Affected consumers / reports
 ↓
Trend or severity
```

### 16.2 If it exists but is broken or incomplete

Repair it with minimal changes.

Do not replace the underlying analytics unnecessarily.

### 16.3 If it does not exist

Add a lightweight web visualization only if it improves the main story.

Recommended view:

- India outline/map
- state-level intensity/count
- click or hover for state summary
- legend
- accessible fallback list/table for users who cannot use the map

Do not add a heavy GIS platform.

Do not load unnecessarily large geographic datasets.

Do not make geography the primary citizen interaction.

The India view belongs mainly to the **government intelligence** experience.

---

## 17. Performance and lightweight frontend rules

### 17.1 Preserve performance

Before adding dependencies:

1. Check whether the existing stack already supports the required UI.
2. Reuse existing components.
3. Prefer CSS/SVG/lightweight libraries.
4. Avoid adding a library for a single visual effect.

### 17.2 Avoid

- autoplay video
- large background images
- excessive animation
- unnecessary client-side rendering
- huge chart bundles
- duplicated component libraries
- large GIS packages for a simple map
- multiple data-fetching libraries doing the same job

### 17.3 Required states

Every API-backed page must support:

- loading
- success
- empty
- error
- retry

Avoid blank screens.

---

## 18. UI quality bar

The UI should feel:

- calm
- trustworthy
- modern
- lightweight
- government-credible without looking bureaucratic
- consumer-friendly
- accessible
- concise

Prioritize:

- typography
- spacing
- alignment
- visual hierarchy
- clear primary actions
- consistent cards/tables/badges
- restrained color usage
- readable charts
- obvious success/error states

Do not add visual decoration merely to make the UI look busy.

---

## 19. No dead interactions

Before a phase is considered complete, inspect every visible:

- button
- link
- card
- filter
- search field
- dropdown
- tab
- CTA
- upload control

Every interaction must either:

1. work;
2. intentionally show a meaningful demo response;
3. be removed/disabled if it is not part of the POC.

Never leave:

- `Coming soon`
- dead links
- placeholder dialogs
- fake buttons
- broken loading screens
- empty drill-downs

unless a feature is explicitly outside the current demo scope.

---

## 20. End-to-end golden scenario

The implementation must support one deterministic, repeatable demo scenario.

### Citizen side

```text
Login as Demo Citizen
        ↓
Open Report an Issue
        ↓
Enter:
"I cancelled my QuickKart order 12 days ago. The refund of ₹3,499 was confirmed but I still have not received it."
        ↓
Submit
        ↓
System classifies:
Category = E-Commerce
Issue = Refund Delay
Merchant = QuickKart
Amount = ₹3,499
        ↓
System matches an existing issue cluster
        ↓
Show:
"We found 438 similar consumer reports."
        ↓
Show the issue details
        ↓
Recommended next step
```

### Corroboration

```text
Click "I experienced this too"
        ↓
Prompt for supporting proof
        ↓
Select "refund/cancellation screenshot"
        ↓
Submit synthetic demo evidence
        ↓
Show:
"Your report has been recorded for review."
        ↓
Cluster count / evidence-backed count updates according to backend rules
```

### Government side

```text
Login as Demo Government Official
        ↓
Open command center
        ↓
Refund Delays appears as an emerging issue
        ↓
Open issue
        ↓
Show:
- consumers affected
- states affected
- trend
- reported financial impact
- evidence-backed reports
- confidence
- geographic analysis
- recommended routing
```

The demo must be deterministic enough that repeated setup produces the same story.

---

## 21. Data truthfulness rules

Because this is a prototype, synthetic data is allowed and preferred.

However, the UI must clearly communicate when data is synthetic.

Use a global label such as:

> **Synthetic demo data**

or:

> **Demo environment — no real consumer information**

Do not imply:

- the dashboard is live government data;
- the complaints are real consumer submissions;
- the map contains official statistics;
- a routing recommendation is an actual government handoff;
- an evidence file is legally verified.

The project PRD explicitly requires dashboard/demo figures and issue examples to be labeled synthetic unless directly sourced from official public sources.

---

## 22. Backend/API priorities

Do not expose unnecessary APIs just because the architecture contains many services.

The POC should have clear, functional contracts roughly covering:

```text
Demo authentication

GET  /api/v1/issues
GET  /api/v1/issues/{id}

POST /api/v1/complaints
GET  /api/v1/complaints
GET  /api/v1/complaints/{id}

POST /api/v1/issues/{id}/corroborations
POST /api/v1/corroborations/{id}/evidence

GET  /api/v1/dashboard/overview
GET  /api/v1/dashboard/issues
GET  /api/v1/dashboard/issues/{id}
GET  /api/v1/dashboard/geography

GET  /api/v1/complaints/{id}/routing
```

Reuse existing endpoint design wherever it already works.

Do not duplicate equivalent endpoints.

---

## 23. Database and seed requirements

Use the existing database implementation where functional.

Do not replace the existing schema simply to match this document.

Extend through migrations.

The seed process must be deterministic.

Prefer a command such as:

```text
python -m <existing_seed_module>
```

or an existing project-supported equivalent.

Provide a repeatable way to:

1. initialize the database;
2. apply migrations;
3. seed synthetic data;
4. reset the demo state.

If the existing project already has these mechanisms, use them.

---

## 24. Evidence model

The evidence model should support:

```text
Evidence
├── id
├── complaint_id / corroboration_id
├── evidence_type
├── synthetic_flag
├── filename
├── submitted_at
├── validation_status
└── review_note
```

The exact schema may differ based on existing implementation.

The key behavior is that the system must distinguish **a claim of experience** from **an evidence-backed corroboration**.

---

## 25. Demo reset and repeatability

A judge or developer must be able to reset the prototype without manually rebuilding the entire environment.

Provide a safe demo reset/seed capability through an existing script or protected API path.

Example conceptual flow:

```text
Reset Demo
   ↓
Load deterministic seed
   ↓
Restore known issue counts
   ↓
Restore known geographic distribution
   ↓
Restore known dashboard state
```

Do not expose dangerous destructive database endpoints without protection.

---

## 26. Testing strategy

Every phase must validate both technical correctness and the actual user journey.

### Backend

- unit tests
- API tests
- validation tests
- seed tests
- database tests

### AI

- classification fixtures
- duplicate detection fixtures
- extraction fixtures
- confidence/edge cases

### Frontend

- build
- lint
- interaction tests where appropriate
- API integration
- responsive checks

### End-to-end

At minimum verify:

```text
login → complaint → analysis → issue → corroboration → dashboard
```

No phase is complete if only unit tests pass while the visible flow is broken.

---

## 27. Quality gates

Every phase must pass all of the following before its PR is considered complete:

- code compiles/builds;
- backend starts;
- frontend starts;
- relevant tests pass;
- GitHub Actions passes;
- no new console errors;
- no obvious broken interactions;
- no secrets committed;
- synthetic-data labels are present;
- manual validation passes;
- documentation is updated where necessary;
- the phase's user journey works end-to-end.

---

## 28. Branch and PR workflow

Each phase must be isolated in its own feature branch and Pull Request.

Preferred sequence:

```text
main
  ↓
feature/poc-audit
  ↓
PR #1
  ↓
merge
  ↓
feature/synthetic-data
  ↓
PR #2
  ↓
merge
  ↓
feature/backend-demo-flow
  ↓
PR #3
  ↓
merge
  ↓
feature/citizen-web-polish
  ↓
PR #4
  ↓
merge
  ↓
feature/corroboration-evidence
  ↓
PR #5
  ↓
merge
  ↓
feature/government-dashboard-polish
  ↓
PR #6
  ↓
merge
  ↓
feature/geographic-analysis
  ↓
PR #7
  ↓
merge
  ↓
feature/e2e-demo-hardening
  ↓
PR #8
```

Use the actual number of phases required by the repository state. Do not manufacture PRs merely to create more PR numbers.

Each PR should have one coherent purpose.

---

## 29. Phase plan

# Phase 0 — Repository and implementation audit

### Objective
Understand exactly what works before changing it.

### Tasks

- Read all root Markdown documentation.
- Read relevant `.github/` instructions and agents.
- Inspect current Git branch/status.
- Inventory implemented backend endpoints.
- Inventory implemented frontend routes.
- Inventory AI capabilities.
- Inventory database models/migrations.
- Inventory issue/cluster/signal functionality.
- Inventory routing functionality.
- Inventory geographic/map implementation.
- Identify hardcoded frontend data.
- Identify missing frontend/backend connections.
- Identify build/lint/test errors.
- Identify dead or broken UI interactions.
- Identify performance problems.

### Output
Create or update:

```text
docs/poc/IMPLEMENTATION_AUDIT.md
```

### Gate
No feature changes unless required to repair an immediate blocker discovered during audit.

### PR
`chore(poc): audit existing implementation and demo readiness`

---

# Phase 1 — Synthetic data foundation

### Objective
Populate the backend with believable deterministic synthetic data.

### Tasks

- Complete synthetic consumers.
- Complete synthetic merchants.
- Populate complaints.
- Populate issue clusters.
- Populate signals.
- Populate evidence metadata.
- Populate routing rules.
- Create showcase scenarios.
- Create deterministic seed/reset flow.
- Add explicit synthetic-data markers.

### Gate
Database can be seeded from an empty state and produces a usable demo dataset.

### PR
`feat(data): add deterministic synthetic consumer intelligence dataset`

---

# Phase 2 — Backend integration and complete mock API flow

### Objective
Make the backend the authoritative source for the POC web apps.

### Tasks

- Verify/repair existing complaint APIs.
- Verify/repair issue APIs.
- Add demo login if required.
- Add corroboration/evidence API if missing.
- Add dashboard overview endpoints if missing.
- Add geographic analytics endpoint if missing.
- Add routing recommendation endpoint if missing.
- Remove duplicated frontend-owned data sources where they conflict with backend data.
- Ensure all responses are deterministic and valid.

### Gate
All primary UI actions can be driven entirely through HTTP APIs.

### PR
`feat(api): complete mock-backed demo journey APIs`

---

# Phase 3 — Citizen web UX stabilization

### Objective
Make the citizen experience clean, minimal, mobile-first and functional.

### Tasks

- Review every citizen page.
- Simplify navigation.
- Improve typography and spacing.
- Optimize mobile layout.
- Connect all pages to the backend.
- Remove unnecessary visual complexity.
- Implement loading/empty/error states.
- Implement instant demo login.
- Implement complaint submission.
- Implement issue discovery.
- Implement issue details.
- Implement status/confirmation screens.

### Gate
A citizen can complete the entire complaint journey without dead UI.

### PR
`feat(citizen): stabilize and polish the consumer web experience`

---

# Phase 4 — Evidence-backed corroboration

### Objective
Make "I experienced this too" credible rather than a blind vote.

### Tasks

- Replace one-click count increment behavior.
- Add evidence requirement.
- Support synthetic evidence types.
- Add evidence metadata persistence.
- Add validation/review status.
- Update cluster metrics correctly.
- Show user confirmation.
- Clearly distinguish submitted vs evidence-backed reports.

### Gate
A user cannot strengthen a public systemic signal simply by clicking a button; they must submit supporting material in the demo flow.

### PR
`feat(corroboration): add evidence-backed issue confirmation`

---

# Phase 5 — AI / similarity / cluster flow hardening

### Objective
Ensure the intelligence layer visibly works for the golden scenario.

### Tasks

- Validate classifier.
- Validate entity extraction.
- Validate duplicate detection.
- Validate embeddings/similarity.
- Validate clustering.
- Validate signals.
- Add deterministic fallback if model configuration is unavailable.
- Ensure structured outputs are validated.
- Connect the resulting intelligence to the frontend.

### Gate
Submitting the golden complaint leads to the correct showcase issue with believable matching evidence.

### PR
`feat(intelligence): harden complaint understanding and issue matching`

---

# Phase 6 — Government dashboard presentation

### Objective
Turn the existing admin interface into the judge-facing intelligence command center.

### Tasks

- Clean dashboard information hierarchy.
- Show key intelligence metrics.
- Show emerging issues.
- Show severity and confidence.
- Show trend.
- Show impact.
- Add issue drill-down.
- Add complaint evidence summary.
- Add routing recommendation.
- Ensure all figures come from backend APIs.
- Add clear synthetic-data labeling.

### Gate
A judge can understand the systemic problem from the dashboard without developer explanation.

### PR
`feat(admin): polish consumer intelligence command center`

---

# Phase 7 — India geographic analysis

### Objective
Use the existing geographic analysis if available; repair or add a lightweight state-level visualization if necessary.

### Tasks

1. Inspect the current implementation first.
2. Preserve functional existing work.
3. Repair only what is broken.
4. If absent, implement a lightweight India state-level visual.
5. Connect it to backend geographic analytics.
6. Provide accessible state-level fallback data.
7. Add issue/state filtering only if it improves the story.

### Gate
The government can visually understand where an issue is concentrated in India.

### PR
`feat(analytics): add India state-level consumer issue analysis`

---

# Phase 8 — End-to-end demo hardening

### Objective
Make the project reliable enough for a live judge demonstration.

### Tasks

- Create golden demo script.
- Verify fresh startup.
- Verify database setup.
- Verify seed.
- Verify frontend.
- Verify backend.
- Verify demo login.
- Verify complaint submission.
- Verify intelligence match.
- Verify corroboration.
- Verify dashboard update.
- Verify geography.
- Verify routing.
- Verify no dead buttons.
- Verify no console errors.
- Verify mobile web flow.
- Verify slow-network behavior where practical.

### Gate
A clean demo can be performed from a fresh environment without manual database editing.

### PR
`test(e2e): harden complete hackathon demonstration flow`

---

# Phase 9 — Presentation and final cleanup

### Objective
Deliver the final visible polish without destabilizing functionality.

### Tasks

- Remove accidental debug UI.
- Remove dead development copy.
- Fix wording.
- Ensure synthetic labels are consistent.
- Verify favicon/title/metadata.
- Verify responsive behavior.
- Verify accessibility basics.
- Verify loading states.
- Verify error states.
- Verify screenshots/demo flow.
- Verify README/demo instructions.
- Verify no unnecessary dependency additions.
- Verify CI remains green.

### Gate
The website looks intentionally designed and every visible feature works.

### PR
`chore(release): finalize hackathon presentation polish`

---

## 30. Recommended final website information architecture

### Citizen web

```text
/
├── Home
├── Report
├── Issues
│   └── [issue-id]
├── My Reports
│   └── [complaint-id]
└── Demo Login
```

Use equivalent existing routes where already implemented.

### Government web

```text
/admin
├── Overview
├── Issues
│   └── [issue-id]
├── Complaints
├── Geography
└── Routing
```

Do not force this exact route hierarchy if the current app already has a cleaner one.

---

## 31. What counts as a successful final POC

The POC is ready when the following can be demonstrated in one browser session:

### Citizen

- instant demo login;
- report a problem;
- submit evidence metadata;
- receive an intelligence result;
- discover a similar systemic issue;
- view issue details;
- choose "I experienced this too";
- submit supporting proof;
- receive confirmation;
- see appropriate updated issue metrics.

### Government

- instant demo login;
- command center;
- emerging issue detection;
- issue drill-down;
- evidence/quality summary;
- impact and trend;
- India/state analysis where implemented;
- routing recommendation.

### Platform

- browser-accessible;
- synthetic-data only;
- deterministic seed;
- real backend API;
- real database persistence;
- no dead interactions;
- mobile-friendly citizen web experience;
- GitHub Actions passing;
- end-to-end demo verified.

---

## 32. Non-goals for this POC

Do not expand scope into:

- production CPGRAMS integration;
- production NCH integration;
- production e-Jagriti submission;
- real OTP;
- Aadhaar authentication;
- real payment processing;
- production government identity federation;
- native mobile apps;
- large-scale production deployment;
- enterprise IAM;
- advanced real-time observability dashboards unless already implemented and stable.

These can remain architectural directions rather than live demo requirements.

---

## 33. Agent behavior rules

The agent must:

1. Read the existing project documentation before changing code.
2. Inspect existing implementation before creating replacements.
3. Preserve working features.
4. Prefer integration over duplication.
5. Use the smallest change that satisfies the phase.
6. Run tests before opening a PR.
7. Run the project and validate the actual web flow when possible.
8. Never claim a feature works without testing it.
9. Never claim a PR exists without confirmed GitHub MCP success.
10. Never claim real government integration when the project only has a mock.
11. Label synthetic data.
12. Treat supporting evidence as a required step for corroboration.
13. Keep the web experience primary.
14. Keep the citizen path simple.
15. Keep the government dashboard information-dense but understandable.
16. Stop after completing the current phase and PR.
17. Start the next phase from the latest merged main branch.

---

## 34. Final product principle

Do not optimize for the amount of code delivered.

Optimize for this sentence being obvious to the judge:

> **"GRAHAK-DRISHTI turns many individual consumer complaints into one clear picture of the systemic problem behind them."**

---
