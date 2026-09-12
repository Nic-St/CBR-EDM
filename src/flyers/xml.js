// Shared XML text escaping for hand-built SVG strings. Every piece of
// event data that ends up inside a <text> node must go through this.

export function escapeXml(str) {
  return String(str).replace(/[<>&'"]/g, (ch) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[ch]));
}
