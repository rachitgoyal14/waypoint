export function filterNotes(notes, q) {
  q = q.toLowerCase();
  return notes.filter((n) => (n.title + n.content).toLowerCase().includes(q));
}
