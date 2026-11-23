#!/bin/sh
# Writes the page count, word count and SHA-256 of the PDF, and the TeX version, into both README pages.
# The word count is the number of tokens separated by white space (JavaScript's \s) in the pdftotext output, the same
# count that verification/check.js makes.
set -eu
cd "$(dirname "$0")/.."
PDF=paper/site-legal-risk.pdf
PAGES=$(pdfinfo "$PDF" | sed -n 's/^Pages: *//p')
WORDS=$(pdftotext -enc UTF-8 "$PDF" - | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(s.split(/\s+/).filter(Boolean).length))')
SHA=$(sha256sum "$PDF" | cut -d' ' -f1)
TEXV=$(lualatex --version | head -1)
for f in README.md README.en.md; do
  node -e '
    const fs=require("fs");const [f,p,w,h,v]=process.argv.slice(1);let t=fs.readFileSync(f,"utf8");
    t=t.replace(/^(- (?:頁数|Pages): ).*$/m,"$1"+p).replace(/^(- (?:語数|Words)[^:]*: ).*$/m,"$1"+w).replace(/^(- SHA-256: `)[^`]*(`)$/m,"$1"+h+"$2").replace(/`(?:TEXVERSION|This is LuaHBTeX[^`]*)`/,"`"+v+"`");
    fs.writeFileSync(f,t);' "$f" "$PAGES" "$WORDS" "$SHA" "$TEXV"
done
echo "pages $PAGES, words $WORDS, sha256 $SHA"
