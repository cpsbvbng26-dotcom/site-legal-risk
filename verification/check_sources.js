#!/usr/bin/env node
/* The checks that read the sibling repositories (with git, at the pinned commits).
 *
 *   node verification/check_sources.js           every check passes
 *   node verification/check_sources.js --break   every check fails when its input is broken (a check without a way
 *                                                to break it also fails the run)
 *
 * The sibling repositories are in SIBLINGS (an environment variable) or the parent directory. In CI they are checked
 * out with their whole history.
 *
 * Each check is a pure function of a context object (what was read), so that --break can change a copy of the
 * context and run the same function.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./lib');
const G = require('../scripts/generate');

function context() {
  const F = L.load();
  const E = L.json(F, 'verification/evidence.json');
  const ctx = { F, E, repos: {}, items: {}, prs: {}, gen: null, genErr: null, canon: null, copiesAt: {}, copiesMain: {} };
  for (const [repo, commit] of Object.entries(E.repos)) {
    ctx.repos[repo] = { commit, exists: L.commitExists(repo, commit), onMain: L.onMain(repo, commit) };
    ctx.prs[repo] = L.mergedPRs(repo);
  }
  for (const x of E.items) {
    const r = { item: x };
    if (x.path) r.text = L.show(x.repo, E.repos[x.repo], x.path);
    if (x.commit) { r.exists = L.commitExists(x.repo, x.commit); r.onMain = r.exists && L.onMain(x.repo, x.commit); }
    ctx.items[x.id] = r;
  }
  try { ctx.gen = G.build().out; } catch (e) { ctx.genErr = e.message; }
  const c = L.show('cpsbvbng26-dotcom', E.repos['cpsbvbng26-dotcom'], 'verification/statutes.json');
  ctx.canon = c === null ? null : JSON.parse(c);
  const C = L.json(F, 'verification/copies.json');
  const mainRef = L.mainRef('cpsbvbng26-dotcom');
  for (const f of Object.keys(C.copies)) {
    ctx.copiesAt[f] = L.git('cpsbvbng26-dotcom', ['show', C.commit + ':' + f]);
    ctx.copiesMain[f] = L.git('cpsbvbng26-dotcom', ['show', mainRef + ':' + f]);
  }
  return ctx;
}

const CHECKS = [];
const check = (name, fn) => CHECKS.push({ name, fn });

check('every pinned commit exists and is on the main branch of its repository', (ctx) => {
  const bad = [];
  for (const [repo, r] of Object.entries(ctx.repos)) {
    if (!/^[0-9a-f]{40}$/.test(r.commit)) bad.push(repo + ': not a full commit id');
    else if (!r.exists) bad.push(repo + ': commit not found (is the repository in SIBLINGS?)');
    else if (!r.onMain) bad.push(repo + ': commit not on main');
  }
  return bad;
});

check('every cited file exists at the pinned commit, and every quotation occurs in it', (ctx) => {
  const bad = [];
  for (const r of Object.values(ctx.items)) {
    const x = r.item;
    if (!x.path) continue;
    if (!ctx.E.repos[x.repo]) { bad.push(x.id + ': repository not pinned'); continue; }
    if (r.text === null || r.text === undefined) { bad.push(x.id + ': ' + x.repo + ':' + x.path + ' not found'); continue; }
    if (x.quote !== undefined && !L.normalise(x.path, r.text).includes(L.ws(x.quote))) bad.push(x.id + ': quotation not found in ' + x.repo + ':' + x.path);
    if (x.quote !== undefined && !['en', 'ja'].includes(x.lang)) bad.push(x.id + ': no language');
  }
  return bad;
});

check('every cited commit exists and is on main, and every cited pull request was merged into main', (ctx) => {
  const bad = [];
  for (const r of Object.values(ctx.items)) {
    const x = r.item;
    if (x.commit && !/^[0-9a-f]{40}$/.test(x.commit)) bad.push(x.id + ': not a full commit id');
    else if (x.commit && !r.exists) bad.push(x.id + ': commit not found');
    else if (x.commit && !r.onMain) bad.push(x.id + ': commit not on main');
    if (x.pr !== undefined) {
      const s = ctx.prs[x.repo];
      if (!s) bad.push(x.id + ': cannot read the merges of ' + x.repo);
      else if (!s.has(x.pr)) bad.push(x.id + ': pull request #' + x.pr + ' not merged into main of ' + x.repo);
    }
    if (!x.path && !x.commit && x.pr === undefined) bad.push(x.id + ': cites nothing');
  }
  return bad;
});

check('the generated numbers, tables and quotations equal what scripts/generate.js computes from the sources', (ctx) => {
  if (ctx.genErr) return ['the generator failed: ' + ctx.genErr];
  const bad = [];
  for (const [f, t] of Object.entries(ctx.gen)) if (ctx.F.get(f) !== t) bad.push(f + ' differs from the generator');
  return bad;
});

check('each statute text recorded here is the same as the copy that cpsbvbng26-dotcom recorded, where it has one', (ctx) => {
  if (!ctx.canon) return ['cannot read cpsbvbng26-dotcom verification/statutes.json'];
  const T = L.json(ctx.F, 'verification/statutes-texts.json') || {};
  const S = L.json(ctx.F, 'verification/statutes.json') || { statutes: [] };
  const bad = [];
  for (const e of S.statutes) {
    const k = e.law + ' ' + e.label;
    const c = ctx.canon['条文'][k];
    if (!c) { bad.push(k + ': not in the canonical file (no second copy to compare with)'); continue; }
    if (c['e-Gov'] !== e.law_id) bad.push(k + ': law number differs from the canonical file');
    if (c['文'] !== T[k]) bad.push(k + ': text differs from the canonical copy');
  }
  return bad;
});

check('the recorded hashes of the copies are those of the canonical files at the recorded commit and on main', (ctx) => {
  const C = L.json(ctx.F, 'verification/copies.json');
  if (!C) return ['copies.json cannot be read'];
  const bad = [];
  for (const [f, h] of Object.entries(C.copies)) {
    if (ctx.copiesAt[f] === null || L.sha(ctx.copiesAt[f]) !== h) bad.push(f + ': not the canonical file at ' + C.commit.slice(0, 7));
    if (ctx.copiesMain[f] === null || L.sha(ctx.copiesMain[f]) !== h) bad.push(f + ': the canonical file on main has changed');
  }
  return bad;
});

/* ------------------------------------------------------------ ways to break each check */
const BREAKS = [];
const brk = (i, desc, mut) => BREAKS.push({ name: CHECKS[i].name, desc, mut });
const clone = (ctx) => Object.assign({}, ctx, { repos: JSON.parse(JSON.stringify(ctx.repos)), items: Object.fromEntries(Object.entries(ctx.items).map(([k, v]) => [k, Object.assign({}, v, { item: Object.assign({}, v.item) })])), prs: Object.fromEntries(Object.entries(ctx.prs).map(([k, v]) => [k, v && new Set(v)])), F: new Map(ctx.F), gen: ctx.gen && Object.assign({}, ctx.gen), copiesAt: Object.assign({}, ctx.copiesAt), copiesMain: Object.assign({}, ctx.copiesMain), canon: ctx.canon && JSON.parse(JSON.stringify(ctx.canon)) });
const item = (id, fn) => (c) => fn(c.items[id]);

brk(0, 'pin a commit that is not on main', (c) => { c.repos.sophaxis.onMain = false; });
brk(0, 'pin a commit that does not exist', (c) => { c.repos['errata-check'].exists = false; });
brk(0, 'pin a short commit id', (c) => { c.repos['deposit-check'].commit = '6fc9c87'; });
brk(1, 'change one word of a quotation', item('disc-art28', (r) => { r.item.quote = r.item.quote.replace('Article 28', 'Article 27'); }));
brk(1, 'change one character of a Japanese quotation', item('claude-people', (r) => { r.item.quote = r.item.quote.replace('両親', '家族'); }));
brk(1, 'cite a file that does not exist', item('sr-never', (r) => { r.text = null; }));
brk(1, 'the source file no longer has the sentence', item('sx-notice', (r) => { r.text = r.text.replace('at least 14 days ahead', 'at least 7 days ahead'); }));
brk(2, 'cite a pull request that was not merged', item('pr-lg-1', (r) => { r.item.pr = 2; }));
brk(2, 'cite a commit that is not on main', item('c-cps-kinship', (r) => { r.onMain = false; }));
brk(2, 'cite a commit that does not exist', item('c-sx-notice', (r) => { r.exists = false; }));
brk(2, 'cite nothing', item('pr-rc-4', (r) => { delete r.item.pr; }));
brk(3, 'edit a generated number by hand', (c) => { c.F.set('paper/generated/numbers.tex', c.F.get('paper/generated/numbers.tex').replace('\\newcommand{\\nPlaces}{43}', '\\newcommand{\\nPlaces}{44}')); });
brk(3, 'edit a generated quotation by hand', (c) => { c.F.set('paper/generated/quotes.lua', c.F.get('paper/generated/quotes.lua').replace('not an offer of a contract', 'not a contract')); });
brk(3, 'the source moves under the pin (generator output changes)', (c) => { c.gen['verification/numbers.json'] = c.gen['verification/numbers.json'].replace('"value": 690', '"value": 691'); });
brk(4, 'a recorded statute text differs from the canonical copy', (c) => { c.canon['条文']['民法 第709条']['文'] = c.canon['条文']['民法 第709条']['文'].replace('故意又は過失', '故意又は重過失'); });
brk(4, 'a law number differs', (c) => { c.canon['条文']['刑法 第230条']['e-Gov'] = '140AC0000000046'; });
brk(5, 'the canonical file changed on main', (c) => { c.copiesMain['SECURITY.md'] = c.copiesMain['SECURITY.md'] + '\n'; });
brk(5, 'the recorded hash is not that of the canonical file', (c) => { c.copiesAt['.github/workflows/empty-issue.yml'] = 'x'; });

if (require.main === module) {
  const ctx = context();
  if (process.argv.includes('--break')) {
    let missed = 0;
    for (const b of BREAKS) {
      const c = clone(ctx);
      let caught = false, err = null;
      try { b.mut(c); caught = CHECKS.find((x) => x.name === b.name).fn(c).length > 0; } catch (e) { err = e.message; }
      console.log((caught ? '  caught  ' : '  MISSED  ') + b.desc + (err ? ' -- ' + err : ''));
      if (!caught) missed++;
    }
    const without = CHECKS.filter((c) => !BREAKS.some((b) => b.name === c.name));
    for (const c of without) console.log('  NO BREAK  ' + c.name);
    console.log('\n' + BREAKS.length + ' ways to break, ' + (BREAKS.length - missed) + ' caught. Checks without a way to break: ' + without.length + '.');
    process.exit(missed || without.length ? 1 : 0);
  }
  let fail = 0;
  for (const c of CHECKS) {
    const bad = c.fn(ctx);
    console.log((bad.length ? '  FAIL  ' : '  ok    ') + c.name);
    for (const b of bad) console.log('          ' + b);
    if (bad.length) fail++;
  }
  console.log('\n' + CHECKS.length + ' checks, ' + (CHECKS.length - fail) + ' passed.');
  process.exit(fail ? 1 : 0);
}
module.exports = { CHECKS, BREAKS };
