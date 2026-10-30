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

Edit `src/data/questions.ts`. Items marked `[PLACEHOLDER]` need updating with real AOU ICPC facts.

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
- Tie-break: alphabetical nickname (consistent and fair)

## Event Day Checklist

- [ ] Firebase project configured with real keys
- [ ] Admin account created in Firebase Auth
- [ ] Security rules deployed (`firebase deploy --only database`)
- [ ] Questions updated (remove `[PLACEHOLDER]` items)
- [ ] App deployed to Firebase Hosting (`firebase deploy`)
- [ ] Test with 2-3 phones before the event
- [ ] Admin device: `/admin` tab
- [ ] Projector device: open presentation link from Admin dashboard
- [ ] Players: scan QR code or go to app URL + enter code

