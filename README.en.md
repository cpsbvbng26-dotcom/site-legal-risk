# Legal Risk Management by Domain for Website Operation in the Age of AI

Last updated: 2026-11-23 (Japan time).

Japanese: [README.md](README.md).

This repository holds the source, the PDF and the checks of the paper "Legal Risk Management by Domain for Website Operation in the Age of AI: A Case Study of a Single Operator's Sites".
The body is in English, with abstracts in English and Japanese.
The author is Takuya Nemoto ([ORCID](https://orcid.org/0009-0000-1406-0547)).

## The paper

The paper takes the operator's research-side sites and repositories as a case and sets out, for each legal domain, the risk, what the sites do, how it is checked by machine, and what remains.
The domains are copyright, designs and trademarks; personal information, including giving the title and text of issues to a language-model vendor abroad; content submitted by others and its removal; statements about people; terms of use and contract terms; accessibility; territorial scope; and risks from the use of a language model.
The evidence is the operator's policies, the records of legal audits, and the checks that run on every change.
Each is cited by repository, file, commit or pull request.

- PDF: [paper/site-legal-risk.pdf](paper/site-legal-risk.pdf)
- Source: [paper/site-legal-risk.tex](paper/site-legal-risk.tex)
- Pages: 22
- Words (tokens of the pdftotext output separated by white space): 10506
- SHA-256: `705ca437da1f28666705f548363ca33639e97a4bd6e553e88130c17ad5633cb9`

Keywords: legal risk management, website operation, compliance as code, personal information, cross-border data transfer, generative AI, Japanese law, case study.

The suggested SSRN classification is law, as a compliance case study in information and cyber law, data protection, intellectual property, and law and technology (AI).
The secondary area is information systems, for the part on compliance as code.
At the level of SSRN's networks, this is the Legal Scholarship Network and, secondarily, Information Systems.
These names were not checked against SSRN's current list.
SSRN could not be read from the environment in which the paper was prepared.
For the same reason, no eJournal is named.

## Submission and DOI

Submission to SSRN is made from the operator's account.
Claude has no access to that account.
No DOI has been received.
Until one is received, no number is written here or in the paper.

## Statements

The paper is not legal advice.
No lawyer has reviewed the paper or the sites it studies.
The author operates the sites and repositories that the paper studies.
The paper states this conflict of interest.
The operator's creative sites are excluded from the case set.
A rule of the research series is that they are not named or linked from it.

## How numbers and quotations are checked

The numbers of the paper are computed by `scripts/generate.js` from the repositories at the commits pinned in `verification/evidence.json`.
The operator's sentences that the paper quotes are printed from the same registry.
Statutes are quoted only from texts fetched from the e-Gov law API.
The fetched texts and their SHA-256 are in `verification/statutes-texts.json` and `verification/statutes.json`.

```
node scripts/generate.js
node verification/check.js
node verification/check.js --break
node verification/check_sources.js
node verification/check_sources.js --break
node tools/statutes.js
sh paper/build.sh
```

`check.js` checks the quotations, the numbers, the page count, word count and SHA-256 of the PDF, the names, the disclosure, the README pages and the workflows.
`check_sources.js` checks the pinned commits, files, quoted sentences, commits, pull requests, generated files, statute copies and canonical copies against the sibling repositories.
Each breaks its checks on purpose with `--break` and requires them to fail.
The PDF was typeset with `This is LuaHBTeX, Version 1.17.0 (TeX Live 2023/Debian)` and IPAGothic.
The same versions give the same PDF.

## Disclosure

Claude Code (Anthropic) was used.
It read the repositories, fetched and recorded the statutes, wrote the scripts that check the numbers, quotations and sources, and drafted the text.
The author is responsible for the content.
Claude is not an author.

## Licence

The paper, its source and the prose are under [CC BY 4.0](LICENSE).
The scripts and checks are under the [MIT License](LICENSE-CODE).
Statutes and other texts by others that are quoted remain their owners'.
Errors can be reported with the issue form of this repository.
Security issues go through [SECURITY.md](SECURITY.md).
