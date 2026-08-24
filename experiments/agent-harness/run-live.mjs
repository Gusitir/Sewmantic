// Cross-platform launcher for the opt-in live Vercel probe. Keeps the live
// invocation out of shell-specific inline-env syntax so it works identically on
// Windows (cmd/PowerShell) and POSIX shells. Requires FIREWORKS_API_KEY in the
// environment (or .env); refusal to run when absent is safe and never fails the
// offline gate. Usage: `npm run experiment:harness:live`.
process.env.HARNESS_LIVE = '1';
await import('./runner.mjs');
