/* The battle line keeps waiting chores in the order they were marked done.
   Approved chores fight in the order they were approved, even if an older chore is still waiting. */

export function mergeBattleLine({ order = [], stored = [], memory = [], submitted = [], finished = [] } = {}) {
  const done = new Set(finished);
  const submittedIds = new Set(submitted.map((chore) => chore?.id).filter(Boolean));
  const known = new Map();
  const remember = (chore) => {
    if (!chore?.id || done.has(chore.id) || known.has(chore.id)) return;
    known.set(chore.id, chore);
  };
  for (const chore of stored) remember(chore);
  for (const chore of memory) remember(chore);
  for (const chore of submitted) remember(chore);

  const line = [];
  const push = (id) => {
    if (!id || done.has(id) || !known.has(id) || line.includes(id)) return;
    line.push(id);
  };
  for (const id of order) push(id);
  for (const chore of stored) push(chore.id);
  for (const chore of memory) push(chore.id);
  for (const chore of submitted) push(chore.id);

  return line.map((id) => {
    const fresh = submitted.find((chore) => chore.id === id);
    const base = fresh || known.get(id);
    const flee = Boolean(base.flee);
    return {
      id,
      title: base.title,
      points: Number(base.points) || 0,
      sprite: base.sprite || "dust",
      approved: flee || !submittedIds.has(id),
      flee,
    };
  });
}

export function splitBattleLine(line, approvedOrder = []) {
  const rank = (chore) => {
    const at = approvedOrder.indexOf(chore.id);
    return at < 0 ? approvedOrder.length : at;
  };
  const plays = line.filter((chore) => chore?.approved).sort((a, b) => rank(a) - rank(b));
  return { plays, waiting: line.filter((chore) => chore && !chore.approved) };
}
