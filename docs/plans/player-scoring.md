# Player experience and scoring — 31 October 2026

## Outcome and authority
User requested checking/fixing logical scoring and improving player arena UI/UX, building on the completed admin redesign. Implement locally; preserve previous work. No commit, push, live Firebase change or deployment. Authentication/rules and private answer keys remain a separately documented security follow-up; app-level score corrections do not prove adversarial event readiness.

## Decisions
Preserve 1,000 points for correctness plus 0–500 speed bonus, linear in the fraction of that question's locked duration remaining. Incorrect, missing, invalid, pre-start or late answers score zero. Keep the existing 1.5-second network allowance, make auto-reveal actually wait for it, and award no speed bonus during that allowance. Phones stop accepting new taps at the displayed deadline. Manual host reveal intentionally closes early. Server time defines receipt/scoring; clock offsets improve the display. First accepted answer wins. Repeat/stale actions cannot score or advance twice. Equal totals share competition ranks (1,1,3); alphabetical sorting only stabilises display and never breaks a tie.

Keep the navy/gold identity and Inter typography. Player flow: labelled join form → compact waiting lobby with scoring explanation → question with nearby large answer buttons → visible Sending / Answer saved state → correct/incorrect/no-answer result with exact correctness/speed points → final rank, score and correct-count summary. Avoid repeated status badges, duplicate live standings and theatrical administrative wording. Preserve full readable question/code/answer text, keyboard focus and mobile scrolling.

## Investigation
Parent used the actual disposable local app at 390×844; an independent UX reviewer confirmed the same observations in Chrome: question-to-options gap around 143px, duplicate rank/score and competing submission labels, and join labels missing programmatic association. The gap comes from minimum viewport heights, justify-between and auto margins. Prior code review/runtime probes reproduced duplicate reveal scoring, future-question acceptance and false local success after HTTP rejection. Equal scores previously had arbitrary distinct ranks from nickname sorting.

Recorded UX decisions checked for each change: no accordions; no unusable metadata or multiple list styles. None of the proposed fixes conflicts. README has no requirement for the old labels/spacing. No linked product design tickets exist for this personal repository.

## Work and verification
- [x] Inspect real player states, scoring/services and independent UX confirmation.
- [x] Use one scoring calculation in local/Firebase paths; guard state transitions and accept only first valid current-question answers.
- [x] Make Firebase changes transactional, use receipt timestamps, correct countdown clocks and wait the network allowance before automatic reveal.
- [x] Redesign join, question, submission, reveal and final states with honest acknowledgement and shared ranks.
- [x] Exercise real backend/services: score boundaries, distinct durations, wrong/missing/early/late answers, duplicate/stale requests, rejection and ties. Preserve existing admin coverage.
- [x] Verify keyboard/mobile/desktop and a full contest in browser; build/lint/diff checks. Record limitations and screenshots.

Testing follows test-audit: add behavioral regressions at actual service/backend boundaries; do not rely on copied legacy test algorithms. Firebase SDK-boundary tests are not a substitute for an emulator or live Firebase. Primary SDK references checked: https://firebase.google.com/docs/database/web/read-and-write and https://firebase.google.com/docs/database/web/offline-capabilities (transaction retry/null behavior, server timestamps and clock offset).

## Completed validation

All changes are implemented locally and uncommitted. Main preview: `http://localhost:5173/join`. No push or deployment. The test-only 5175 server and 5176 failure proxy are disposable and are stopped at closeout.

- `npm run build`, `npm run lint`, `npm test`, and `git diff --check` pass. The previous nonfatal Vite chunk-size warning remains. Existing admin bank, snapshot, timing and error regression coverage is preserved in the same actual-service test harness.
- Deterministic score cases: immediate correct 1,500; halfway through 10/20/60-second rounds 1,250; deadline and network allowance 1,000; wrong, pre-start, invalid and late 0. Unanswered players retain zero. Independent expected values are asserted, not calculated by a copied scoring implementation.
- Real HTTP/middleware tests verify first-answer retention, future-question and invalid-choice rejection, late rejection without local false success, repeated reveal, stale reveal/next/start, and ending an active question. Totals equal the sum of awarded answers. An actual 5-second timer still accepts at 5.2 seconds and reveals after the 1.5-second allowance with exactly 1,000 points.
- Firebase service tests execute the production transaction callbacks with an SDK-boundary stub that supplies initial null and retries against newer data. They verify server timestamp usage, first answer, refreshed authoritative scores, next-only timing and stale-action rejection. This is not live Firebase or emulator verification. Public write permissions and answer-key exposure are still unresolved; application transaction guards are not an authorization boundary.
- Equal totals produce ranks 1,1,3. Player, admin and projector all use these ranks; projector podium labels/heights no longer hardcode distinct ranks for tied scores.
- Independent UX confirmation covered all three original findings. Parent then verified the redesigned actual app, including 390px mobile, 320px mobile (314px content with scrollbar), desktop, labelled form fields, Enter-to-join/answer and heading focus on new questions/results. No document-level horizontal overflow; long code scrolls in its keyboard-focusable region. The previous code header clipped Copy at 320px; simplifying it fixed that issue. Revealed choices retain full contrast.
- Browser rehearsal: text question, code question, wrong answer, correct answer, no-answer state, explanations and final results. Mona earned 1,459 for the first correct answer and 0 for the second wrong answer; final total stayed 1,459, with 1/2 correct. The second player earned 1,480 for the code answer; both rankings matched those totals.
- A disposable proxy delayed and rejected the first answer with HTTP 503. The browser showed Sending, then the error and enabled retry, then Answer saved only after acceptance. Refresh and opening a new tab retained Mona's identity/score without adding a player. Test proxy and browser artifacts are not product features.
- Browser confirmation screenshots: `/Users/abdelmawla/Developer/Codex/aou-player-redesign-20261031/question-mobile.jpg`, `code-result-mobile.jpg`, `final-results-mobile.jpg`.

## Remaining boundaries
The requested scoring and player UX work is complete. Before a competitive deployment, the existing admin bypass, public Firebase writes and early answer-key exposure still require the separate security remediation recorded in `docs/reviews/code-review-2026-10-31.md`, followed by emulator/deployed-environment testing. Browser clock offsets improve display alignment but do not eliminate network latency. Local Vite state remains in memory; changes to its server code restart that demo state.
