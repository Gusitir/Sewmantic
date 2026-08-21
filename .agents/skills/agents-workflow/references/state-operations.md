# State Operations

These jobs change only the control plane unless the user separately authorizes product
work. The Architect owns INIT; the Engineer owns MAINTAIN, HANDOFF, COMPACT, and REINDEX.
Start from Git status and preserve unrelated changes.

## INIT

1. Confirm repository root; inspect instructions, tree, Git, product entrypoints, tests,
   and any partial `.agents/` before writing. Existing usable state routes to MAINTAIN.
2. Ask only unresolved choices that change operation: goal, first milestone, owner and
   delegate, assurance, required gates, human validation, sibling scope, and backup.
3. Create only AGENTS.md, APPCORE.md, CURRENT.md, CONTEXT.md, INDEX.md, and TESTING.md.
   Keep optional, history, and testing sections empty; create the PLAN file only during PLAN.
4. Fill verified facts. Use unknown only for required fields in a genuinely needed file;
   never invent tasks, checks, decisions, history, or repository paths.
5. Record repository-relative paths, local Git status, and that a remote is optional.
   Set CURRENT to `active_job: PLAN` and one exact planning action without running PLAN.
6. Validate files and links. Commit `[STATE] init ...` only when authorized.

## MAINTAIN

1. Inventory `.agents/`, Git facts, links, duplicate claims, absolute paths, unsafe data,
   and affected product facts.
2. Classify each defect as missing, stale, contradictory, duplicate, misplaced, unsafe,
   or broken reference; verify reality before selecting a correction.
3. Repair the owning control file only. Preserve product files and historical meaning.
4. `CONTEXT.md` remains append-only: append a correction for a false entry, never alter it.
   Only COMPACT may summarize valid history; MAINTAIN never rewrites valid history.
5. Recheck state coherence and local links; record the changed claims and evidence.

## HANDOFF

HANDOFF transfers active work; it does not close a task or milestone.

1. Refresh CURRENT with source commit and dirty state, active job/plan/task, latest
   verdict, blocker and owner, completed checks with evidence pointers, and exact next
   action.
2. Verify every current claim against Git and the repository. State unavailable proof;
   never infer completion from chat history.
3. Append only material milestone decisions and a compact handoff to CONTEXT. Do not add
   a session diary, repeated task status, or raw command output.
4. Keep the active plan open and indexed. Report off-repository state such as an unpushed
   commit or external artifact because the next session cannot discover it locally.

## COMPACT

1. Measure repeated context cost and identify the owning file for each retained fact.
2. Preserve active requirements, rationale-bearing decisions, unresolved risks, IDs,
   evidence/recovery pointers, and the latest complete handoff.
3. Remove duplicates; archive obsolete detail with a dated pointer. Git remains history.
4. COMPACT may summarize CONTEXT while preserving milestone meaning, dates, and a recovery
   pointer, and must mark the compaction boundary.
5. Rebuild INDEX, check links, and report actual reduction without inflated claims.

## REINDEX

1. Enumerate tracked repository paths, active control files, plans, archives, entrypoints,
   interfaces, commands, and documentation/reference surfaces.
2. Verify every APPCORE path and contract against code; remove dead entries and add only
   observed stable facts. Never recreate product code to satisfy a stale map.
3. Rebuild INDEX from the resulting tree: active plan, control files, key product paths,
   archives, and verified commands.
4. Search for stale names, missing targets, duplicate responsibility, and references to
   removed paths. REINDEX must update both APPCORE and INDEX when either is affected.
5. Record reindex date and source commit. Do not change product scope or files.
