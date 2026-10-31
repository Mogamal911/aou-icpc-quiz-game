# Completed contest history

Implemented locally on 2026-10-31. Scope: automatically retain completed contests and let the host reopen their results. No commit, push, rule deployment, or production database access.

## Behavior and storage

- `finishContest` scores an active round and fixes the completion time; retrying finish is idempotent.
- Local end/last-next writes a complete snapshot to a temporary file and atomically renames it before exposing finished state or acknowledging success. Write failures leave the prior live session available for retry. One hashed filename per contest avoids using supplied IDs as filesystem paths. Archive files are ignored by Git.
- The local history API returns summaries; a detail request retrieves the original session. Session, code and SSE reads can reopen an archived contest after restart, including existing projector/player links. New live contests cannot overwrite an archived ID.
- Firebase history reads existing finished sessions through a phase query; completion remains part of its session transaction. The phase index is added to the checked-in rules, without altering the previously reviewed permission model or deploying it.
- Host History uses search, pagination, read-only standings, question previews and JSON download with derived ranks. Opening it does not change the host's active contest. Rename, remove, join, start, reveal, next and timer changes cannot mutate finished data through normal app service paths.
- Empty history, missing records, loading failures and retry have explicit UI states. Existing finished sessions in Firebase are discoverable. Old local sessions already lost before this update cannot be recovered. Unfinished local sessions remain memory-only.

## Verification

`npm test` retains the actual service/scoring/player regression suite and adds a real filesystem lifecycle suite (`scripts/test-contest-history.mjs`). The new primary regression owner is the HTTP boundary backed by separate Node server processes and temporary disk storage: in-memory tests alone cannot detect restart loss or false acknowledgement after a write failure. The archive-directory option is a runtime configuration supported by `AOU_QUIZ_DATA_DIR`, also used to isolate fixtures.

Verified: both finish paths persist; correct scores/answers and original question snapshots survive bank changes and new contests; repeated finish retains its timestamp; finished-player mutations and full-session overwrite are rejected; unfinished contests are excluded; a separate server process with no browser cache restores identical history, session, code and SSE state. Real directory obstruction causes a write failure without falsely finishing; restoring storage allows retry. Corrupt JSON produces a load error, not a false empty history. A second restart retains all completed records.

Firebase coverage uses actual service/transaction callbacks and SDK boundary stubs: idempotent finish, completed roster guards, finished-only history, ordering and surfaced read failures. This is not a Firebase emulator or deployed-rules test.

Browser rehearsal used an isolated Vite server on port 5182 and separate data directory, with 12 archived contests and 24 players. Verified finish failure/error/retry, saved confirmation, read-only final standings, tied ranks across pages, player search, contest search/pagination, original question/answer/explanation preview, export content (24 players/ranks, two questions, 3,000-point winner), and responsive layouts at desktop and phone widths. Main preview remains on port 5173; rehearsal data is not in its history.
