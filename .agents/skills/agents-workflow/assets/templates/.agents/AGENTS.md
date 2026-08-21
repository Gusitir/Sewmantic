# AGENTS - <project name>

Replace each angle-bracket field with a verified value or the word `unknown`.

## Roles

- Human: <person accountable for material scope and approvals>
- Architect: <agent/model responsible for design, PLAN, and CLOSE>
- Engineer: <agent/model responsible for briefs, orchestration, audit, and control state>
- Worker: <agent/model/tool responsible for one bounded product brief>
- Product plane: code, tests, assets, and task product docs
- Control plane: `.agents/`, verdicts, indexes, and exports

## Assurance

- Profile: <Lean | Standard | Strict>
- Model audit triggers: <risk, failure, milestone, release, or stricter policy>
- Audit capsule owner: Engineer

## Gates

- Focused gate: `<repository command or unknown>`
- Broad gate: `<repository command or unknown>`
- Reference gate: `<repository command/search or unknown>`
- Release gate: `<artifact command or not applicable>`
- Required unavailable checks: <TESTING IDs or none>

## Boundaries

- Repository root: `.`
- Local Git: required
- Backup/remote: <local-only | remote name | external method | unknown>
- Sibling systems and owners: <repository-relative relation or none>
- Writable product scope: <defined by active task>

## Durable rules

- Preserve unrelated work; inspect status and use selective staging.
- Claims require fresh evidence after the state they prove.
- Use repository-relative paths in persistent state.
- Store no credentials, secrets, private data, or valued environment files.
- CONTEXT contains milestone decisions and handoffs, not task diaries.
- Product corrections return to the Worker; control edits belong to Architect/Engineer.
- Design drift returns to Architect; missing authority returns to Human.

## Environment

- OS/shell: <verified value or unknown>
- Runtime/tool versions: <verified value or unknown>
- Build/test quirks: <verified value or none known>
- Generated/ignored paths: <verified paths or none known>
