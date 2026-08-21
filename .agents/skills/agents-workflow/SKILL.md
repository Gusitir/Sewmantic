---
name: agents-workflow
description: Use only when the user explicitly requests agents-workflow, a durable .agents workflow, or a named job (INIT, PLAN, MAINTAIN, AUDIT, RUN THE LOOP, HANDOFF, CLOSE, COMPACT, REINDEX, EXPORT DOCUMENTATION); exclude ordinary one-off planning, coding, or review.
license: MIT
metadata:
  version: "3.0.0-dev"
---

# agents-workflow

Operate a small, repository-versioned `.agents/` control plane for general-purpose apps.
Dispatch exactly one job from explicit workflow intent; ordinary coding, review, or chat
planning does not trigger this skill. Finish one job before dispatching another.

## Dispatcher

| Job | Trigger | Procedure |
|---|---|---|
| **INIT** | No usable `.agents/` exists | [INIT](references/state-operations.md#init) |
| **PLAN** | Scope or task briefs must be planned | [PLAN](references/planning-execution.md#plan) |
| **MAINTAIN** | Existing control state needs repair | [MAINTAIN](references/state-operations.md#maintain) |
| **AUDIT** | Delivery, review, milestone, or release needs a verdict | [AUDIT](references/audit-verification.md#audit) |
| **RUN THE LOOP** | Execute the active plan through bounded tasks | [RUN THE LOOP](references/planning-execution.md#run-the-loop) |
| **HANDOFF** | Another session must continue active work | [HANDOFF](references/state-operations.md#handoff) |
| **CLOSE** | A verified milestone must be reconciled and archived | [CLOSE](references/closure-export.md#close) |
| **COMPACT** | Control files cost too much context | [COMPACT](references/state-operations.md#compact) |
| **REINDEX** | APPCORE or INDEX may be stale | [REINDEX](references/state-operations.md#reindex) |
| **EXPORT DOCUMENTATION** | A human needs a current project snapshot | [EXPORT DOCUMENTATION](references/closure-export.md#export-documentation) |

Debugging is a procedure overlay, not a job. On any failure use
[debugging discipline](references/debugging.md#debugging-discipline) within the active job.

## Shared invariants

### Fact ownership

- Repository code, configuration, tests, and Git are factual authority.
- `AGENTS.md` owns roles, assurance, durable rules, environment, and gates.
- `APPCORE.md` owns verified stable architecture and reference surfaces.
- `CURRENT.md` owns active job, plan, task, verdict, blockers, and next action.
- The active plan owns approved scope, dependencies, briefs, and task status.
- `CONTEXT.md` owns milestone decisions and handoffs; Git owns detailed history.
- `INDEX.md` owns navigation; `TESTING.md` holds human and unavailable checks only.

Resolve conflict by checking repository facts, then repair the owning file. Reference a
fact from other files instead of copying it. Never present an unknown or template
placeholder as a fact.

### Orchestration roles

- The **Human** approves material scope, risk, security, and irreversible decisions.
- The **Architect** owns INIT, PLAN, design coherence, milestone boundaries, and CLOSE. It
  produces an approved design/plan, never product implementation.
- The **Engineer** owns RUN THE LOOP, AUDIT, HANDOFF, MAINTAIN, COMPACT, REINDEX, EXPORT,
  task briefs, evidence integration, and control state. It never changes design silently.
- The **Worker** executes one bounded brief, changes only its product scope, runs gates, and
  returns status plus an audit capsule. It never expands scope or approves itself.

Flow: `Human request -> Architect design -> Human approval -> Engineer brief -> Worker
delivery -> Engineer audit`. APTO advances; NO APTO returns to Worker; design drift or three
failed correction cycles return to Architect; missing authority returns to Human. Under Lean,
one model may wear multiple roles, but every role transition and evidence source stays explicit.

The Worker owns the **product plane**: code, tests, assets, and task product docs. The
Architect/Engineer own the **control plane**. Product tasks use focused `[T-NN]` commits;
control-only changes use `[STATE]`. Never mix planes or stage unrelated work.

Persist repository-relative paths. Local Git provides durable checkpoints; a remote is
optional. Record sibling systems and owners, but access only siblings explicitly in scope.

### Assurance

- **deterministic gate only**: named commands ran after the final change; no model review.
- **fresh-context self-audit**: the same model may review from a new context and audit capsule.
- **independent model audit**: the reviewer has a separate context and model from execution.

Only the last label provides independent evidence. **Lean** is default and recommended:
deterministic gates per commit, then fresh-context self-audit for risk, failure, milestone,
or release. **Standard** uses independent model audit for selected tasks and milestones.
**Strict** uses independent model audit for every task plus justified domain gates.

Use the cheapest profile compatible with actual risk. An **audit capsule** contains task
and criteria, base/head, changed files, diff, gate evidence, risks, and open questions.
Expand beyond it only when evidence or risk requires. Record the exact assurance label.

### Verdicts

- APTO: all required criteria and checks pass on fresh evidence with no blocking defect.
- NO APTO: a verified defect, failed required check, or unmet criterion requires correction.
- BLOCKED: required evidence, environment, scope, or authority is unavailable.

Never downgrade a required unavailable check to optional. Keep verdict wording and scope
identical in the plan, CURRENT, and audit result.

### Read budget and communication

Read in this order and stop when sufficient:

1. Repository instructions, Git status, and relevant diff.
2. `CURRENT.md` and its active plan/task.
3. Named sections of AGENTS, APPCORE, INDEX, and TESTING.
4. Product files and reference surfaces touched by scope.
5. CONTEXT or archive only when a decision or recovery pointer is material.

Search before opening broad files. Read a complete file when its full contract matters.
Communicate concisely: state action, fresh proof, verdict/blocker, and next action once.
Automatically add clarity for ambiguity, risk, failure, unavailable proof, or decisions.

### Non-negotiables

- Inspect before writing; preserve unrelated, dirty, generated, and user-owned work.
- Evidence must come from commands actually run after the state it proves.
- Never weaken scope, acceptance, gates, or security to manufacture success.
- No secrets, credentials, private data, valued `.env`, or unsafe absolute paths in state.
- Use selective staging when authorized; never commit, push, merge, or delete without scope.
- Keep active state concise, history recoverable, and claims traceable to proof.
- Escalate material product, architecture, security, ownership, or destructive decisions.

Apply conditional checks only when relevant: establish the **trust boundary**, trace a
protocol **round trip**, and verify cross-task **phase coherence**. Store volatile tool
commands as dated project-local recipes, not universal rules.
