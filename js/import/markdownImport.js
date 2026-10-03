import { extractWikilinks, extractTags } from "../editor/markdown.js";
import { createNote, saveNote, getNoteByTitle, setTags } from "../supabase/notes.js";
import { replaceLinks } from "../supabase/links.js";

export function readMdFiles(files) {
  return [...files].filter((f) => f.name.endsWith(".md"));
}

export async function importFiles(fileList, onProgress) {
  const files = readMdFiles(fileList);
  if (!files.length) {
    return { imported: [] };
  }

  const texts = await Promise.all(files.map((f) => readVia(f, new FileReader())));
  const imported = [];

  for (let i = 0; i < files.length; i++) {
    const { data, error } = await createNote(titleFrom(files[i].name));
    if (error || !data) continue;
    const { error: saveError } = await saveNote(data.id, titleFrom(files[i].name), texts[i]);
    if (saveError) continue;
    data.content = texts[i];
    imported.push(data);
    if (onProgress) onProgress(i + 1, files.length);
  }

  await syncBatch(imported);
  return { imported };
}

function readVia(file, reader) {
  return new Promise((resolve) => {
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => resolve("");
    reader.readAsText(file);
  });
}

function titleFrom(name) {
  return name.replace(/\.md$/i, "");
}

async function syncBatch(imported) {
  for (const n of imported) {
    const content = n.content || "";
    await setTags(n.id, extractTags(content));

    const targets = [];
    for (const title of extractWikilinks(content)) {
      const target = findTarget(title, imported);
      if (target) {
        targets.push(target.id);
        continue;
      }
      const { data } = await getNoteByTitle(title);
      if (data && data.length) {
        targets.push(data[0].id);
      }
    }
    await replaceLinks(n.id, targets);
  }
}

function findTarget(title, imported) {
  return imported.find((x) => x.title.toLowerCase() === title.toLowerCase());
}
