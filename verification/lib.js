/* Shared helpers for the checks and the generator. No outside package.
 *
 * Sibling repositories are read with git, at the commit that verification/evidence.json pins, never from the working
 * tree. The directory that holds them is SIBLINGS (an environment variable), or the parent of this repository.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SIBLINGS = process.env.SIBLINGS ? path.resolve(process.env.SIBLINGS) : path.join(ROOT, '..');
const OWNER = 'cpsbvbng26-dotcom';
const SELF = 'site-legal-risk';
const SKIP = new Set(['.git', 'node_modules']);
const BINARY = /\.(pdf|png|ico)$/i;

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');

/* Every file of this repository as a Map (path -> string; a binary file -> Buffer). */
function load(root) {
  const F = new Map();
  const walk = (dir, rel) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(e.name)) continue;
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) walk(path.join(dir, e.name), r);
      else F.set(r, BINARY.test(e.name) ? fs.readFileSync(path.join(dir, e.name)) : fs.readFileSync(path.join(dir, e.name), 'utf8'));
    }
  };
  walk(root || ROOT, '');
  return F;
}
const json = (F, p) => { try { return JSON.parse(F.get(p)); } catch (e) { return null; } };

/* The text of a source file as it is compared with a quotation. */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decode(s) {
  return s.replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in ENT ? ENT[n.toLowerCase()] : m));
}
const ws = (s) => String(s).replace(/\s+/g, ' ').trim();
function normalise(file, text) {
  let t = String(text);
  if (/\.html?$/.test(file)) t = decode(t.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' '));
  else if (/\.md$/.test(file)) t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\*\*/g, '').replace(/`/g, '');
  /* A line break between two Japanese characters is not a space (Markdown sources wrap Japanese lines). */
  t = t.replace(/([　-鿿＀-￯])[ \t]*\n[ \t]*(?=[　-鿿＀-￯])/g, '$1');
  return ws(t);
}

/* git, in a sibling repository. Returns null on any failure. */
function git(repo, args) {
  try { return execFileSync('git', ['-C', path.join(SIBLINGS, repo)].concat(args), { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { return null; }
}
const show = (repo, commit, file) => git(repo, ['show', commit + ':' + file]);
const mainRef = (repo) => (git(repo, ['rev-parse', '--verify', '--quiet', 'origin/main']) ? 'origin/main' : 'main');
const onMain = (repo, commit) => git(repo, ['merge-base', '--is-ancestor', commit, mainRef(repo)]) !== null;
const commitExists = (repo, commit) => git(repo, ['cat-file', '-e', commit + '^{commit}']) !== null;
function mergedPRs(repo) {
  const out = git(repo, ['log', '--merges', '--first-parent', mainRef(repo), '--format=%s']);
  if (out === null) return null;
  const s = new Set();
  for (const l of out.split('\n')) {
    let m = /^Merge pull request #(\d+)/.exec(l) || /\(#(\d+)\)$/.exec(l);
    if (m) s.add(Number(m[1]));
  }
  return s;
}

/* The words of a TeX file that the paper prints as its own prose: comments, the arguments of commands that
 * print code, paths, references or labels, and the generated quotation macros are removed. */
function texBody(t) {
  let s = String(t).replace(/(^|[^\\])%.*$/gm, '$1');
  s = s.replace(/\\(?:label|ref|eqref|cite|url|href|texttt|path|input|statq|srcq|ev|evc|nolinkurl|hypersetup|pdfvariable|directlua|newcommand|renewcommand|setmainfont|newfontfamily|usepackage|documentclass|begin|end|setlength|geometry)\s*(\[[^\]]*\])?\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}(\{(?:[^{}]|\{[^{}]*\})*\})?/g, ' ');
  return s;
}

module.exports = { ROOT, SIBLINGS, OWNER, SELF, sha, load, json, normalise, ws, git, show, onMain, commitExists, mergedPRs, mainRef, texBody };
