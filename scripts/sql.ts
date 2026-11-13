/** Split SQL without splitting quoted strings, comments, or dollar-quoted function bodies. */
export function splitSql(input: string): string[] {
  const out: string[] = []; let start = 0, i = 0, quote = '', dollar = '', line = false, block = 0;
  while (i < input.length) {
    const c = input[i], n = input[i + 1];
    if (line) { if (c === '\n') line = false; i++; continue; }
    if (block) { if (c === '/' && n === '*') { block++; i += 2; } else if (c === '*' && n === '/') { block--; i += 2; } else i++; continue; }
    if (dollar) { if (input.startsWith(dollar, i)) { i += dollar.length; dollar = ''; } else i++; continue; }
    if (quote) { if (c === quote) { if (n === quote) i += 2; else { quote = ''; i++; } } else i++; continue; }
    if (c === '-' && n === '-') { line = true; i += 2; continue; }
    if (c === '/' && n === '*') { block = 1; i += 2; continue; }
    if (c === "'" || c === '"') { quote = c; i++; continue; }
    if (c === '$') { const match = /^\$[a-zA-Z_][a-zA-Z_0-9]*\$|^\$\$/.exec(input.slice(i)); if (match) { dollar = match[0]; i += dollar.length; continue; } }
    if (c === ';') { const statement = input.slice(start, i).trim(); if (statement) out.push(statement); start = i + 1; }
    i++;
  }
  if (quote || dollar || block) throw new Error('Unterminated SQL');
  const tail = input.slice(start).trim(); if (tail) out.push(tail);
  return out;
}
