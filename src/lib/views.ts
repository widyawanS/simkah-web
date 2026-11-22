import fs from 'node:fs';
import path from 'node:path';

const DATA_FILE = path.join(process.cwd(), '.data', 'views.json');

type Counts = Record<string, number>;

function readCounts(): Counts {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return parsed && typeof parsed === 'object' ? (parsed as Counts) : {};
  } catch {
    return {};
  }
}

export function getViewCounts(): Counts {
  return readCounts();
}

let queue: Promise<unknown> = Promise.resolve();

export function incrementView(slug: string): Promise<number> {
  const run = queue.then(() => {
    const counts = readCounts();
    const next = (counts[slug] || 0) + 1;
    counts[slug] = next;
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(counts, null, 2));
    return next;
  });
  queue = run.then(() => undefined, () => undefined);
  return run;
}
