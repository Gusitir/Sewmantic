# PLAN vX.Y - <milestone name>

```yaml
status: <draft | awaiting_approval | active | audit | closed | blocked>
goal: <one measurable outcome>
assurance: <Lean | Standard | Strict>
approval_digest: <SHA-256 of canonical approved design | not required | pending>
approval_actor: <owner or authorized delegate | none when exact request reference is used>
approval_request_ref: <exact request reference | none when approval actor is recorded>
approved_at: <approval timestamp in ISO-8601 | not required | pending>
approval_decision_id: <stable decision ID | not required | pending>
approval_source: <source plan commit | design SHA-256 | not required | pending>
```

## Scope

- In scope: <bounded behavior and repository-relative surfaces>
- Non-goals: <explicit exclusions>
- Development method (optional): <TDD | exploratory | project method | none>
- Closure evidence: <commands, artifact, reference sweep, and human IDs>

## Tasks

### T-01 - <bounded outcome>

- Status: <ready | in-progress | audit | apto | no-apto | blocked | invalidated>
- Architect: <design/plan role>
- Engineer: <orchestration/audit role>
- Worker: <bounded implementation role>
- Depends on: <task IDs or none>
- Objective: <observable outcome>
- Non-goals: <task exclusions>
- Allowed scope: `<repository-relative paths or patterns>`
- Acceptance: <observable criteria>
- Evidence: <required command/output/artifact>
- Gates: `<focused and broad commands>`
- Human checks: <TESTING IDs or none>
- Audit: <deterministic gate only | fresh-context self-audit | independent model audit>
- Worker result: <DONE | DONE_WITH_CONCERNS | STOP: NEEDS_CONTEXT | BLOCKED | SCOPE_CHANGE | SAFETY>
- Risks: <specific risks or none known>
- STOP conditions: <scope, authority, safety, or unavailable proof>
- Invalidated by: <upstream task/approval/contract IDs or none>

## Closure gate

- [ ] Tasks have current approvals and required verdicts.
- [ ] Required deterministic and human evidence is fresh.
- [ ] Reference surfaces and phase coherence pass.
- [ ] CURRENT, APPCORE, INDEX, TESTING, repository, and Git agree.
