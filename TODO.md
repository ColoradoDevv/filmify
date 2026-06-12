# TODO

- [ ] Fix build-blocking ESLint error: React Hooks called conditionally in `src/app/(auth)/register/page.tsx`.
  - [ ] Ensure all `useState`/`useEffect` calls are unconditional.
  - [ ] Move the “registration closed” early return UI to be rendered via a variable so hooks remain in the same order.
- [ ] Re-run `npm run build` to confirm compilation succeeds.

