export function readMdFiles(files) {
  return [...files].filter((f) => f.name.endsWith(".md"));
}
