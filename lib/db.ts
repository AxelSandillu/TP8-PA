import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import {
  emptyLog,
  isValidVisitorId,
  type ExperimentLog,
  type Variant,
} from '@/lib/experiment'

const DEFAULT_DB_PATH = join(process.cwd(), '.data', 'experiment.db')

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('impression', 'conversion')),
    variant TEXT NOT NULL CHECK (variant IN ('a', 'b')),
    visitor TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS events_one_conversion_per_visitor
    ON events (visitor) WHERE type = 'conversion';
  CREATE INDEX IF NOT EXISTS events_type_variant
    ON events (type, variant);
`

type DbGlobal = typeof globalThis & { __labExperimentDb?: DatabaseSync }

function openDatabase(): DatabaseSync {
  const file = process.env.EXPERIMENT_DB_PATH ?? DEFAULT_DB_PATH
  mkdirSync(dirname(file), { recursive: true })

  const db = new DatabaseSync(file)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA busy_timeout = 5000;')
  db.exec(SCHEMA)
  return db
}

function getDatabase(): DatabaseSync {
  const globalForDb = globalThis as DbGlobal
  if (!globalForDb.__labExperimentDb) {
    globalForDb.__labExperimentDb = openDatabase()
  }
  return globalForDb.__labExperimentDb
}

export function recordImpression(visitor: string, variant: Variant): void {
  if (!isValidVisitorId(visitor)) return
  getDatabase()
    .prepare(
      'INSERT INTO events (type, variant, visitor, created_at) VALUES (?, ?, ?, ?)',
    )
    .run('impression', variant, visitor, Date.now())
}

export function recordConversion(
  visitor: string,
  variant: Variant,
): 'recorded' | 'duplicate' {
  if (!isValidVisitorId(visitor)) return 'duplicate'
  const result = getDatabase()
    .prepare(
      'INSERT OR IGNORE INTO events (type, variant, visitor, created_at) VALUES (?, ?, ?, ?)',
    )
    .run('conversion', variant, visitor, Date.now())
  return Number(result.changes) > 0 ? 'recorded' : 'duplicate'
}

export function readLog(): ExperimentLog {
  const rows = getDatabase()
    .prepare(
      `SELECT variant, type, COUNT(*) AS total
       FROM events
       GROUP BY variant, type`,
    )
    .all() as Array<{ variant: string; type: string; total: number | bigint }>

  const log = emptyLog()
  for (const row of rows) {
    if (row.variant !== 'a' && row.variant !== 'b') continue
    if (row.type !== 'impression' && row.type !== 'conversion') continue
    const total = Number(row.total)
    if (!Number.isInteger(total) || total < 0) continue
    if (row.type === 'impression') log[row.variant].impressions = total
    if (row.type === 'conversion') log[row.variant].conversions = total
  }
  return log
}
