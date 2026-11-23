#!/usr/bin/env node
/* Writes every number, quotation and table that the paper takes from the sources.
 *
 *   node scripts/generate.js           write the files below
 *   node scripts/generate.js --print   print the numbers and write nothing
 *
 * Inputs: this repository's verification/*.json, and the sibling repositories read with git at the commits pinned in
 * verification/evidence.json (the directory SIBLINGS, or the parent of this repository).
 * Outputs (generated files; never edited by hand):
 *   verification/numbers.json     each number with its definition
 *   paper/generated/numbers.tex   \newcommand for each number
 *   paper/generated/audit.tex     the rows of the table of audit findings
 *   paper/generated/evidence.tex  the appendix table of evidence
 *   paper/generated/statutes.tex  the appendix table of statutes
 *   paper/generated/quotes.lua    the quotations, read by \srcq when the paper is typeset
 * verification/check_sources.js runs build() again and fails if any output differs from the committed file.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('../verification/lib');

const AUDITS = [
  // repository, file, column that holds the finding, label in the paper
  ['cpsbvbng26-dotcom', 'docs/legal-audit-2026-11-12.md', '判定', 'cpsbvbng26-dotcom'],
  ['sophaxis', 'docs/legal-audit-2026-11-12.md', '判定', 'Sophaxis'],
  ['researcher-profile', 'docs/legal-audit-2026-11-12.md', '判定', 'researcher-profile'],
  ['errata-check', 'docs/legal-audit-2026-11-12.md', '判定', 'errata-check'],
  ['deposit-check', 'docs/legal-audit-2026-11-12.md', 'Finding', 'deposit-check'],
];
const CATS = [
  ['Ok', '問題なし', 'No problem'],
  ['Wording', '表現', 'Wording'],
  ['Omission', '漏れ', 'Omission'],
  ['Basis', '根拠不足', 'Insufficient basis'],
  ['Error', '誤り', 'Error'],
];

/* Pure: the findings of every row of every table of findings whose header has the column. */
function findings(md, column) {
  const out = [];
  let col = -1;
  for (const line of String(md).split('\n')) {
    if (!line.startsWith('|')) { col = -1; continue; }
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((x) => x.trim());
    /* A table of findings has a row for each place (six columns). A short table that only explains the categories
     * (two columns: the finding and its meaning) is not a table of findings. */
    if (cells.includes(column)) { col = cells.length >= 5 ? cells.indexOf(column) : -1; continue; }
    if (/^[|\-:\s]+$/.test(line)) continue;
    if (col >= 0) out.push(cells[col] === undefined ? '' : cells[col]);
  }
  return out;
}

/* Pure: the rows of the first table under the heading "## Who can submit" whose header starts with "| Place |". */
function placeRows(md) {
  const s = String(md);
  const i = s.indexOf('\n## Who can submit');
  if (i < 0) return null;
  const sec = s.slice(i + 1).split(/\n## /)[0];
  const lines = sec.split('\n');
  const h = lines.findIndex((l) => l.startsWith('| Place |'));
  if (h < 0) return null;
  const rows = [];
  for (let k = h + 2; k < lines.length && lines[k].startsWith('|'); k++) rows.push(lines[k].replace(/^\||\|$/g, '').split('|').map((x) => x.trim()));
  return rows;
}

function one(re, text, what) {
  const m = re.exec(String(text));
  if (!m) throw new Error('not found: ' + what);
  return Number(m[1]);
}

function build() {
  const E = JSON.parse(fs.readFileSync(path.join(L.ROOT, 'verification/evidence.json'), 'utf8'));
  const S = JSON.parse(fs.readFileSync(path.join(L.ROOT, 'verification/statutes.json'), 'utf8'));
  const C = JSON.parse(fs.readFileSync(path.join(L.ROOT, 'verification/copies.json'), 'utf8'));
  const at = (repo, file) => {
    const t = L.show(repo, E.repos[repo], file);
    if (t === null) throw new Error('cannot read ' + repo + ':' + file + ' at ' + E.repos[repo]);
    return t;
  };
  const N = {};
  const put = (key, value, how) => {
    if (!/^[A-Za-z]+$/.test(key)) throw new Error('bad key ' + key);
    if (!Number.isInteger(value)) throw new Error('not an integer: ' + key);
    N[key] = { value, how };
  };

  /* This repository. */
  put('statArticles', S.statutes.length, 'entries in verification/statutes.json of this repository');
  put('statLaws', new Set(S.statutes.map((e) => e.law)).size, 'distinct laws among those entries');
  put('copies', Object.keys(C.copies).length, 'canonical files copied word for word (verification/copies.json)');
  put('evRepos', Object.keys(E.repos).length, 'repositories pinned in verification/evidence.json');
  put('evItems', E.items.length, 'items in verification/evidence.json');
  put('evQuotes', E.items.filter((x) => x.quote).length, 'items in verification/evidence.json that carry a quotation');
  put('evPRs', E.items.filter((x) => x.pr).length, 'pull requests cited in verification/evidence.json');

  /* cpsbvbng26-dotcom. */
  const canon = JSON.parse(at('cpsbvbng26-dotcom', 'verification/statutes.json'));
  put('canonArticles', Object.keys(canon['条文']).length, 'articles (条文) in cpsbvbng26-dotcom verification/statutes.json');
  put('canonLaws', new Set(Object.values(canon['条文']).map((e) => e['法令'])).size, 'distinct values of the field 法令 among them');
  put('canonTerms', Object.keys(canon['規約']).length, 'terms of services and licences (規約) in the same file');
  const claude = at('cpsbvbng26-dotcom', 'CLAUDE.md');
  put('mergesNoDisclosure', one(/開示の無いマージが、10 リポジトリ合わせて (\d+) 件ある。/, claude, 'merges without disclosure'), 'number stated in cpsbvbng26-dotcom CLAUDE.md and compared by its check_ecosystem.js');
  put('verifyTimes', one(/合っているかを、最低 (\d+) 回確かめる。/, claude, 'rule 18'), 'rule 18 of cpsbvbng26-dotcom CLAUDE.md');
  const disc = at('cpsbvbng26-dotcom', 'DISCLAIMER.en.md');
  put('discTen', one(/This page applies to the following (\d+) repositories/, disc, 'disclaimer scope'), 'repositories in the scope line of DISCLAIMER.en.md');
  const extra = /^To (.+), the sections "Information"/m.exec(disc);
  if (!extra) throw new Error('not found: disclaimer second scope line');
  put('discExtra', extra[1].split(', ').length, 'repositories named in the second scope line of DISCLAIMER.en.md');
  const screen = at('cpsbvbng26-dotcom', 'docs/screen-reader.md');
  put('screenQuestions', (screen.split('## 確かめること')[1] || '').split('\n## ')[0].split('\n').filter((l) => /^\d+\. /.test(l)).length, 'numbered items under 確かめること in docs/screen-reader.md');

  /* Sophaxis. */
  const sub = at('sophaxis', 'policies/submission.md');
  const rows = placeRows(sub);
  if (!rows) throw new Error('no table of places');
  put('places', rows.length, 'rows of the table of places in Sophaxis policies/submission.md');
  put('placesFirst', rows.filter((r) => r[4] === '2026-11-22').length, 'rows whose From is 2026-11-22');
  put('placesLater', rows.filter((r) => r[4] === '2026-11-26').length, 'rows whose From is 2026-11-26');
  put('placesYes', rows.filter((r) => r[3] === 'Yes').length, 'rows read at their source: Yes');
  put('placesReported', rows.filter((r) => r[3] === 'No, as reported').length, 'rows read at their source: No, as reported');
  put('placesPart', rows.filter((r) => r[3] === 'In part').length, 'rows read at their source: In part');
  put('placesNotFetched', rows.filter((r) => r[3] === 'No, not fetched').length, 'rows read at their source: No, not fetched');
  put('placesStated', one(/lives in any of the (\d+) places in the table below/, sub, 'stated count of places'), 'the count that the Submission Policy states in words');
  put('survey', one(/a survey of the laws of (\d+) countries/, sub, 'survey'), 'countries in the survey named by the Submission Policy');
  put('noticeDays', one(/The announcement comes at least (\d+) days ahead/, at('sophaxis', 'policies/terms.md'), 'notice days'), 'days of notice in Sophaxis policies/terms.md');
  put('objectionDays', one(/within (\d+) days from the day the question is posted/, at('sophaxis', 'policies/takedown.md'), 'objection days'), 'days for an objection in Sophaxis policies/takedown.md');

  /* legal-and-governance. */
  const lgCheck = at('legal-and-governance', 'verification/check.js');
  put('lgBreaks', lgCheck.split('\n').filter((l) => l.startsWith('brk(')).length, 'lines beginning with brk( in legal-and-governance verification/check.js');

  /* The audits. */
  const T = {};
  for (const [k] of CATS) T[k] = 0;
  T.Other = 0;
  const rowsTex = [];
  for (const [repo, file, column, label] of AUDITS) {
    const f = findings(at(repo, file), column);
    const c = {};
    for (const [k, ja, en] of CATS) c[k] = f.filter((x) => x === (column === '判定' ? ja : en)).length;
    c.Other = f.length - CATS.reduce((a, [k]) => a + c[k], 0);
    for (const k of Object.keys(c)) T[k] += c[k];
    rowsTex.push([label, ...CATS.map(([k]) => c[k]), c.Other, f.length]);
  }
  const total = Object.values(T).reduce((a, b) => a + b, 0);
  put('auditRepos', AUDITS.length, 'audit records counted');
  put('auditCats', CATS.length, 'categories of findings');
  put('auditTotal', total, 'rows of findings in those records');
  for (const [k] of CATS) put('audit' + k, T[k], 'rows whose finding is ' + CATS.find((x) => x[0] === k)[2]);
  put('auditOther', T.Other, 'rows whose finding cell is none of the five');
  put('auditNotOk', total - T.Ok - T.Other, 'rows with a finding other than No problem');
  put('auditNotOkPct', Math.round((100 * (total - T.Ok - T.Other)) / total), 'that number as a percentage of all rows, rounded');
  put('auditErrorPct', Math.round((100 * T.Error) / total), 'Error rows as a percentage of all rows, rounded');

  /* Files. */
  const out = {};
  const keys = Object.keys(N).sort();
  out['verification/numbers.json'] = JSON.stringify({ _: ['Generated by scripts/generate.js. Do not edit. Each value is printed in the paper through the macro \\n<Key>.'], numbers: Object.fromEntries(keys.map((k) => [k, N[k]])) }, null, 2) + '\n';
  out['paper/generated/numbers.tex'] = '% Generated by scripts/generate.js. Do not edit.\n' + keys.map((k) => '\\newcommand{\\n' + k[0].toUpperCase() + k.slice(1) + '}{' + N[k].value + '}').join('\n') + '\n';
  out['paper/generated/audit.tex'] = '% Generated by scripts/generate.js. Do not edit.\n' + rowsTex.map((r) => r.join(' & ') + ' \\\\').join('\n') + '\n\\midrule\nTotal & ' + CATS.map(([k]) => T[k]).join(' & ') + ' & ' + T.Other + ' & ' + total + ' \\\\\n';
  const esc = (s) => String(s).replace(/\\/g, '\\textbackslash{}').replace(/([#$%&_{}])/g, '\\$1').replace(/~/g, '\\textasciitilde{}').replace(/\^/g, '\\textasciicircum{}');
  const brk = (s) => esc(s).replace(/([/.\-])/g, '$1\\allowbreak{}');
  const evRows = E.items.map((x) => {
    const where = x.pr ? 'pull request \\#' + x.pr : x.commit ? 'commit \\texttt{' + x.commit.slice(0, 7) + '}' : '\\texttt{' + brk(x.path) + '}';
    return '\\texttt{' + brk(x.id) + '} & ' + esc(x.repo) + ' & ' + where + ' & ' + (x.pr || x.commit ? '' : '\\texttt{' + E.repos[x.repo].slice(0, 7) + '}') + ' \\\\';
  });
  out['paper/generated/evidence.tex'] = '% Generated by scripts/generate.js. Do not edit.\n' + evRows.join('\n') + '\n';
  const stRows = S.statutes.map((e) => '\\ja{' + e.law + ' ' + e.label + '} & \\texttt{' + e.law_id + '} & \\texttt{' + e.sha256.slice(0, 16) + '} \\\\');
  out['paper/generated/statutes.tex'] = '% Generated by scripts/generate.js. Do not edit.\n' + stRows.join('\n') + '\n';
  const lua = (s) => { let n = 0; while (s.includes(']' + '='.repeat(n) + ']')) n++; return '[' + '='.repeat(n) + '[' + s + ']' + '='.repeat(n) + ']'; };
  out['paper/generated/quotes.lua'] = '-- Generated by scripts/generate.js. Do not edit.\nreturn {\n' + E.items.map((x) => '  [' + JSON.stringify(x.id) + '] = { repo = ' + lua(x.repo) + ', where = ' + lua(x.pr ? 'pull request #' + x.pr : x.commit ? 'commit ' + x.commit.slice(0, 7) : x.path) + ', lang = ' + lua(x.lang || '') + ', quote = ' + lua(x.quote || '') + ' },').join('\n') + '\n}\n';
  return { N, out };
}

if (require.main === module) {
  const { N, out } = build();
  if (process.argv.includes('--print')) { for (const [k, v] of Object.entries(N)) console.log(k.padEnd(20) + String(v.value).padStart(6) + '  ' + v.how); process.exit(0); }
  fs.mkdirSync(path.join(L.ROOT, 'paper/generated'), { recursive: true });
  for (const [f, t] of Object.entries(out)) fs.writeFileSync(path.join(L.ROOT, f), t);
  console.log('wrote ' + Object.keys(out).length + ' files, ' + Object.keys(N).length + ' numbers');
}
module.exports = { build, findings, placeRows };
