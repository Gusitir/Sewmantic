# Audit And Verification

## AUDIT

The Engineer audits the scoped Worker delivery, not its narrative. Preserve product files;
corrections return to the Worker as a reopened or new brief. Architecture or approval drift
returns to the Architect.

1. Establish task/criteria, approval record, assurance profile and exact assurance label,
   base/head, changed scope, dirty unrelated files, and the audit capsule.
2. Inspect the exact diff and changed files. Expand context only for missing evidence,
   risk crossing the capsule boundary, or affected reference surfaces.
3. Check acceptance, scope, behavior, error paths, tests, security triggers, state, and
   hard-failure conditions. Summaries and prior verdicts are not proof.
4. Run fresh verification after the final change. Record command, environment, exit/result,
   and concise decisive output. A stale pass or failure cannot decide the current verdict.
5. If a required check is unavailable, return the blocked verdict and identify owner and
   unblock action. Put only genuinely human or unavailable checks in TESTING; deterministic
   checks stay with gates and task evidence.

### Lean and milestone assurance

Every product commit gets deterministic gates. A low-risk Lean task may receive
`APTO (deterministic gate only)`. Risk, failed gates, Lean milestones, and Lean releases use
`fresh-context self-audit`. Standard milestones and Strict tasks use `independent model audit`;
confirm its reviewer has a separate context and model. Never infer independence from a new
prompt in the execution context. Milestone audits verify phase coherence from fresh proof.

### Severity and disposition

Classify findings by impact, not prose volume:

- Blocker: security/safety breach, data loss, release corruption, or required proof absent.
- Major: unmet acceptance, behavioral regression, broken interface, or material stale docs.
- Minor: non-blocking maintainability or clarity defect with a concrete correction.

Give every review item exactly one disposition:
`ACCEPTED | CLARIFY | DISPUTED | DEFERRED`. Cite repository evidence. Reviewer authority
does not override scope, facts, or security; disputed items need a reason and safe alternative.

### Reference surfaces

For changed names, paths, behavior, interfaces, configuration, or packaging, sweep each
affected reference surface: source, tests, generated files, examples, public and internal
docs, install/upgrade/uninstall instructions, assets, user-facing text, and release metadata.
Verify documentation promises against behavior. A stale public claim blocks affected
closure or release; do not restore dead code merely to satisfy stale text.

### Releases

1. Build the candidate from a clean checkout or fresh clone at the audited source commit.
2. Inspect the actual distributable, not only source or build logs. Compare packaged files
   and required metadata with the clean source tree.
3. Compute SHA-256 independently and compare it with the release manifest/checksum. Any
   mismatch is a release defect; auditing must not edit the artifact or manifest.
4. Run required install/startup/smoke checks in available target environments. Required
   unavailable environments block; optional coverage is reported as residual risk.

### Audit result

Return: scope and exact assurance label; fresh commands/results; findings by severity;
reference/release checks when relevant; human/unavailable items; verdict; and exact next
action. Do not pad the result by repeating the plan or unchanged evidence.
