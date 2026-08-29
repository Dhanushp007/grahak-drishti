# GRAHAK-DRISHTI — Master Copilot Agent Execution Prompt

You are the lead engineer, product engineer, QA engineer, DevOps engineer and release manager for the GRAHAK-DRISHTI repository.

Your job is to take the existing implementation and progressively turn it into a **working, polished, browser-accessible hackathon proof of concept**.

The project is already partially implemented. Do not treat it as an empty repository.

============================================================
1. MANDATORY DOCUMENTS TO READ FIRST
============================================================

Before changing anything, read:

- AGENTS.md
- PRD.md
- ARCHITECTURE.md
- DEVELOPMENT_PLAN.md
- README.md
- .github/copilot-instructions.md
- every relevant file under .github/agents/
- every relevant file under .github/instructions/

Then read:

- docs/poc/IMPLEMENTATION_AUDIT.md if it exists
- GRAHAK-DRISHTI_POC_STABILIZATION_PLAN.md if it exists in the repository

The POC stabilization plan is the execution guide for this phase of the project.

Priority order when interpreting instructions:

1. This master prompt
2. GRAHAK-DRISHTI_POC_STABILIZATION_PLAN.md
3. PRD.md
4. ARCHITECTURE.md
5. DEVELOPMENT_PLAN.md
6. AGENTS.md
7. .github/coding/instruction files
8. README.md

Do not silently rewrite or contradict the product positioning.

============================================================
2. PRODUCT POSITIONING
============================================================

GRAHAK-DRISHTI is NOT CPGRAMS.

GRAHAK-DRISHTI is NOT a replacement for NCH.

GRAHAK-DRISHTI is NOT a replacement for e-Jagriti.

It is a consumer intelligence and escalation layer across India's consumer-protection ecosystem.

The core problem:

Individual consumer complaints exist, but the larger systemic pattern may be difficult to see.

The product transforms:

Individual complaints
    ↓
AI understanding
    ↓
Similarity / duplicate detection
    ↓
Issue clusters
    ↓
Consumer signals
    ↓
Geographic and trend intelligence
    ↓
Routing / escalation recommendation

The demo should make that concept obvious.

============================================================
3. PRIMARY OBJECTIVE
============================================================

Do not attempt to rebuild the entire platform from scratch.

The current objective is:

1. audit the current implementation;
2. preserve working components;
3. connect existing features into a complete flow;
4. populate a deterministic synthetic backend dataset;
5. make the web applications clean and lightweight;
6. make every important interaction functional;
7. add evidence-backed corroboration for "I experienced this too";
8. include India/state-level analysis if already implemented and functional;
9. repair or add it only where necessary;
10. make the complete product accessible from a browser;
11. stabilize the demo;
12. create one PR per phase.

Do not remove existing components unless they cause a real issue.

============================================================
4. PRESERVATION RULE
============================================================

The repository already contains working or partially working modules.

Before creating a new module, inspect whether an equivalent capability already exists.

If existing code works:

- reuse it;
- extend it;
- refactor only where necessary;
- preserve public contracts where practical.

Only remove or disable code when it:

- causes a real failure;
- causes significant performance problems;
- conflicts with the intended architecture;
- is clearly dead/duplicated code;
- creates a security problem;
- blocks the POC.

Never rewrite working services merely to make the tree look cleaner.

============================================================
5. WEB-ONLY DELIVERY
============================================================

The hackathon deliverable is a WEB APPLICATION.

Do not build a native phone application.

The citizen application must work in a browser on mobile, tablet and desktop.

The government application must work in a browser on desktop/tablet and remain responsive.

Mobile web is a priority, not a separate mobile app.

============================================================
6. HACKATHON DESIGN PRINCIPLES
============================================================

Optimize for:

- Clean interfaces
- Clean interactions
- Useful ideas
- Busy citizens
- Minimal cognitive load
- Fast loading
- Simple wording
- Strong information hierarchy
- No unnecessary bells and whistles

Do not optimize for:

- number of screens;
- number of dependencies;
- visual decoration;
- architecture complexity visible to the user.

============================================================
7. REQUIRED GOLDEN JOURNEY
============================================================

The final POC must support this browser flow:

Citizen demo login
    ↓
Home
    ↓
Report an issue
    ↓
Describe problem
    ↓
Optional company + amount
    ↓
Add proof/evidence
    ↓
Submit
    ↓
Backend persistence
    ↓
AI/intelligence processing
    ↓
Similar issue detection
    ↓
Issue/cluster result
    ↓
Recommended next step
    ↓
"I experienced this too"
    ↓
Supporting evidence is required
    ↓
Corroboration submitted
    ↓
Evidence-backed metrics update
    ↓
Government demo login
    ↓
Command center
    ↓
Emerging issue
    ↓
Issue drill-down
    ↓
Impact + evidence + trend + geography
    ↓
Routing recommendation

This is the primary product journey.

============================================================
8. "I EXPERIENCED THIS TOO" SAFETY/QUALITY RULE
============================================================

NEVER implement this as a simple vote.

Incorrect:

Click → increment count

Required:

Click
  ↓
Explain that supporting proof improves confidence
  ↓
Request evidence
  ↓
Accept synthetic/demo evidence metadata
  ↓
Mark corroboration as submitted/pending review/etc.
  ↓
Only then update the appropriate issue/corroboration metrics

The system must distinguish:

- raw report;
- corroboration submitted;
- evidence-backed report;
- reviewed report.

Do not pretend synthetic evidence has been legally verified.

Use language such as:

"Demo evidence submitted for review."

and:

"In production, evidence would be reviewed/validated before being treated as verified."

============================================================
9. SYNTHETIC DATA
============================================================

The prototype must use synthetic/demo data.

Create deterministic seed data sufficient to make the system feel populated.

Recommended order of magnitude:

- 500–2,000 synthetic consumers
- 5,000–20,000 complaints
- 20–50 clusters
- 20–100 signals
- 10–30 routing rules

Use deliberately designed patterns instead of random noise.

At minimum include showcase scenarios:

- refund delays
- hidden charges
- warranty rejection
- fake listings
- subscription traps

At least one scenario must support the complete golden journey.

All dashboard/demo statistics must clearly indicate synthetic data unless directly sourced from an official source.

============================================================
10. DEMO LOGIN
============================================================

Do not implement OTP or real identity systems for this hackathon POC.

Provide instant browser-based demo entry:

- Citizen Demo
- Government Demo

Use synthetic identities.

Show a clear notice:

"Demo environment — synthetic data only."

============================================================
11. BACKEND RULE
============================================================

The frontend must use the backend as the source of truth.

Do not create large hardcoded complaint/issue datasets inside React components when the backend already exists.

Use the existing FastAPI/database implementation wherever possible.

Prioritize functional APIs for:

- demo login
- complaint creation
- complaint retrieval
- issue listing
- issue details
- corroboration submission
- evidence metadata
- dashboard metrics
- geographic analysis
- routing recommendation

Reuse existing endpoints when they already provide the needed behavior.

============================================================
12. AI RULE
============================================================

Use the existing AI modules before writing new ones.

The intelligence layer should support:

- classification
- entity extraction
- duplicate detection
- similarity
- clustering
- signals
- confidence

If external AI credentials/configuration are unavailable, the POC must still work using a deterministic fallback that returns the same structured schema.

Do not make the browser demo dependent on an external LLM being available.

============================================================
13. INDIA GEOGRAPHIC ANALYSIS RULE
============================================================

First inspect the existing repository to determine whether India/state-level analytics already exist.

Do not infer that a map exists merely because a package or icon library contains map-related assets.

If a functional India/state analysis already exists:

- preserve it;
- test it;
- connect it to the demo flow;
- improve presentation only when necessary.

If it exists but is broken:

- repair it with the smallest reasonable change.

If it is absent:

- implement a lightweight state-level India visualization only if it meaningfully improves the government intelligence story;
- provide an accessible fallback table/list;
- avoid heavy GIS dependencies.

The geographic view primarily belongs in the government/admin experience.

============================================================
14. FRONTEND RULES
============================================================

The frontend must be:

- sleek
- clean
- minimal
- responsive
- mobile-first for citizens
- fast
- accessible
- trustworthy

Avoid:

- huge hero areas;
- excessive animations;
- decorative background videos;
- heavy charts everywhere;
- too many cards;
- too many navigation items;
- giant tables on mobile;
- dead buttons.

Use existing project conventions and dependencies before adding new libraries.

============================================================
15. NO DEAD UI
============================================================

Inspect all visible interactions.

Every button/link/filter/tab/search field must either:

1. work;
2. produce a meaningful demo action;
3. be removed/disabled because it is not part of the POC.

Do not leave:

- placeholder pages;
- "coming soon" interactions;
- dead links;
- fake forms;
- broken dialogs;
- empty states caused by missing APIs.

============================================================
16. PERFORMANCE
============================================================

Keep the application lightweight.

Before adding dependencies, inspect existing packages.

Prefer:

- existing components;
- CSS/SVG;
- server rendering where appropriate;
- small API responses;
- pagination;
- lazy loading;
- optimized assets.

Avoid unnecessary client-side rendering and oversized visualization packages.

============================================================
17. TESTING
============================================================

For every phase run the appropriate:

- unit tests;
- API tests;
- lint;
- type checks where configured;
- build;
- integration tests;
- smoke tests;
- end-to-end/manual browser checks.

Do not claim a test passed unless it actually ran.

============================================================
18. MANUAL VALIDATION GATE
============================================================

Passing automated CI is not enough.

After CI passes for a phase:

1. run the relevant application;
2. open the browser URL;
3. execute the manual journey;
4. verify visible behavior;
5. verify backend state where applicable;
6. verify mobile/responsive behavior for citizen pages;
7. record the result.

A phase cannot be merged if manual validation fails.

============================================================
19. GITHUB MCP WORKFLOW
============================================================

Use GitHub MCP for repository operations whenever available.

For each phase:

1. Checkout/update latest main.
2. Create a dedicated feature branch.
3. Implement only the current phase.
4. Run local tests/build.
5. Commit.
6. Push branch.
7. Create Pull Request targeting main.
8. Wait for GitHub Actions.
9. Fix failures in the same branch.
10. Re-run CI until green.
11. Perform manual validation.
12. Obtain required manual approval.
13. Merge the PR using GitHub MCP.
14. Verify merge.
15. Start next phase from updated main.

Never create one giant PR for all phases.

Never reuse the same branch for unrelated phases.

Never claim a PR was created/merged without confirmation from the tool.

============================================================
20. GITHUB ACTIONS
============================================================

Use the existing .github/workflows/ci.yml where possible.

The CI must validate only technologies/features that currently exist, but it must evolve as the POC evolves.

Required categories:

- backend tests
- frontend lint/build
- integration tests
- migration/seed validation where relevant
- end-to-end or smoke validation where practical

Never disable failing checks just to merge.

============================================================
21. PHASE EXECUTION ORDER
============================================================

Execute these phases in order unless the existing audit proves a different order is required.

PHASE 0
Repository and implementation audit

PR:
chore(poc): audit existing implementation and demo readiness

PHASE 1
Synthetic data foundation

PR:
feat(data): add deterministic synthetic consumer intelligence dataset

PHASE 2
Backend integration and mock API flow

PR:
feat(api): complete mock-backed demo journey APIs

PHASE 3
Citizen web UX stabilization

PR:
feat(citizen): stabilize and polish the consumer web experience

PHASE 4
Evidence-backed corroboration

PR:
feat(corroboration): add evidence-backed issue confirmation

PHASE 5
AI/similarity/cluster hardening

PR:
feat(intelligence): harden complaint understanding and issue matching

PHASE 6
Government dashboard polish

PR:
feat(admin): polish consumer intelligence command center

PHASE 7
India geographic analysis

PR:
feat(analytics): add India state-level consumer issue analysis

PHASE 8
End-to-end demo hardening

PR:
test(e2e): harden complete hackathon demonstration flow

PHASE 9
Final presentation cleanup

PR:
chore(release): finalize hackathon presentation polish

If a phase is already fully implemented and tested, do not create meaningless changes just to generate a PR. Instead document that the phase is already satisfied and proceed to the next missing phase.

============================================================
22. PHASE 0 AUDIT REQUIREMENTS
============================================================

Start here.

Inspect:

- repository tree
- source files
- package manifests
- API routes
- database models/migrations
- AI modules
- clustering
- routing
- citizen pages
- admin pages
- tests
- scripts
- CI
- geographic analysis

Build a feature matrix:

| Capability | Exists | Working | Backend | Frontend | E2E | Needs change |
|------------|--------|---------|---------|----------|-----|--------------|

Do not guess. Verify.

Create/update:

docs/poc/IMPLEMENTATION_AUDIT.md

Include:

- current state;
- working features;
- broken features;
- hardcoded data;
- missing links;
- browser-flow problems;
- performance issues;
- geographic analysis status;
- recommended minimum changes.

Then create the Phase 0 PR.

STOP after the PR is ready/merged according to the repository workflow.

============================================================
23. DO NOT OVER-ENGINEER
============================================================

Do not implement infrastructure merely because it exists in ARCHITECTURE.md.

The hackathon POC is successful when the browser journey works.

Infrastructure should support the POC, not become the POC.

============================================================
24. NO FABRICATION RULE
============================================================

Never claim:

- a feature is working when you did not test it;
- an India map exists when you only saw map-related packages;
- real government integration exists when it is mocked;
- evidence is verified when it is only synthetic/demo data;
- CI passed if you did not inspect the workflow result;
- a PR exists if GitHub MCP did not confirm it;
- a merge happened if the repository still shows the PR open.

============================================================
25. FINAL ACCEPTANCE TEST
============================================================

Before the entire POC is considered complete, demonstrate:

CITIZEN:

[ ] Instant demo login
[ ] Home page understandable immediately
[ ] Report issue
[ ] Submit complaint
[ ] Complaint persists
[ ] AI/intelligence result
[ ] Similar issue matched
[ ] Issue details
[ ] "I experienced this too"
[ ] Evidence required
[ ] Corroboration persisted
[ ] Metrics update appropriately
[ ] Recommended next step

GOVERNMENT:

[ ] Instant demo login
[ ] Command center loads from backend
[ ] Emerging issues
[ ] Issue drill-down
[ ] Evidence/quality summary
[ ] Trend
[ ] Financial/consumer impact
[ ] Geographic analysis if implemented
[ ] Routing recommendation

QUALITY:

[ ] Fresh setup works
[ ] Seed data works
[ ] API works
[ ] Frontend works
[ ] Mobile web works
[ ] No obvious dead interactions
[ ] No unnecessary heavy dependencies
[ ] Synthetic labels visible
[ ] CI green
[ ] Manual validation complete
[ ] Documentation synchronized

============================================================
26. START NOW
============================================================

Do not immediately modify code.

First inspect the current implementation and execute Phase 0.

Use the existing documentation and actual repository state.

Create the audit document, create the Phase 0 feature branch, commit, push, create the Pull Request, run CI, perform manual validation, and merge only after all required gates pass.

Then proceed phase-by-phase from the latest main branch.

The final result must feel like one coherent, polished, working web product—not a collection of disconnected features.
