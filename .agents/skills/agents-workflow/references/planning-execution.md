# Planning And Execution

## PLAN

The Architect runs PLAN and produces approved, executable control state; it does not
implement product work.

1. Inspect current code, tests, Git, APPCORE, CURRENT, active plans, and relevant reference
   surfaces. Ground every claim and gate in current repository evidence.
2. Run a design preflight only when an unresolved choice materially changes scope,
   architecture, external interfaces, trust boundary, destructive behavior, or acceptance.
   Present bounded options, tradeoffs, and a recommendation; make no product write before
   explicit approval. Record canonical content and its SHA-256 approval digest. Bind the
   approval to the owner or authorized delegate, or an exact request reference; also record
   approval timestamp, decision ID, and source plan commit or design SHA-256.
3. If current design matches the recorded digest, do not repeat discovery. If a material
   surface drifts, mark that approval and affected tasks invalidated; require reapproval.
4. Define milestone goal, non-goals, task dependencies, and closure evidence. An optional
   development method may name TDD, exploratory work, or another project-appropriate flow.
5. Hand the approved design to the Engineer. Give every task brief: stable ID, objective,
   non-goals, status, dependencies, allowed
   scope, acceptance criteria, expected evidence, deterministic gates, TESTING IDs, audit
   trigger, risks, STOP conditions, and owner/delegate.
6. Set CURRENT to `active_job: RUN THE LOOP`, the plan/task IDs, and one exact next action.

### Workspace and concurrency

- Inspect status before assigning writable scope. Preserve dirty and unrelated files;
  work in an approved isolated workspace when concurrent edits could overlap.
- Parallelize only tasks with disjoint writable files, generated outputs, schemas,
  migrations, lockfiles, and shared state. Otherwise serialize or repartition first.
- Require local Git checkpoints. Remote services and remote Git are optional unless the
  approved task explicitly depends on them.

### Status and invalidation

Use `ready | in-progress | audit | apto | no-apto | blocked | invalidated`:

- ready -> in-progress: authorized executor dispatch.
- in-progress -> audit: fresh gates, Git status, and audit capsule are recorded.
- audit -> apto | no-apto | blocked: auditor verdict from fresh evidence.
- no-apto -> in-progress: correction dispatch under the reopened brief.
- invalidated -> ready: dependencies resolved and brief/gates revalidated.
- Reactivate blocked -> ready: owner resolution of the recorded authority, scope, or evidence blocker.

On delayed NO APTO, invalidate executed transitive dependents, block ready transitive
dependents, and recheck dependency order. Apply the same walk after upstream contract drift.

## RUN THE LOOP

The Engineer orchestrates one bounded transition at a time:

```text
ready brief -> execute -> focused commit/STOP -> deterministic gates -> risk-scaled audit
-> pass advances | correction reopens | missing authority/evidence blocks
```

1. Select only a ready task whose dependencies and approval digest are current.
2. Give one Worker the compact brief and current workspace boundary. Do not reopen an
   approved design unless material drift or newly discovered ambiguity requires it.
3. The Worker changes only task scope, runs named focused gates, records evidence, and
   returns `DONE | DONE_WITH_CONCERNS | STOP: NEEDS_CONTEXT | BLOCKED | SCOPE_CHANGE |
   SAFETY` plus an audit capsule. One product task maps to one focused `[T-NN]` commit when
   commits are authorized. Concerns always enter audit; scope/design drift returns to Architect.
4. Run deterministic gates for every product commit. Under Lean, use fresh-context
   self-audit for risk, gate failure, milestone, or release; Standard and Strict use the
   independent model audit required by their profile.
5. Apply the resulting verdict to the task and all dependents. APTO advances; NO APTO
   returns a correction brief to the Worker; BLOCKED missing authority returns to Human.
6. Stop for milestone completion, owner request, no ready task, missing scope/authority,
   safety boundary, or three failed correction cycles for the same root cause. Debugging
   hypotheses and experiments do not increment the correction counter.
7. Keep output concise: changed scope, fresh gate result, status/verdict, and next action.
