# Live contest experience

Accepted scope: match projector to the navy/gold admin/player design; full-width leaderboard below the question; searchable, paginated leaderboard and host roster; personal ranking after submission and reveal; host rename/remove; unique names per contest; explicit answer submission; time-dependent scoring.

Behavior decisions:
- Players select freely until pressing Submit answer. The first server-confirmed submission is final; a failed request can be retried without changing an already accepted answer.
- Score/ranking shown immediately after submission reflects completed rounds. The current round is added only when the host reveals, avoiding early correctness disclosure.
- Preserve existing scoring: 1,000 correct points + a linear speed bonus from 500 to 0. The server receipt time at submission determines the score; wrong/missing answers score zero. Show the available points as an estimate while choosing.
- Names are unique within a contest after Unicode normalization, whitespace normalization and case folding. Enforce against authoritative state on both join and host rename, including concurrent requests.
- Removal deletes the player and their answers from the contest; their device receives a removed state. This is removal, not a permanent ban: they can rejoin with a new player identity. A tombstone contains only the removed player ID.
- Search retains overall ranks; page bounds adjust when participants disappear. Find my rank clears search and navigates to the current player. Host can manage participants during all phases. Leaderboards span the content width below the question.
- Local and Firebase paths share transition logic; Firebase uses transactions. Existing production authentication/rules limitations remain tracked in the existing code review; this task does not deploy.

Validation: actual local service/backend tests plus Firebase transaction boundary tests; browser checks for host/projector/player flows, submission timing, uniqueness, rename/remove synchronization, pagination/search, and mobile/projector layouts.

## Completed verification — 31 October 2026

Implemented locally, uncommitted and not deployed. Preserved all existing service/scoring assertions and added roster-specific cases at the actual HTTP/service boundary. The Firebase stub models SDK retry/null/timestamp behavior; it does not implement the uniqueness or scoring being asserted.

- Production build, lint and whitespace validation pass. The existing nonfatal bundle-size warning remains.
- `npm test` passes: racing duplicate joins (exactly one accepted), case/spacing/Unicode name conflicts, self-renaming, duplicate renames, rename without lost answers/points, retry-safe removal, rejection of removed identities, no resurrection at reveal, and rejected writes. Firebase callbacks re-check join and rename uniqueness after a newer snapshot is supplied on retry.
- Negative control used the actual saved pre-change and current Vite middleware in disposable loopback servers: old code accepted both `Alice` and ` alice ` (200/200, two players); new code rejects the duplicate (200/409, one player). This confirms the uniqueness check reaches the missing old behavior, not an unrelated guard.
- Browser tests reused this chat’s earlier isolated local-only UX server on port 5174 and separate host, player and projector contexts. No live Firebase writes or real participants. A 24-player session verified 10-row host/player pages, next/previous pages, Find my rank jumping to the third page, search, duplicate-name errors, live rename and removal, and page clamping when a last page disappears.
- Selecting and changing answers produced zero answer requests and no saved answer. Submit produced one request with the final chosen index; standings appeared immediately with completed-round scores. Reveal awarded 1,437 points consistently across screens. The displayed available points decreased while choosing. Renaming that player retained 1,437 points; removal removed the row and showed the explicit removed state after refresh.
- A separate code-question session verified a correct submitted answer (1,476 points), live rename from Mona to Maya, persisted renamed identity on refresh, search for Zain retaining overall rank 2, an unsubmitted timed-out round with no stored answer/zero additional points, and final total remaining 1,476.
- Layout checks: 1920×1080 and 1280×720 projectors; 390px and 320px player screens. The board spans the width below the question. A 720p overflow found during review was fixed by fitting complete rows plus navigation to available space, placing code beside answers, and reducing projector-only code-header controls. All question, reveal and final states used in the rehearsal fit the checked projector viewport; phone screens had no horizontal document overflow. Very long custom questions remain scrollable rather than clipped.
- Projector and player show all participants through pagination instead of truncating to the top 5/10/15. Search keeps contest ranks; ties retain competition ranking. Projector has fullscreen and managed wake-lock cleanup.

Existing boundaries: Firebase authentication/public write permissions and early answer-key exposure remain documented in `docs/reviews/code-review-2026-10-31.md`. These local behavioral checks do not prove deployed authorization; no deployment or permissions changes were made. Removal is not a permanent ban. The local demo bank/session state is still in memory.

Cleanup: closed the disposable browser tabs and reset viewport emulation. Stopped the earlier owned UX server on 5174 after verifying its recorded PID (54393). The user’s main preview on 5173 (PID 42716) remains running. No app console errors occurred in the checked tabs; only the existing React Router future-version warnings were present.
