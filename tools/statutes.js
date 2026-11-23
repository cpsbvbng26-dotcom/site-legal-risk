#!/usr/bin/env node
/* The Japanese statutes that the paper quotes, fetched from the e-Gov law API and compared with the record.
 *
 * Each article in verification/statutes.json is fetched from
 * https://laws.e-gov.go.jp/api/1/articles;lawId=<id>;article=<n> and reduced to plain characters (ruby readings and
 * tags dropped, white space collapsed). This is the same reduction that legal-and-governance's tools/statutes.js uses,
 * and the functions plain, sha and articleText below are taken from that file unchanged.
 * The law numbers (lawId) were copied from cpsbvbng26-dotcom's verification/statutes.json; none is written from memory.
 *
 *   node tools/statutes.js            fetch again and compare with the record; exit 1 on any difference
 *   node tools/statutes.js --record   write the fetched texts (verification/statutes-texts.json), their SHA-256 and
 *                                     the date (JST) of the fetch (verification/statutes.json)
 *
 * The weekly workflow (.github/workflows/statutes.yml) runs the comparison only. It writes nothing and opens no issue;
 * a difference fails the run, and the record is changed only by a commit in a pull request.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'verification', 'statutes.json');
const TEXTS = path.join(ROOT, 'verification', 'statutes-texts.json');
const UA = 'site-legal-risk statutes check (+https://github.com/cpsbvbng26-dotcom/site-legal-risk)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const plain = (x) => x.replace(/<Rt>[^<]*<\/Rt>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const sha = (x) => crypto.createHash('sha256').update(x, 'utf8').digest('hex');
const today = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

/* Pure: the plain text of an article answer, or of some of its items. */
function articleText(xml, num, items) {
  const m = new RegExp('<Article[^>]*\\sNum="' + num + '"[^>]*>[\\s\\S]*?</Article>').exec(xml);
  if (!m) return null;
  if (!items) return plain(m[0]);
  const parts = items.map((n) => (new RegExp('<Item[^>]*\\sNum="' + n + '"[^>]*>[\\s\\S]*?</Item>').exec(m[0]) || [null])[0]);
  return parts.every(Boolean) ? parts.map(plain).join('\n') : null;
}

async function get(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(90000) });
      if (r.ok) return await r.text();
      if (r.status < 500 && r.status !== 429) throw new Error('HTTP ' + r.status);
    } catch (e) { if (i === 2) throw e; }
    await sleep(4000 * (i + 1));
  }
  throw new Error('no answer');
}

async function main() {
  const record = process.argv.includes('--record');
  const conf = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const texts = fs.existsSync(TEXTS) ? JSON.parse(fs.readFileSync(TEXTS, 'utf8')) : {};
  const results = [];
  for (const e of conf.statutes) {
    const key = e.law + ' ' + e.label;
    try {
      const xml = await get('https://laws.e-gov.go.jp/api/1/articles;lawId=' + e.law_id + ';article=' + e.article);
      await sleep(1200);
      const code = (/<Code>(\d+)<\/Code>/.exec(xml) || [])[1];
      const text = code === '0' ? articleText(xml, e.article, e.items) : null;
      if (text === null) { results.push({ key, state: 'missing' }); continue; }
      const h = sha(text);
      if (record) { e.sha256 = h; texts[key] = text; }
      results.push({ key, state: h === e.sha256 && texts[key] === text ? 'same' : 'changed' });
    } catch (err) { results.push({ key, state: 'failed', note: String(err.message || err) }); }
  }
  if (record) {
    conf.fetched = today();
    fs.writeFileSync(FILE, JSON.stringify(conf, null, 2) + '\n');
    fs.writeFileSync(TEXTS, JSON.stringify(texts, null, 2) + '\n');
  }
  for (const r of results) console.log(r.state.padEnd(8) + ' ' + r.key + (r.note ? '  (' + r.note + ')' : ''));
  const odd = results.filter((r) => r.state !== 'same');
  console.log('\n' + results.length + ' checked, ' + odd.length + ' differ from the record.');
  if (odd.length && !record) process.exit(1);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(2); });
module.exports = { plain, sha, articleText };
