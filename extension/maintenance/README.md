# Packaged extension maintenance

The reproducible source is now in `web-app/extension`. Run TypeScript, tests, and builds from `web-app` as described in the root README.

`source-changes.patch` is retained as historical evidence of the Facebook fixes restored from v0.3.1. `build.mjs` and `verify.mjs` are historical scripts that referenced an external staging tree. Do not use them for current builds.

`regression.test.mjs` and `production-smoke.mjs` exercise the older packaged runtime assumptions. The active suite is `npm test` in `web-app`, including the restored recipe checks, DOM engine tests, chunked discovery/preview tests, and durable list-job tests.

See `docs/0.4.0-validation.md` for coverage semantics and known limits.
