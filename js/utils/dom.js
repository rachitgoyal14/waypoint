export function qs(sel, root = document) {
  return root.querySelector(sel);
}

export function el(tag, cls = "", text = "") {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  return n;
}
