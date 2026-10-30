# AOU ICPC Quiz Game — Orientation Day

A real-time multiplayer quiz game built with React, TypeScript, Vite, Tailwind CSS, and Firebase.

## Quick Start

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) → Create project (or use existing)
2. Enable **Realtime Database** (choose region close to Kuwait/Bahrain)
3. Enable **Authentication** → Email/Password sign-in method
4. Create an admin user: Authentication → Users → Add user
   - Email: `admin@aouicpc.com` (or update `ADMIN_EMAIL` in `src/firebase/config.ts`)
   - Password: choose a secure password
5. Copy your Firebase config from: Project Settings → General → Your apps → SDK setup

### 2. Configure the App

Edit `src/firebase/config.ts`:

```typescript
export const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};

export const ADMIN_EMAIL = "admin@aouicpc.com";
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open:
- **Player (phone):** http://localhost:5173/join
- **Admin:** http://localhost:5173/admin
- **Projector:** http://localhost:5173/present?session=SESSION_ID

### 4. Deploy Firebase Security Rules

```bash
npm install -g firebase-tools
firebase login
firebase init  # select Hosting + Realtime Database
firebase deploy --only database  # deploy security rules
```

### 5. Build & Deploy

```bash
npm run build
firebase deploy --only hosting
```

---

## Customizing Questions

Open `/admin/questions` to add, edit, preview, duplicate and reorder questions. **Save question** writes directly to the bank; no separate bank save is needed. Existing contests keep their own question snapshot.

In `/admin`, select and order questions, review their previews, and choose saved question times or one time for all questions. **Create lobby** opens joining; **Start quiz** begins the first round. Live timer adjustments apply to the upcoming question only. Setup choices are kept in the current browser tab while you visit the question bank.

The default seed in `src/data/questions.ts` contains 36 questions: 12 Beginner, 12 Intermediate and 12 Advanced. Each has an explanation and a suggested timer. Filter by level in the bank or contest setup; the setup summary shows the selected mix. Older saved questions without a level appear as Unrated. **Add starter questions** adds missing starter IDs to an existing bank. See the [question-bank guide and answer index](docs/question-bank.md). The local Vite server keeps the shared bank in memory; saved edits survive page navigation/refresh, but server restart resets that demo bank. Firebase is the configured persistent backend.

For the investigated design and validation record, see [the admin experience plan](docs/plans/admin-experience.md). `npm test` exercises actual services, local middleware and durable history across separate server processes. `npm run test:admin` and `npm run test:history` run each suite separately; Firebase SDK boundaries are stubbed, with no live Firebase access.

Each question:
```typescript
{
  id: 'q1',             // unique, don't change once game is live
  text: 'Question text',
  options: ['A', 'B', 'C', 'D'],   // exactly 4
  correctIndex: 0,       // 0–3
  timeLimit: 20,         // seconds
  category: 'About Us',  // optional label
}
```

---

## URL Routes

| URL | Purpose |
|-----|---------|
| `/join` | Player join + game interface |
| `/join?code=ABCDE1` | Auto-fill game code |
| `/admin` | Admin dashboard (requires Firebase Auth) |
| `/present?session=SESSION_ID` | Projector/presentation screen |

## Scoring

- **Base points:** 1000 per correct answer
- **Speed bonus:** 0–500 pts (proportional to how quickly you answered)
- **Incorrect/timeout:** 0 pts
- **Speed formula:** `round(500 × max(0, 1 − elapsed / questionDuration))`, using server receipt time and the locked question duration. For a 20-second question, a correct answer received at 10 seconds earns 1,250 points.
- **Network allowance:** automatic reveal waits 1.5 seconds after the displayed timer. Answers received in that allowance can earn the 1,000 correctness points, with no speed bonus. Phones stop accepting new submissions at zero; a manual host reveal closes early.
- **One answer, one award:** the first accepted choice is final. Retries cannot replace it; repeated or stale reveals cannot award it again. Invalid, pre-start and late answers earn zero.
- **Ties:** equal totals share competition ranks, for example 1, 1, 3. Nicknames only determine display order within a tie.

Players select an option, then press **Submit answer** to lock it in. Choosing an option alone sends nothing. The screen shows Submitting until the service confirms the answer; then it shows the searchable, paginated leaderboard and personal rank. The current round is added at reveal, with the exact correctness/speed breakdown. Reopening the contest in the same browser resumes the player. Run `npm test` for real-service/backend scoring and admin regressions. See [player/scoring validation](docs/plans/player-scoring.md) and [live-contest validation](docs/plans/live-contest.md).

The host can search and page through players, rename them, or remove them during any phase. Names are unique per contest, ignoring case and normalized whitespace. Renaming preserves points; removal deletes that player’s score and answers and shows a removal notice on their device. The projector uses the same design, a full-width leaderboard below the question, and a Full screen control. It adjusts the number of leaderboard rows to the available screen height.

**Before a real contest:** resolve the existing authentication, public database-write and answer-key exposure findings in the [code review](docs/reviews/code-review-2026-10-31.md). The scoring tests do not validate deployed Firebase permissions.

## Event Day Checklist

- [ ] Firebase project configured with real keys
- [ ] Admin account created in Firebase Auth
- [ ] Security rules deployed (`firebase deploy --only database`)
- [ ] Question selection, knowledge levels and timers reviewed for the audience
- [ ] App deployed to Firebase Hosting (`firebase deploy`)
- [ ] Test with 2-3 phones before the event
- [ ] Admin device: `/admin` tab
- [ ] Projector device: open presentation link from Admin dashboard
- [ ] Players: scan QR code or go to app URL + enter code



## Saved contest history

Finishing a contest automatically saves its question snapshot, players, answers, scores and completion time. **History** in the host navigation opens `/admin/history`: search by code or date, page through contests, reopen searchable final standings, review questions, show results on the projector, or **Download contest** as JSON with the full session and ranked leaderboard. Browsing history does not switch the active contest.

Completed contests are read-only in the app. Rename and remove players while the contest is running; final results stay fixed. A repeated finish request preserves the original scores and completion time. If saving fails, the host sees an error and can retry.

- **Local Vite mode:** completed snapshots are stored in `.quiz-data/contests/` inside the local repository, excluded from Git. Keep this directory to retain history across server restarts. `AOU_QUIZ_DATA_DIR` can select another local archive directory. Live, unfinished sessions and the editable demo question bank still use memory. This feature saves contests finished after the update; it cannot recover sessions already lost on earlier restarts.
- **Firebase mode:** the finished session remains in Realtime Database and History queries those persisted sessions. The rules file now includes a `phase` index for that query. No Firebase deployment was performed; the previously documented authentication, write-permission and answer-exposure findings still apply.

See [history implementation and verification](docs/plans/contest-history.md).


## Arena navigation and invitations

Click **Expand QR code** in either lobby to show a larger scannable code. **Copy code** copies only the six-character code; **Copy join link** copies the full invite URL. Local development links use the actual local HTTP address.

Players can **Exit contest** at any stage and **Return to contest** from the join screen with their saved identity, submitted answers and score. The contest keeps running while they are away. Refreshing after Exit stays on the join screen; returning does not create a duplicate player. Unsubmitted choices are not saved. Joining a different contest replaces the currently saved return identity.

Success feedback clears automatically after a few seconds. Connection, save and submission failures remain visible for recovery. See [the UI/layout pass](docs/plans/ui-polish.md) for verification coverage.
