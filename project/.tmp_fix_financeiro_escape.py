from pathlib import Path

path = Path("project/src/pages/Financeiro.tsx")
text = path.read_text(encoding="utf-8").replace("\r\n", "\n")

old = """function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, ''');
}
"""

new = """function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, ''');
}
"""

if old not in text:
    raise SystemExit("escapeHtml block not found")

text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8", newline="\n")
print("escapeHtml fixed")
