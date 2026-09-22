export function todayTitle(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
