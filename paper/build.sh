#!/bin/sh
# Builds paper/site-legal-risk.pdf from the LaTeX source, reproducibly.
# The dates in the PDF are fixed to the date of the paper, 2026-11-23 00:00 UTC (SOURCE_DATE_EPOCH), the PDF's ID is
# blanked in the source, and the PDF is typeset three times so that references settle. The same TeX Live and fonts give the same bytes;
# the README records the TeX version used. Generated inputs (paper/generated/) come from scripts/generate.js.
set -eu
cd "$(dirname "$0")"
SOURCE_DATE_EPOCH=1795392000
FORCE_SOURCE_DATE=1
export SOURCE_DATE_EPOCH FORCE_SOURCE_DATE
for i in 1 2 3; do
  lualatex -interaction=nonstopmode -halt-on-error site-legal-risk.tex > /dev/null
done
rm -f site-legal-risk.aux site-legal-risk.log site-legal-risk.out
sha256sum site-legal-risk.pdf
