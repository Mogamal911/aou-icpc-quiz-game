# Admin experience: questions → contest → lobby

## Purpose and authority
The organiser must be able to save a question, choose the questions for a contest, check the timing, and start once players have joined. The user requested a UI/UX review, footer removal, improved icons/fonts, an easier admin journey, and an investigated implementation plan. On 31 October 2026 the user explicitly chose **Implement the admin redesign too**.

This work is local in `/Users/abdelmawla/Developer/Codex/aou-icpc-quiz-game`, starting at `b7571d0`. Preserve the existing `authService.ts` local-login callback fix. No publishing, deployment, or Git push is part of this change.

## Evidence and investigation
The live local build and source were reviewed, then a second agent independently reproduced these five problems on an isolated local server (5174):

1. Adding a question only updates page memory. “Add to Bank” closes the form, but following “Arena Console” discards it without warning. The bank returned from 21 to 20 questions. Cause: `QuestionManagementPage.tsx` separates the modal action from `saveQuestionBank`; `beforeunload` does not cover React Router navigation.
2. Tab from the new-question dialog reached the background Reset button. Correct-answer selection is a clickable div; clicking into an answer's text also selects it as correct. Cause: no native dialog or radio control in `QuestionFormModal.tsx`.
3. Create Game Session immediately snapshots the entire bank. Neither the preparation page nor the lobby exposes the included questions before starting. `createGameSession` currently fetches its own bank.
4. At 1280×720, Start is below the fold while an empty leaderboard takes the upper-right third. `AdminDashboard.tsx` renders rankings in every phase.
5. Repeated footers, emoji icons, uppercase display typography, and “trial / imperial / arena” terminology slow administrative scanning. The navy/gold palette and AOU logo are deliberate identity, not defects.

Strongest alternatives considered: batch saving can be useful but requires safe navigation and accurate copy; direct durable saves are simpler here. Immediate session creation suits a fixed quiz but hides its actual contents; a single preparation screen retains speed. A stable leaderboard position helps while playing, but adds no information in a lobby.

The only product documentation found is README.md. There are no repo design decisions, linked design tickets, or configured project tracker. This is a personal AOU repository, so unrelated company Linear tickets are not treated as requirements. README calls for questions, timers, QR joining, projector and event rehearsal; it identifies three placeholder questions. The UX skill decisions prohibit accordions and unusable metadata; this implementation adds neither. Every finding/fix above was checked against those two decisions and README; none is settled by a contrary decision. Footer removal is explicitly user-directed.

Reference comparison: [Kahoot's question authoring guide](https://support.kahoot.com/hc/en-us/articles/115002884788-How-to-make-a-kahoot) keeps question content, answers and the correct choice in the authoring flow, with hosting separate. We adopt that separation, without importing its additional modes. [Native dialog behavior](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) supplies modal focus containment, inert background and Escape behavior.

## Solution shape and decisions
- Keep React, Tailwind, existing services and the session question snapshot. No new UI library, state manager, draft database, authentication scheme, or contest-template model.
- Use one small SVG icon component, readable sans typography, sentence case controls, and the existing navy/gold identity. Remove decorative page footers; preserve functional form action bars.
- Save each question, duplicate, reorder and deletion through the existing bank service. Update the displayed saved bank only after success. Preserve the editor on failure. Warn before discarding an edited modal; native dialog prevents background navigation.
- Prepare a contest on one screen: select questions, reorder them, preview them, and use their saved times or a single override. Creating a lobby snapshots precisely this reviewed list, without changing the bank.
- Lobby prioritises join code, QR, players, included-question review and Start. Rankings appear when the game is running or finished. The question set is fixed once the lobby exists; reviewing it is read-only.
- Preserve per-question times through progression. An explicit live adjustment applies to the upcoming question only. The following question returns to its saved time.
- Changes to service acknowledgement and timing are necessary for the UI's new saved-state and selected-question guarantees. Independent review findings about scoring/authentication remain separately tracked; this redesign must not claim event readiness.

## Plan of work and progress
- [x] Inspect live admin journey, source, README and existing runtime.
- [x] Independently confirm five findings; check recorded decisions and comparable authoring flow.
- [x] Replace admin shell, typography/icons; remove page footers.
- [x] Implement durable question editing, labelled native radios and focus-managed dialogs.
- [x] Implement reviewed contest selection/order/timing and pass explicit snapshots to creation.
- [x] Restructure lobby and retain live controls/results.
- [x] Verify service acknowledgement and per-question timing in actual service/backend paths.
- [x] Run TypeScript/build/lint; exercise laptop/mobile and keyboard flows in browser.
- [x] Record final evidence, limitations and completed results here.

## Acceptance and validation
1. Create/edit a text or code question → Save → navigate away/refresh → content and correct answer persist. Only a successful save closes the form; a rejected write leaves it editable with an error.
2. Tab stays in the dialog, correct answer works with native radio keys, typing an answer does not change correctness, Escape on a dirty form asks before discarding, close restores focus.
3. Search, duplicate, reorder and delete persist. Deleting the final question is prevented by the existing nonempty-bank contract. Placeholder facts remain visibly identified.
4. Select a subset and change its order in preparation. Preview shows the intended content. Creation sends only that ordered snapshot; the bank is unchanged. No questions selected disables creation. A failed creation remains on setup.
5. A contest with two distinct question times uses each saved duration; a uniform override applies to all selected questions; live override affects the next question only. Existing sessions retain their snapshots.
6. At 1280×720 the lobby Start action and player count are visible without scrolling; no empty rankings. At 390px there is no horizontal overflow and primary actions remain reachable.
7. Existing player and projector routes still render; a short local two-question contest can finish.
8. `npm run build`, `npm run lint`, focused real-service/backend checks, and browser verification pass. Existing copied-logic test scripts alone are insufficient evidence.

## Known risks and boundaries
The completed Claude Opus 5.5 max code review covers the frozen baseline in `/Users/abdelmawla/Developer/Codex/aou-quiz-review-20261030-opus55-max`. Independent probes already reproduce non-idempotent scoring, answer acceptance for future questions, and unsafe Firebase authentication/rules. These are pre-existing and not prerequisites to local UI review, but real-event use requires remediation and a separate rehearsal. Live Firebase access and deployed rules have not been checked. Native dialog support will be checked in available browsers; fonts have a system fallback.

The local server stores its shared bank in memory, so server restart loses that server state; this change guarantees saved navigation/refresh behavior while the server is running, not durable server hosting. Do not imply local demo is production storage.

## Implementation discoveries
- Session creation and bank save previously treated a local-server rejection as success. They now require an acknowledged write; the editor stays open on failure. Host controls also report server failure instead of advancing only a browser cache.
- The old next-question path reused the first timer across the entire contest. The server and Firebase control path now prepare the following saved time. Firebase controls read the authoritative snapshot so selecting a subset or refreshing the host cannot fall back to the default bank.
- The local server already schedules automatic reveal. The host now leaves this to the server in local mode; Firebase retains the host timer. This removes a redundant local trigger but does not make backend scoring idempotent.
- A missing session now completes with null rather than leaving the redesigned setup waiting indefinitely.
- Contest selections, order and timing survive navigation to the question bank through a small per-tab sessionStorage draft (IDs/settings only). Starting a new contest records preparation intent so a visit to Questions does not reconnect the old contest. No server draft model was added.
- `npm run test:admin` exercises the real app services and actual Vite middleware on a disposable loopback server. It passed saved-bank round-trip, ordered subset/snapshot isolation, times 15/20/25 with a 40s next-only override, uniform timing, rejected writes, null session delivery, and Firebase snapshot control after refresh. Only the Firebase SDK boundary is stubbed; no live Firebase calls.
- Browser rehearsal on 5175 passed selecting/reordering q2/q1, creating the two-question lobby, joining a player, answering, reveal, 15s→20s progression and final results.

## Outcomes and validation — 31 October 2026
The authorised redesign is implemented locally. The main preview remains `http://localhost:5173/admin`. No commit, push or deployment was performed. The original local auth callback fix is preserved.

- Footer branding and lower decorative borders removed across admin, join/player shells and final projector results. Working controls use Inter/system fallback, sentence case and SVG icons; navy/gold branding remains.
- Question bank now has direct durable save, search, preview, duplicate, reorder and delete. The form has native radio inputs, explicit unsaved-change confirmation, keyboard containment, correct initial focus and restoration to its trigger. Tab exits the code editor normally.
- Contest setup supports subsets, order, question previews, individual saved times and a uniform override. Selection/timing survive a trip to the question bank; verified one selected question and 45s retained after navigation. Lobby offers read-only question review, join link/QR, players and Start without empty rankings.
- The independent reviewer confirmed all five original defects. During follow-up it found the mobile action buried below 20 questions. This was fixed with settings first and a persistent selection/action bar at narrow widths. Its follow-up browser could inspect layout/source but could not activate controls, so the parent independently performed the interaction verification in its working IAB. This is a limitation of independent runtime confirmation, not a claimed pass from that reviewer.
- At 390×844, setup Create lobby was at y 788–830 and document scrollWidth 384 (no horizontal overflow). The mobile lobby also showed Start without scrolling after resetting screen position. At 1280×720 the desktop lobby showed the title, invitation, players, question summary and Start together.
- Native keyboard check: ArrowRight changed correct answer B→C; ArrowLeft restored B. Typing into A did not change correctness. Tab from Save wraps to Close; Tab from the code textarea moves to the answer radio. Escape shows explicit Keep editing/Discard changes. Closing restored focus to Add question.
- A new question saved as correct answer B survived navigation away and page reload. Two-question local rehearsal completed with player join/answer, reveal, question timing 15→20, next, final results and projector render.
- Final `npm run build`, `npm run lint`, `npm run test:admin` and `git diff --check` passed. Build retains Vite's nonfatal JavaScript chunk-size warning. Failure tests run at the actual service/backend boundary; failed-write UI behavior is additionally source-verified, not claimed as browser failure injection.

Screenshots are in `/Users/abdelmawla/Developer/Codex/aou-admin-redesign-20261031`: `desktop-setup.jpg`, `desktop-lobby.jpg`, and `mobile-setup.jpg` (mobile action verification before final heading wording cleanup). Test changes were confined to disposable 5174/5175 state; the final 5173 inspection was read-only.

The broader Claude review is complete; heartbeat `aou-opus-code-review` is paused. Opus 5.5 was verified as the served model, with max effort requested (served effort is not separately reported). The [consolidated review](../reviews/code-review-2026-10-31.md) separates outstanding findings from those fixed here. Existing authentication/rules, answer authority and backend scoring risks still prevent claiming real-event readiness. No live Firebase testing was performed.

Final review follow-through: failed Firebase/local bank reads now reject with an error/retry instead of offering stale or default questions; adding and lobby creation are blocked after a failed load. Both failure modes and the Firebase next-timer isolation were included in the final passing service tests.

Subsequent authorised work: player experience and scoring are now complete; see [the player/scoring plan](player-scoring.md). Its transaction/acknowledgement changes preserve the admin acceptance tests. Authentication, public writes and answer-key privacy remain open.
