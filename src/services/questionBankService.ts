import { ref, get, set } from 'firebase/database';
import { db } from '../firebase/firebase';
import { isFirebaseConfigured } from '../firebase/config';
import { QUESTIONS } from '../data/questions';
import type { Question, CodeLanguage } from '../types/game';

const LOCAL_STORAGE_KEY = 'aou_question_bank';

// Helper for bounded asynchronous operations
function withTimeout<T>(promise: Promise<T>, ms = 5000, errorMsg = 'Operation timed out'): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Normalizes a question object so that every required and optional field is defined.
 * - text, options, id, and timeLimit are strictly validated/defaulted.
 * - Optional text fields (explanation, category) are normalized to strings (defaulting to "" or "General ICPC").
 * - Supports 'text' vs 'code' question types.
 * - For text questions, type is 'text' and code fields are omitted.
 * - For code questions, code and codeLanguage are properly normalized.
 * - NO undefined or null values are ever returned.
 */
export function normalizeQuestion(q: Partial<Question>, defaultIndex = 0): Question {
  const options = Array.isArray(q.options) && q.options.length === 4
    ? [
        String(q.options[0] ?? '').trim(),
        String(q.options[1] ?? '').trim(),
        String(q.options[2] ?? '').trim(),
        String(q.options[3] ?? '').trim(),
      ] as [string, string, string, string]
    : ['', '', '', ''] as [string, string, string, string];

  const parsedTime = Number(q.timeLimit);
  const timeLimit = !isNaN(parsedTime) && parsedTime >= 5 && parsedTime <= 300 ? Math.round(parsedTime) : 20;

  const correctIndex =
    typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3
      ? q.correctIndex
      : 0;

  const isCode = q.type === 'code';

  const normalized: Question = {
    id: q.id ? String(q.id) : `q_${Date.now()}_${defaultIndex}`,
    type: isCode ? 'code' : 'text',
    text: String(q.text ?? '').trim(),
    options,
    correctIndex,
    timeLimit,
    category: String(q.category ?? 'General ICPC').trim() || 'General ICPC',
    explanation: String(q.explanation ?? '').trim(),
  };

  if (isCode) {
    const validLanguages: CodeLanguage[] = ['cpp', 'c', 'python', 'java'];
    const lang = validLanguages.includes(q.codeLanguage as CodeLanguage)
      ? (q.codeLanguage as CodeLanguage)
      : 'cpp';
    normalized.code = String(q.code ?? '').replace(/\r\n/g, '\n');
    normalized.codeLanguage = lang;
  }

  return normalized;
}

/**
 * Deep recursive sanitizer ensuring no undefined values exist anywhere
 * in the payload sent to Firebase Realtime Database.
 */
export function sanitizeForFirebase<T>(value: T): T {
  if (value === undefined) {
    return undefined as unknown as T;
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirebase(item)) as unknown as T;
  }
  const cleanObj: Record<string, any> = {};
  for (const [key, val] of Object.entries(value as Record<string, any>)) {
    if (val !== undefined) {
      cleanObj[key] = sanitizeForFirebase(val);
    }
  }
  return cleanObj as T;
}

export function validateQuestion(q: Partial<Question>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const isCode = q.type === 'code';

  if (!q.text || q.text.trim().length === 0) {
    errors.push(isCode ? 'Question description/instruction cannot be empty.' : 'Question text cannot be empty.');
  }

  if (isCode) {
    if (!q.code || q.code.trim().length === 0) {
      errors.push('Code snippet cannot be empty for a Code Question.');
    }
  }

  if (!q.options || q.options.length !== 4) {
    errors.push('Question must have exactly four options.');
  } else {
    for (let i = 0; i < 4; i++) {
      if (!q.options[i] || q.options[i].trim().length === 0) {
        errors.push(`Option ${String.fromCharCode(65 + i)} cannot be empty.`);
      }
    }
  }

  if (q.correctIndex === undefined || q.correctIndex < 0 || q.correctIndex > 3) {
    errors.push('Exactly one correct answer must be selected (A, B, C, or D).');
  }

  const timeLimit = Number(q.timeLimit);
  if (isNaN(timeLimit) || timeLimit < 5 || timeLimit > 300) {
    errors.push('Time limit must be a positive number between 5 and 300 seconds.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export async function getQuestionBank(): Promise<Question[]> {
  if (isFirebaseConfigured) {
    try {
      const snap = await withTimeout(get(ref(db, 'questionBank')), 5000);
      if (snap.exists()) {
        const val = snap.val();
        if (Array.isArray(val) && val.length > 0) {
          return val.map((q, idx) => normalizeQuestion(q, idx));
        } else if (val && typeof val === 'object') {
          const arr = Object.values(val) as Partial<Question>[];
          if (arr.length > 0) {
            return arr.map((q, idx) => normalizeQuestion(q, idx));
          }
        }
      }
      // If empty in Firebase, seed with default questions normalized
      const normalizedDefaults = QUESTIONS.map((q, idx) => normalizeQuestion(q, idx));
      const sanitizedDefaults = sanitizeForFirebase(normalizedDefaults);
      await withTimeout(
        set(ref(db, 'questionBank'), sanitizedDefaults),
        5000,
        'Failed to seed default questions in Firebase'
      );
      return normalizedDefaults;
    } catch (err) {
      console.warn('Failed to load question bank from Firebase:', err);
    }
  }

  // Dev sync server mode
  try {
    const res = await fetch('/api/quiz/questions');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        const normalized = data.questions.map((q: any, idx: number) => normalizeQuestion(q, idx));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
      }
    }
  } catch (err) {
    console.warn('Dev sync questions fetch error:', err);
  }

  // Local storage fallback
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((q: any, idx: number) => normalizeQuestion(q, idx));
      }
    }
  } catch {}

  // Default seed
  return QUESTIONS.map((q, idx) => normalizeQuestion(q, idx));
}

export async function saveQuestionBank(questions: Question[]): Promise<void> {
  // Validate all questions before saving
  if (!questions || questions.length === 0) {
    throw new Error('Question bank must contain at least one question.');
  }

  // 1. Normalize all questions so every field is strictly defined
  const normalizedList = questions.map((q, idx) => normalizeQuestion(q, idx));

  // 2. Validate all normalized questions
  for (let i = 0; i < normalizedList.length; i++) {
    const result = validateQuestion(normalizedList[i]);
    if (!result.isValid) {
      throw new Error(`Question #${i + 1} validation failed: ${result.errors.join(' ')}`);
    }
  }

  // 3. Deep-sanitize to guarantee zero undefined values anywhere
  const sanitized = sanitizeForFirebase(normalizedList);

  if (isFirebaseConfigured) {
    await withTimeout(
      set(ref(db, 'questionBank'), sanitized),
      6000,
      'Failed to save question bank to Firebase: operation timed out'
    );
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));
    } catch {}
    return;
  }

  // Dev sync server mode
  try {
    await fetch('/api/quiz/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: sanitized }),
    });
  } catch (err) {
    console.warn('Dev sync questions save error:', err);
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));
}

export async function resetQuestionBankToDefault(): Promise<Question[]> {
  const normalized = QUESTIONS.map((q, idx) => normalizeQuestion(q, idx));
  await saveQuestionBank(normalized);
  return normalized;
}
