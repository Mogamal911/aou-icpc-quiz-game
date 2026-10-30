import { onValue, ref } from 'firebase/database';
import { db } from '../firebase/firebase';
import { isFirebaseConfigured } from '../firebase/config';

let offset = 0;
let started = false;
/** One clock observation per page; all countdowns and Firebase checks share it. */
export function observeServerClock() {
  if (started) return;
  started = true;
  if (isFirebaseConfigured) {
    onValue(ref(db, '.info/serverTimeOffset'), (snapshot) => {
      const value = snapshot.val();
      if (typeof value === 'number' && Number.isFinite(value)) offset = value;
    });
  } else {
    const sent = Date.now();
    void fetch('/api/quiz/time').then((response) => response.json()).then(({ now }) => {
      if (Number.isFinite(now)) offset = now - (sent + Date.now()) / 2;
    }).catch(() => { started = false; });
  }
}
export function getServerTime() { return Date.now() + offset; }
