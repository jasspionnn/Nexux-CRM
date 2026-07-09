import { DatabaseSync } from 'node:sqlite';

// A minimal D1Database-compatible shim backed by Node's built-in SQLite, used only
// in tests so route handlers can run against a real (if lighter-weight) database
// instead of every query being mocked by hand.
export function createD1Shim(db: InstanceType<typeof DatabaseSync>) {
  function prepare(sql: string) {
    const stmt = db.prepare(sql);
    let boundArgs: any[] = [];
    return {
      bind(...args: any[]) {
        boundArgs = args;
        return this;
      },
      async run() {
        const result = stmt.run(...boundArgs);
        return {
          success: true,
          results: [],
          meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) },
        };
      },
      async all() {
        const rows = stmt.all(...boundArgs);
        return { success: true, results: rows };
      },
      async first() {
        const row = stmt.get(...boundArgs);
        return row ?? null;
      },
    };
  }

  return {
    prepare,
    async batch(statements: any[]) {
      const results = [];
      for (const s of statements) results.push(await s.run());
      return results;
    },
  };
}

export function createTestDb(): InstanceType<typeof DatabaseSync> {
  return new DatabaseSync(':memory:');
}
