# Closure And Export

## CLOSE

The Architect runs CLOSE as milestone reconciliation, not as a synonym for commit or handoff.

1. Require current approval and passing evidence for every task. Record the milestone
   assurance label: `fresh-context self-audit` for Lean or `independent model audit` for
   Standard/Strict; `deterministic gate only` cannot close a milestone by itself.
2. Compare plan, CURRENT, TESTING, APPCORE, INDEX, repository behavior, Git, and affected
   reference surfaces. Resolve contradictory status, stale versions, dead paths, and known
   issues before closure.
3. Record outcome, residual risk, deferred work, release/checksum state, backup state, and
   off-repository facts. A remote is optional; never invent push or deployment status.
4. Record branch disposition as keep, merge, pull request, or delete. CLOSE must not merge,
   push, delete branches, or clean worktrees. Integration is a separate, explicitly
   authorized post-close action with fresh status and verification.
5. Archive the closed plan, refresh APPCORE and INDEX if surfaces changed, compact CURRENT
   to the next real job/action, rotate TESTING for the next cycle, and append the milestone
   decision to CONTEXT. Use `[STATE] close ...` only when committing is authorized.

## EXPORT DOCUMENTATION

The Engineer generates root `DOCUMENTATION.md` as a **point-in-time snapshot**, never a
silently living document. Read all control state, including active plans, CONTEXT, and
relevant archive; resolve conflicts against current repository and Git facts.

1. Verify drift-prone claims: capabilities, versions, dependencies, setup/build/run/test
   commands, interfaces, important paths, limitations, known risks, and current status.
2. Sanitize secrets, private data, internal-only chatter, unsafe commands, stale absolute
   paths, and placeholder-shaped values. Do not publish an unverified claim as fact.
3. Make the snapshot understandable without `.agents/`. Include purpose/users, capability
   status, architecture, important code and reference surfaces, setup and operations,
   testing, limitations, risks, decisions useful to the audience, and the snapshot warning.
4. Include parseable metadata:

```yaml
generated_at: <ISO-8601 timestamp with timezone>
source_commit: <commit plus dirty state>
workflow_version: <installed version or unknown>
audience: <named audience or technical-collaborator>
```

5. Recheck the exported file against source state and sanitization rules. Record export
   evidence in CURRENT; commit `[STATE] export documentation` only when authorized.
