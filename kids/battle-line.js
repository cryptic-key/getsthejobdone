/* The battle line stays in the order chores were marked done.
   Approving a later chore does not jump it ahead of the one on screen. */

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
    return {
      id,
      title: base.title,
      points: Number(base.points) || 0,
      sprite: base.sprite || "dust",
      approved: !submittedIds.has(id),
    };
  });
}

export function splitBattleLine(line) {
  const plays = [];
  for (const chore of line) {
    if (!chore?.approved) break;
    plays.push(chore);
  }
  return { plays, waiting: line.slice(plays.length) };
}
