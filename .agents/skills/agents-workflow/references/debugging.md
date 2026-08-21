# Debugging

## Debugging discipline

Use this overlay after any failed gate, unexpected behavior, or disputed root cause:

1. **Reproduce:** run the smallest reliable reproduction and capture actual versus expected
   behavior. If reproduction is unavailable, state the blocker instead of guessing.
2. **Hypothesis:** state one falsifiable cause tied to observed evidence.
3. **Experiment:** change or inspect one discriminating variable; record the outcome.
4. **Root cause:** explain the causal chain in code/configuration and why it produces the
   symptom. Do not create a correction task for an unconfirmed cause.
5. **Fix:** add or identify a failing regression test first, then apply the smallest focused
   correction that addresses the cause without unrelated cleanup.
6. **Focused gate:** rerun the reproduction and nearest deterministic checks after the final
   change.
7. **Broad gate:** run the project gate and affected reference/state checks. Required
   unavailable proof blocks approval.

Maintain two separate counters:

- Hypotheses/experiments count investigation attempts and may be numerous.
- Correction cycles increment only when a delivered correction is freshly audited and
  rejected again for the same root cause.

After three failed correction cycles, stop automatic execution and escalate with the
reproduction, experiments, confirmed/remaining cause, changed scope, and owner decision
needed. Never count a failed hypothesis as a delivered correction or patch symptoms merely
to reset the counter.
