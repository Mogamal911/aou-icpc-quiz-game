import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import type { GameSession } from '../src/types/game';

/** One atomic snapshot per contest; browser storage is never the archive authority. */
export class ContestArchive {
  constructor(private directory: string) {}

  private filename(id: string) {
    return join(this.directory, `${createHash('sha256').update(id).digest('hex')}.json`);
  }

  get(id: string): GameSession | null {
    let raw: string;
    try { raw = readFileSync(this.filename(id), 'utf8'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
    const session = JSON.parse(raw) as GameSession;
    if (session.id !== id || session.phase !== 'finished' || !Number.isFinite(session.endedAt)
      || !Array.isArray(session.questions)) throw new Error('Invalid saved contest.');
    return session;
  }

  list(): GameSession[] {
    let names: string[];
    try { names = readdirSync(this.directory); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
    return names.filter((name) => name.endsWith('.json')).map((name) => {
      const session = JSON.parse(readFileSync(join(this.directory, name), 'utf8')) as GameSession;
      const saved = this.get(session.id);
      if (!saved) throw new Error('Invalid saved contest.');
      return saved;
    });
  }

  save(session: GameSession): void {
    if (session.phase !== 'finished' || !Number.isFinite(session.endedAt)) throw new Error('Only completed contests can be saved.');
    mkdirSync(this.directory, { recursive: true });
    const destination = this.filename(session.id);
    const temporary = `${destination}.${randomUUID()}.tmp`;
    try {
      writeFileSync(temporary, JSON.stringify(session), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      renameSync(temporary, destination);
    } finally { rmSync(temporary, { force: true }); }
  }
}
