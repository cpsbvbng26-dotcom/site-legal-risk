#!/usr/bin/env node
/* The checks of this repository that need nothing outside it (besides pdfinfo and pdftotext from poppler-utils).
 *
 *   node verification/check.js           every check passes
 *   node verification/check.js --break   every way to break a check is caught, and every check has one
 *
 * Each check is a pure function of the files of the repository (a Map of path -> content) and of the facts read from
 * the PDF, so that --break can change a copy and run the same function. The checks that read the sibling repositories
 * are in verification/check_sources.js.
 */
'use strict';
const { execFileSync } = require('child_process');
const L = require('./lib');

const TEX = 'paper/site-legal-risk.tex';
const PDF = 'paper/site-legal-risk.pdf';
const dec = (b) => Buffer.from(b, 'base64').toString('utf8');

/* The operator's creative sites and their repositories. Encoded, so that this file does not name them. */
const OTHER_PLACE = ['bnVzcXVhbWE=', '44OM44K544Kv44Kh44Oe', '54Sh5L2V5pyJ', 'cXVpZXQtd2l6YXJk', 'cXVpZXQgd2l6YXJk', 'c3RlYWx0aCB3aXphcmQ=', 'c3RlYWx0aHdpemFyZA==', 'cXctZHJhZnQ='].map(dec);
/* A university name (no affiliation is written) and self-assigned titles, as in the other repositories. */
const SCHOOL = [new RegExp(dec('WkVO') + '\\s*(?:' + dec('5aSn5a2m') + '|University)', 'i'), new RegExp(dec('WkVO') + dec('5aSn')), new RegExp(dec('emVu') + '\\s*\\.\\s*ac\\s*\\.\\s*jp', 'i')];
const TITLES = [dec('54us56uL56CU56m26ICF'), dec('SW5kZXBlbmRlbnQgUmVzZWFyY2hlcg=='), dec('Y29uc3VsdGFudA=='), dec('44Kz44Oz44K144Or44K/44Oz44OI'), dec('U2VhbGFuZA=='), dec('44K344O844Op44Oz44OJ')];
/* Words that give the operator a task (cpsbvbng26-dotcom, rule 16). */
const TASKS = ['利用者が確かめる', '利用者の手作業', '利用者の作業', 'needs the owner', 'for the owner to', 'してください'];
const NUMBER_WORDS = /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|dozen|twice|thrice|single-digit)\b/i;
const KANJI_NUMBER = /[一二三四五六七八九十百千]+(?:つ|件|項目|通り|本|か所|人|条|日|年|回)/;
const FIXED = [/一人の運営者の事例研究/g, /CC\s+BY\s+4\.0/g, /Attribution\s+4\.0\s+International/g, /SHA-256/g, /UTF-8/g, /0009-0000-1406-0547/g, /\d{4}-\d{2}-\d{2}/g];

/* Organisations. The paper names no organisation except those the author founded (rule 18 of CLAUDE.md, 2026-11-23:
 * 「論文の注意点、自分が創設したもの以外つまり団体名は一切かかないでね」). The list is built from the names that occur in the
 * sources and in the operator's other repositories (the disclaimer's services, archives, registries, vendors, authorities,
 * universities and platforms). Names are matched with their case, as whole words. The author's own projects are not in it.
 * The licence identifiers "CC BY 4.0" and "MIT License" are names of legal instruments, kept like the names of statutes. */
const ORGS = ['GitHub', 'Vercel', 'Anthropic', 'OpenAI', 'Google', 'Microsoft', 'Apple', 'iCloud', 'Amazon', 'Cloudflare', 'e-Gov', 'e-GOV',
  'Zenodo', 'CERN', 'ORCID', 'orcid.org', 'DataCite', 'Crossref', 'JaLC', 'OSF', 'Center for Open Science', 'SSRN', 'Social Science Research Network',
  'Legal Scholarship Network', 'Elsevier', 'Springer', 'Wiley', 'arXiv', 'Jxiv', 'PhilArchive', 'PhilPapers', 'Figshare', 'Internet Archive',
  'Wayback Machine', 'OpenAlex', 'OpenAIRE', 'Semantic Scholar', 'Wikidata', 'Wikipedia', 'researchmap', 'J-STAGE', 'CiNii', 'HAL', 'Creative Commons',
  'APEC', 'European Union', 'EU', 'OECD', 'United Nations', 'Personal Information Protection Commission', '個人情報保護委員会', 'Japan Patent Office',
  '特許庁', 'Agency for Cultural Affairs', '文化庁', '総務省', '消費者庁', 'デジタル庁', 'Digital Agency', 'National Diet Library', '国立国会図書館', 'JACAR',
  '防衛研究所', '東北大学', 'Tohoku University', 'edX', 'Coursera', 'Udemy', 'Georgia Tech', 'Georgia Institute of Technology', 'IPA',
  'Information-technology Promotion Agency', 'Massachusetts Institute of Technology', 'W3C', 'World Wide Web Consortium', 'Debian', 'Ubuntu', 'Canonical',
  'TeX Users Group', 'Grok', 'xAI', 'Facebook', 'Twitter', 'LinkedIn', 'YouTube', 'Slack', 'Dropbox', 'Open Archives Initiative', 'OAI-PMH',
  'デジタル・アーカイブ', 'アジア歴史資料センター'];
const ORG_RE = new RegExp('(?<![A-Za-z0-9])(?:' + ORGS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![A-Za-z0-9])');
const OWN = ['Sophaxis', 'cpsbvbng26-dotcom', 'researcher-profile', 'legal-and-governance', 'research-collaboration', 'deposit-check', 'errata-check', 'site-legal-risk'];
const orgsIn = (s) => { let t = String(s); for (const w of OWN) t = t.split(w).join(' '); const m = ORG_RE.exec(t); return m ? m[0] : null; };

/* ------------------------------------------------------------ reading the source of the paper */
function macroArgs(t, name, n) {
  const out = [];
  const re = new RegExp('\\\\' + name + '(?![A-Za-z])', 'g');
  let m;
  while ((m = re.exec(t))) {
    let i = m.index + m[0].length;
    const args = [];
    for (let k = 0; k < n; k++) {
      while (t[i] === ' ' || t[i] === '\n') i++;
      if (t[i] !== '{') break;
      let d = 0, j = i;
      for (; j < t.length; j++) { if (t[j] === '{') d++; else if (t[j] === '}' && --d === 0) break; }
      args.push(t.slice(i + 1, j));
      i = j + 1;
    }
    out.push({ at: m.index, end: i, args });
  }
  return out;
}
const body = (t) => { const s = String(t); const i = s.indexOf('\\begin{document}'); return i < 0 ? '' : s.slice(i); };
/* The prose that the paper prints in its own words. */
function prose(t) {
  let s = L.texBody(body(t));
  s = s.replace(/\\(?:citeev|date|caption|n[A-Z][A-Za-z]*\{\})/g, ' ');
  s = s.replace(/\\[A-Za-z@]+/g, ' ');
  return s;
}

/* ------------------------------------------------------------ the facts of the PDF */
function pdfFacts(F) {
  const buf = F.get(PDF);
  if (!buf) return { error: 'no PDF' };
  try {
    const info = execFileSync('pdfinfo', ['-'], { input: buf, encoding: 'utf8' });
    const text = execFileSync('pdftotext', ['-enc', 'UTF-8', '-', '-'], { input: buf, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return { pages: Number((/^Pages:\s+(\d+)/m.exec(info) || [])[1]), words: text.split(/\s+/).filter(Boolean).length, text, sha: L.sha(buf) };
  } catch (e) { return { error: 'pdfinfo or pdftotext failed or is missing: ' + e.message.split('\n')[0] }; }
}
const readmeFacts = (t) => ({
  pages: Number((/^- (?:頁数|Pages): (\d+)$/m.exec(t) || [])[1]),
  words: Number((/^- (?:語数|Words)[^:]*: (\d+)$/m.exec(t) || [])[1]),
  sha: (/^- SHA-256: `([0-9a-f]{64})`$/m.exec(t) || [])[1],
});

const CHECKS = [];
const check = (name, fn) => CHECKS.push({ name, fn });

check('the copies of the canonical files have the recorded SHA-256', (F) => {
  const C = L.json(F, 'verification/copies.json');
  if (!C) return ['copies.json cannot be read'];
  const bad = [];
  for (const [f, h] of Object.entries(C.copies)) if (!F.has(f) || L.sha(F.get(f)) !== h) bad.push(f);
  if (Object.keys(C.copies).length !== 5) bad.push('not the five canonical files');
  return bad;
});

check('every statute quotation occurs in the recorded e-Gov text, is followed by a summary, and the texts match their hashes', (F) => {
  const S = L.json(F, 'verification/statutes.json'), T = L.json(F, 'verification/statutes-texts.json');
  if (!S || !T) return ['statutes.json or statutes-texts.json cannot be read'];
  const bad = [];
  for (const e of S.statutes) {
    const k = e.law + ' ' + e.label;
    if (typeof T[k] !== 'string' || L.sha(T[k]) !== e.sha256) bad.push(k + ': text does not match its SHA-256');
    if (!/^\d{3}[A-Z]{2}\d{10}$/.test(e.law_id)) bad.push(k + ': law number has the wrong form');
  }
  const t = F.get(TEX) || '';
  const qs = macroArgs(body(t), 'statq', 2);
  if (!qs.length) bad.push('no statute is quoted');
  const used = new Set();
  for (const q of qs) {
    const [key, text] = q.args;
    used.add(key);
    if (!S.statutes.some((e) => e.law + ' ' + e.label === key)) { bad.push(key + ': not recorded'); continue; }
    if (/[\\{}$%#&_^~]/.test(text)) bad.push(key + ': quotation holds a TeX special character');
    if (!text || !T[key].includes(text)) bad.push(key + ': quotation not in the recorded text: ' + String(text).slice(0, 20));
    if (!/^\s*\\summ\{/.test(body(t).slice(q.end, q.end + 40))) bad.push(key + ': quotation not followed by \\summ');
  }
  for (const e of S.statutes) if (!used.has(e.law + ' ' + e.label)) bad.push(e.law + ' ' + e.label + ': recorded but never quoted');
  if (/(?:Article|Art\.)\s*~?\d/.test(prose(t)) || /第[0-9０-９一二三四五六七八九十百]+条/.test(prose(t))) bad.push('an article is named outside a checked quotation');
  return bad;
});

check('every quotation, citation and number in the paper comes from the registries', (F) => {
  const E = L.json(F, 'verification/evidence.json'), N = L.json(F, 'verification/numbers.json');
  if (!E || !N) return ['evidence.json or numbers.json cannot be read'];
  const t = F.get(TEX) || '';
  const ids = new Map(E.items.map((x) => [x.id, x]));
  const bad = [];
  const used = new Set();
  for (const name of ['srcq', 'ev', 'citeev']) for (const m of macroArgs(body(t), name, 1)) {
    const id = m.args[0];
    used.add(id);
    if (!ids.has(id)) { bad.push('\\' + name + '{' + id + '}: not in evidence.json'); continue; }
    if (name === 'srcq' && !ids.get(id).quote) bad.push(id + ': cited with \\srcq but has no quotation');
    if (name === 'srcq' && ids.get(id).lang === 'ja' && !/^\s*\\summ\{/.test(body(t).slice(m.end, m.end + 40))) bad.push(id + ': Japanese quotation not followed by \\summ');
  }
  for (const id of ids.keys()) if (!used.has(id)) bad.push(id + ': in evidence.json but not cited');
  const lua = F.get('paper/generated/quotes.lua') || '';
  for (const x of E.items) if (x.quote && !lua.includes(x.quote)) bad.push(x.id + ': quotation not in paper/generated/quotes.lua');
  const defs = F.get('paper/generated/numbers.tex') || '';
  for (const m of body(t).matchAll(/\\n([A-Z][A-Za-z]*)\{\}/g)) {
    const k = m[1][0].toLowerCase() + m[1].slice(1);
    if (!N.numbers[k]) bad.push('\\n' + m[1] + ': not in numbers.json');
    else if (!defs.includes('\\newcommand{\\n' + m[1] + '}{' + N.numbers[k].value + '}')) bad.push('\\n' + m[1] + ': numbers.tex differs from numbers.json');
  }
  return bad;
});

check('no digit, English number word or Japanese number appears in the prose except through a macro, a date in the ledger or a fixed form', (F) => {
  const D = L.json(F, 'verification/dates.json');
  if (!D) return ['dates.json cannot be read'];
  const bad = [];
  const texts = [[TEX, prose(F.get(TEX) || '')]].concat(['README.md', 'README.en.md'].map((f) => [f, (F.get(f) || '').replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]*`/g, ' ').replace(/\]\([^)]*\)/g, ']').replace(/^- (?:頁数|Pages|語数|Words|SHA-256)[^\n]*$/gm, ' ').replace(/https?:\/\/\S+/g, ' ').replace(/^#.*$/gm, ' ')]));
  for (const [f, s0] of texts) {
    for (const m of s0.matchAll(/\d{4}-\d{2}-\d{2}/g)) if (!D.dates[m[0]]) bad.push(f + ': date not in the ledger: ' + m[0]);
    let s = s0;
    for (const re of FIXED) s = s.replace(re, ' ');
    s = s.replace(/[A-Za-z_]*[A-Za-z]-?\d+[A-Za-z\d-]*/g, ' ');
    const left = s.match(/\d+(?:[.,]\d+)*/g);
    if (left) bad.push(f + ': number outside a macro: ' + left.slice(0, 5).join(', '));
    const w = NUMBER_WORDS.exec(s);
    if (w) bad.push(f + ': number word: ' + w[0]);
    const k = KANJI_NUMBER.exec(s);
    if (k) bad.push(f + ': Japanese number: ' + k[0]);
  }
  for (const [d, v] of Object.entries(D.dates)) {
    if (v.local) { const j = L.json(F, v.local); if (!j || j[v.field] !== d) bad.push(d + ': not the ' + v.field + ' of ' + v.local); }
    else if (!v.evidence) bad.push(d + ': no source');
  }
  const S = L.json(F, 'verification/statutes.json') || {};
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const fd = String(S.fetched || '').split('-').map(Number);
  const want = fd[2] + ' ' + months[fd[1] - 1] + ' ' + fd[0];
  if (!(F.get(TEX) || '').includes('\\date{' + want + '}')) bad.push('the date of the paper is not the day the statutes were fetched (' + want + ')');
  return bad;
});

check('the README states the page count, the word count and the SHA-256 of the PDF', (F, P) => {
  if (P.error) return [P.error];
  const bad = [];
  for (const f of ['README.md', 'README.en.md']) {
    const r = readmeFacts(F.get(f) || '');
    if (r.pages !== P.pages) bad.push(f + ': pages ' + r.pages + ' / PDF ' + P.pages);
    if (r.words !== P.words) bad.push(f + ': words ' + r.words + ' / PDF ' + P.words);
    if (r.sha !== P.sha) bad.push(f + ': SHA-256 differs from the PDF');
  }
  for (const s of ['Legal Risk Management by Domain for Website Operation in the Age of AI', 'Claude is not an author.', 'not legal advice', 'No lawyer has reviewed']) if (!P.text.replace(/\s+/g, ' ').includes(s)) bad.push('PDF text lacks: ' + s);
  return bad;
});

check('no file and not the text of the PDF names or links the operator\'s creative sites, and links go only to the repositories of the case set', (F, P) => {
  const E = L.json(F, 'verification/evidence.json') || { repos: {} };
  const allowed = new Set(Object.keys(E.repos).concat([L.SELF, L.OWNER]));
  const bad = [];
  const texts = [...F.entries()].filter(([f, t]) => typeof t === 'string' && f !== 'verification/check.js').concat([['(PDF text)', P.text || '']]);
  for (const [f, t] of texts) {
    const low = t.toLowerCase();
    for (const w of OTHER_PLACE) if (low.includes(w.toLowerCase())) bad.push(f + ': names a creative site');
    if (f.startsWith('.github/') && f !== '.github/checked-intake/config.json') continue;
    for (const m of t.matchAll(/cpsbvbng26-dotcom\/([A-Za-z0-9._-]+)/g)) if (!allowed.has(m[1].replace(/\.git$/, ''))) bad.push(f + ': links ' + m[1]);
    for (const m of t.matchAll(/([a-z0-9-]+)\.vercel\.app/g)) if (!['cpsbvbng26-dotcom', 'sophaxis'].includes(m[1])) bad.push(f + ': links ' + m[0]);
  }
  if (P.error) bad.push(P.error);
  return bad;
});

check('the paper and the text of its PDF name no organisation except the author\'s own projects', (F, P) => {
  const bad = [];
  const tb = body(F.get(TEX) || '').replace(/(^|[^\\])%.*$/gm, '$1');
  const a = orgsIn(tb);
  if (a) bad.push(TEX + ': names ' + a);
  const pre = String(F.get(TEX) || '').split('\\begin{document}')[0];
  const b = orgsIn((/\\hypersetup\{[\s\S]*?\}\n/.exec(pre) || [''])[0] + (/\\title\{[^\n]*\}/.exec(pre) || [''])[0] + (/\\author\{[^\n]*\}/.exec(pre) || [''])[0]);
  if (b) bad.push(TEX + ': names ' + b + ' in the title, author or PDF properties');
  if (P.error) bad.push(P.error);
  const c = orgsIn(P.text || '');
  if (c) bad.push('PDF text names ' + c);
  return bad;
});

check('the author, licence and disclosure statements are present, and there is no affiliation, self-title, task for the operator or DOI', (F) => {
  const bad = [];
  const t = F.get(TEX) || '';
  const flat = t.replace(/\s+/g, ' ');
  const authors = macroArgs(t, 'author', 1).map((m) => m.args[0].split('\\\\')[0].trim());
  if (JSON.stringify(authors) !== '["Takuya Nemoto"]') bad.push('the author line is not exactly Takuya Nemoto');
  for (const s of ['\\section*{Disclosure of the use of a language model}', 'Claude Code was used', 'Claude is not an author.', 'The author takes full responsibility for the content.',
    '\\noindent\\textbf{Not legal advice.}', '\\noindent\\textbf{No lawyer has reviewed it.}', '\\noindent\\textbf{Conflict of interest.}', '\\section*{Licence}', 'source are licensed under CC BY 4.0.', 'MIT licence', 'The creative sites are excluded from the case set.']) if (!flat.includes(s)) bad.push('paper lacks: ' + s);
  const disc = (flat.split('\\section*{Disclosure of the use of a language model}')[1] || '').split(/\\section|\\appendix/)[0];
  for (const s of ['Claude Code was used', 'The author is responsible for the content.', 'Claude is not an author.']) if (!disc.includes(s)) bad.push('the disclosure section lacks: ' + s);
  for (const [f, s] of F) {
    if (typeof s !== 'string' || f === 'verification/check.js') continue;
    if (SCHOOL.some((re) => re.test(s))) bad.push(f + ': university name');
    if (TITLES.some((w) => s.toLowerCase().includes(w.toLowerCase()))) bad.push(f + ': self-title or excluded word');
    if (/^README|^CLAUDE|^paper\/.*\.tex$|^CITATION|^\.zenodo/.test(f) && /\b10\.\d{4,9}\/\S+/.test(s)) bad.push(f + ': a DOI is written before one was received');
    if (/^README|^paper\/.*\.tex$/.test(f)) for (const w of TASKS) if (s.includes(w)) bad.push(f + ': gives the operator a task (' + w + ')');
  }
  const cff = F.get('CITATION.cff') || '';
  if (/^\s*affiliation\s*:/m.test(cff)) bad.push('CITATION.cff: affiliation');
  if (/^\s*-?\s*(family-names|name):\s*(Claude|Anthropic)/mi.test(cff)) bad.push('CITATION.cff: Claude as an author');
  if (!cff.includes('Claude は著者ではありません。')) bad.push('CITATION.cff: no disclosure');
  const z = L.json(F, '.zenodo.json');
  if (!z) bad.push('.zenodo.json cannot be read');
  else {
    if (JSON.stringify(z.creators) !== JSON.stringify([{ name: 'Nemoto, Takuya', orcid: '0009-0000-1406-0547' }])) bad.push('.zenodo.json: creators');
    if (z.license !== 'cc-by-4.0') bad.push('.zenodo.json: licence');
    if (!String(z.notes).includes('Claude is not an author.')) bad.push('.zenodo.json: no disclosure');
    if (/affiliation/i.test(F.get('.zenodo.json'))) bad.push('.zenodo.json: affiliation');
  }
  if (!String(F.get('LICENSE')).startsWith('Creative Commons Attribution 4.0 International')) bad.push('LICENSE is not CC BY 4.0');
  if (!String(F.get('LICENSE-CODE')).startsWith('MIT License')) bad.push('LICENSE-CODE is not MIT');
  return bad;
});

check('the README pages follow the writing rules and match each other', (F) => {
  const bad = [];
  const ja = F.get('README.md') || '', en = F.get('README.en.md') || '';
  const heads = (s) => s.split('\n').filter((l) => /^#{1,6} /.test(l)).length;
  if (!ja || !en) return ['README missing'];
  if (heads(ja) !== heads(en)) bad.push('the two READMEs have different numbers of headings');
  const date = (s) => (/(?:最終更新|Last updated)[:：] ?(\d{4}-\d{2}-\d{2})/.exec(s) || [])[1];
  if (!date(ja) || date(ja) !== date(en)) bad.push('the two READMEs have different dates');
  const proseLines = (s) => s.replace(/```[\s\S]*?```/g, '').split('\n').filter((l) => l.trim() && !/^(#|\||>|```|- `|<)/.test(l));
  if (/\*\*/.test(ja) || /\*\*/.test(en)) bad.push('bold text');
  for (const l of proseLines(ja)) {
    if (/[^。）」]$/.test(l.trim()) && !/^- /.test(l) && !/[:：]$/.test(l.trim())) bad.push('README.md: a line that does not end a sentence: ' + l.slice(0, 30));
    if (/(である|だ)。$/.test(l.trim())) bad.push('README.md: plain style: ' + l.slice(0, 30));
  }
  for (const para of ja.split(/\n\s*\n/).concat(en.split(/\n\s*\n/))) if ((para.match(/[―—]/g) || []).length > 1) bad.push('more than one dash in a paragraph');
  if (/\byou(r)?\b/i.test(en.replace(/`[^`]*`/g, ''))) bad.push('README.en.md: second person');
  return bad;
});

check('the workflows pin actions by commit, set permissions, and give write access only where the canonical copies need it', (F) => {
  const bad = [];
  const C = L.json(F, 'verification/copies.json') || { copies: {} };
  const wfs = [...F.keys()].filter((f) => /^\.github\/workflows\/.+\.ya?ml$/.test(f));
  if (wfs.length < 4) bad.push('fewer workflows than expected');
  for (const f of wfs) {
    const t = F.get(f);
    if (!/^permissions:/m.test(t)) bad.push(f + ': no top-level permissions');
    for (const m of t.matchAll(/uses:\s*([^\s#]+)(\s*#\s*\S+)?/g)) if (!/@[0-9a-f]{40}$/.test(m[1]) || !m[2]) bad.push(f + ': action not pinned by commit with its version: ' + m[1]);
    if (!C.copies[f] && /:\s*write\b/.test(t)) bad.push(f + ': write permission in a workflow of this repository');
    if (!C.copies[f] && /persist-credentials/.test(t) === false && /actions\/checkout/.test(t)) bad.push(f + ': checkout keeps credentials');
    if (!/timeout-minutes:/.test(t)) bad.push(f + ': no timeout');
  }
  if (F.has('package.json')) bad.push('package.json: no outside package is used');
  return bad;
});

/* ------------------------------------------------------------ ways to break each check */
const BREAKS = [];
const brk = (i, desc, mut) => BREAKS.push({ name: CHECKS[i].name, desc, mut });
const sub = (f, a, b) => (F) => { const t = F.get(f); if (typeof t !== 'string' || !t.includes(a)) throw new Error('the way to break does not apply: ' + f + ' ' + String(a).slice(0, 30)); F.set(f, t.replace(a, b)); };
const add = (f, s) => (F) => F.set(f, (F.get(f) || '') + s);
const jsub = (f, fn) => (F) => { const j = JSON.parse(F.get(f)); fn(j); F.set(f, JSON.stringify(j)); };
const tex = (a, b) => sub(TEX, a, b);
const texAdd = (s) => sub(TEX, '\\section{Conclusion}', s + '\n\n\\section{Conclusion}');

brk(0, 'change one character of SECURITY.md', sub('SECURITY.md', '7 日以内', '8 日以内'));
brk(0, 'change one word of the empty-issue workflow', sub('.github/workflows/empty-issue.yml', 'waits 10 minutes', 'waits ten minutes'));
brk(0, 'drop a copy from the record', jsub('verification/copies.json', (j) => { delete j.copies['.github/checked-intake/verify.js']; }));
brk(1, 'change one character of a statute quotation', tex('外国にある第三者への提供を認める旨の本人の同意', '外国にある第三者への提供を認める旨の本人の承諾'));
brk(1, 'quote an article that was not fetched', texAdd('\\statq{民法 第710条}{財産以外の損害}\\summ{x}'));
brk(1, 'quote without a summary', texAdd('\\statq{民法 第709条}{故意又は過失によって}'));
brk(1, 'change one character of a recorded text', sub('verification/statutes-texts.json', '故意又は過失によって他人の権利', '故意又は重過失によって他人の権利'));
brk(1, 'name an article in the prose', texAdd('Article 27 of the Act applies.'));
brk(1, 'name an article in Japanese in the prose', texAdd('\\ja{個人情報保護法第27条}'));
brk(1, 'record an article that is never quoted', jsub('verification/statutes.json', (j) => { j.statutes.push(Object.assign({}, j.statutes[0], { label: '第99条' })); }));
brk(2, 'cite an evidence item that does not exist', texAdd('\\srcq{no-such-item}'));
brk(2, 'leave an evidence item uncited', jsub('verification/evidence.json', (j) => { j.items.push({ id: 'unused', repo: 'sophaxis', path: 'README.md' }); }));
brk(2, 'quote Japanese without a summary', tex('\\srcq{sr-never} \\summ{', '\\srcq{sr-never} (\\textit{'));
brk(2, 'use a number that the generator did not make', texAdd('\\nInvented{}'));
brk(2, 'edit numbers.tex by hand', sub('paper/generated/numbers.tex', '\\newcommand{\\nPlaces}{43}', '\\newcommand{\\nPlaces}{42}'));
brk(2, 'edit a quotation in evidence.json without regenerating', jsub('verification/evidence.json', (j) => { j.items[0].quote = j.items[0].quote.replace('contract', 'agreement'); }));
brk(3, 'write a digit in the prose', texAdd('The sites have 12 pages.'));
brk(3, 'write a number as a word', texAdd('The sites have twelve pages.'));
brk(3, 'write a date that is not in the ledger', texAdd('It changed on 2026-11-24.'));
brk(3, 'write a Japanese number', texAdd('\\ja{検査は三つあります。}'));
brk(3, 'write a digit in the README', add('README.en.md', '\nThe paper has 3 parts.\n'));
brk(3, 'change the date of the paper', tex('\\date{23 November 2026}', '\\date{24 November 2026}'));
brk(3, 'a local date that its file does not give', jsub('verification/dates.json', (j) => { j.dates['2026-11-24'] = { local: 'verification/statutes.json', field: 'fetched' }; }));
brk(4, 'state another page count', (F) => { for (const f of ['README.md', 'README.en.md']) F.set(f, F.get(f).replace(/^(- (?:頁数|Pages): )(\d+)$/m, (m, a, n) => a + (Number(n) + 1))); });
brk(4, 'state another word count in one README', (F) => F.set('README.en.md', F.get('README.en.md').replace(/^(- Words[^:]*: )(\d+)$/m, (m, a, n) => a + (Number(n) - 1))));
brk(4, 'change the PDF by one byte', (F) => { const b = Buffer.from(F.get(PDF)); b[b.length - 2] ^= 1; F.set(PDF, b); });
brk(5, 'name a creative site in the paper', texAdd(OTHER_PLACE[0][0].toUpperCase() + OTHER_PLACE[0].slice(1) + ' is excluded.'));
brk(5, 'name a creative site in Japanese in the README', add('README.md', '\n' + OTHER_PLACE[1] + 'は外しています。\n'));
brk(5, 'link a repository outside the case set', add('README.en.md', '\n[x](https://github.com/cpsbvbng26-dotcom/' + OTHER_PLACE[3] + ')\n'));
brk(5, 'link another Vercel site', add('README.md', '\nhttps://example-site.vercel.app/\n'));
brk(5, 'the PDF text names a creative site', (F) => { F.set('(break)', OTHER_PLACE[2]); });
brk(6, 'put the ORCID URL back in the author block', tex('\\author{Takuya Nemoto}', '\\author{Takuya Nemoto\\\\ \\url{https://orcid.org/0009-0000-1406-0547}}'));
brk(6, 'name the language-model vendor in the disclosure', tex('Claude Code was used for this paper', 'Claude Code (Anthropic) was used for this paper'));
brk(6, 'name the law database in the Japanese abstract', tex('条文を政府の法令データベースから', '条文を e-Gov 法令 API から'));
brk(6, 'name a code-hosting company in the prose', texAdd('The issues are kept on GitHub.'));
brk(6, 'name a government body in Japanese', texAdd('\\ja{個人情報保護委員会の資料}'));
brk(6, 'the PDF text names an organisation (from a quotation)', (F) => { F.set('(break)', 'Anthropic, United States'); });
brk(7, 'add Claude as an author', tex('\\author{Takuya Nemoto', '\\author{Takuya Nemoto \\and Claude'));
brk(7, 'remove the disclosure', tex('The author is responsible for the content. Claude is not an author.', 'The author is responsible for the content.'));
brk(7, 'remove the statement that it is not legal advice', tex('\\noindent\\textbf{Not legal advice.}', '\\noindent\\textbf{Advice.}'));
brk(7, 'write an affiliation in CITATION.cff', sub('CITATION.cff', '    orcid: https://orcid.org/0009-0000-1406-0547', '    orcid: https://orcid.org/0009-0000-1406-0547\n    affiliation: X'));
brk(7, 'write a self-title', add('README.en.md', '\n' + TITLES[1] + '\n'));
brk(7, 'write a DOI that was not received', add('README.en.md', '\nDOI 10.2139/ssrn.0000000\n'));
brk(7, 'give the operator a task', add('README.md', '\nSSRN への投稿は利用者の手作業です。\n'));
brk(7, 'change the licence of the record', jsub('.zenodo.json', (j) => { j.license = 'mit'; }));
brk(7, 'remove the sentence that excludes the creative sites', tex('The creative sites are excluded from the case set.', 'Some sites are excluded.'));
brk(8, 'add bold text', add('README.md', '\n**大事です。**\n'));
brk(8, 'write in the plain style', add('README.md', '\nこの稿は事例研究である。\n'));
brk(8, 'second person in English', add('README.en.md', '\nYou can read the paper.\n'));
brk(8, 'change the date of one README', sub('README.en.md', 'Last updated: ', 'Last updated: 2000-01-01, '));
brk(8, 'two dashes in a paragraph', add('README.md', '\n検査 ― 機械 ― です。\n'));
brk(8, 'a heading only in one language', add('README.en.md', '\n## Extra\n'));
brk(9, 'call an action by its version name', sub('.github/workflows/verify.yml', /actions\/checkout@[0-9a-f]{40}/.exec(String(require('fs').readFileSync(require('path').join(L.ROOT, '.github/workflows/verify.yml'))))[0], 'actions/checkout@v7'));
brk(9, 'give write access in a workflow of this repository', sub('.github/workflows/verify.yml', 'contents: read', 'contents: write'));
brk(9, 'remove the permissions', sub('.github/workflows/statutes.yml', '\npermissions:\n  contents: read\n', '\n'));
brk(9, 'add package.json', (F) => F.set('package.json', '{}'));

function run(F, P) { return CHECKS.map((c) => ({ name: c.name, bad: c.fn(F, P) })); }

if (require.main === module) {
  const F = L.load();
  const P = pdfFacts(F);
  if (process.argv.includes('--break')) {
    let missed = 0;
    for (const b of BREAKS) {
      const G = new Map(F);
      let caught = false, err = null;
      try {
        b.mut(G);
        const Q = G.has('(break)') ? Object.assign({}, P, { text: (P.text || '') + ' ' + G.get('(break)') }) : G.get(PDF) === F.get(PDF) ? P : pdfFacts(G);
        G.delete('(break)');
        caught = CHECKS.find((c) => c.name === b.name).fn(G, Q).length > 0;
      } catch (e) { err = e.message; }
      console.log((caught ? '  caught  ' : '  MISSED  ') + b.desc + (err ? ' -- ' + err : ''));
      if (!caught) missed++;
    }
    const without = CHECKS.filter((c) => !BREAKS.some((b) => b.name === c.name));
    for (const c of without) console.log('  NO BREAK  ' + c.name);
    console.log('\n' + BREAKS.length + ' ways to break, ' + (BREAKS.length - missed) + ' caught. Checks without a way to break: ' + without.length + '.');
    process.exit(missed || without.length ? 1 : 0);
  }
  let fail = 0;
  for (const r of run(F, P)) {
    console.log((r.bad.length ? '  FAIL  ' : '  ok    ') + r.name);
    for (const b of r.bad.slice(0, 12)) console.log('          ' + b);
    if (r.bad.length) fail++;
  }
  console.log('\n' + CHECKS.length + ' checks, ' + (CHECKS.length - fail) + ' passed.');
  process.exit(fail ? 1 : 0);
}
module.exports = { CHECKS, BREAKS, prose, macroArgs };
