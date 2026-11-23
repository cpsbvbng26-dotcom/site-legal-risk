# AI 時代のサイト運営における分野ごとの法務リスク管理

最終更新：2026-11-23（日本時間）。

English: [README.en.md](README.en.md)。

この頁は、稿 "Legal Risk Management by Domain for Website Operation in the Age of AI: A Case Study of a Single Operator's Sites"（「AI 時代のサイト運営における分野ごとの法務リスク管理：一人の運営者の事例研究」）の原稿と PDF と検査を置いたリポジトリの案内です。
本文は英語で、要旨は英語と日本語です。
著者は根本卓哉（[ORCID](https://orcid.org/0009-0000-1406-0547)）です。

## 稿

稿は、運営者の研究の側のサイトとリポジトリを事例にして、法の分野ごとに、危険、サイトの扱い、機械による確かめ、残る危険を並べます。
分野は、著作権・意匠・商標、個人情報（issue の題と本文を国外の言語モデルの事業者に渡すことを含む）、投稿と削除、人についての記載、利用規約と契約の条項、見やすさ、提供する地域、言語モデルの使用に固有の危険です。
証拠は、運営者の規程と、法令の点検の記録と、変更のたびに走る検査です。
どれも、リポジトリ・ファイル・コミット・プルリクエストで示します。

- PDF：[paper/site-legal-risk.pdf](paper/site-legal-risk.pdf)
- 原稿：[paper/site-legal-risk.tex](paper/site-legal-risk.tex)
- 頁数: 22
- 語数（pdftotext の出力を空白で区切った数）: 10506
- SHA-256: `705ca437da1f28666705f548363ca33639e97a4bd6e553e88130c17ad5633cb9`

キーワード：legal risk management、website operation、compliance as code、personal information、cross-border data transfer、generative AI、Japanese law、case study。

SSRN の分類の候補は、法学（情報法、データ保護、知的財産、法と技術・AI の、法令遵守の事例研究）です。
副は情報システム（compliance as code の部分）です。
SSRN のネットワークでいえば、Legal Scholarship Network と、副として Information Systems に当たります。
この名は、SSRN のいまの一覧と照らしていません。
作業の環境から SSRN を読めないためです。
同じ理由で、eJournal の名は挙げていません。

## 提出と DOI

SSRN への提出は、運営者のアカウントで行うものです。
Claude は、そのアカウントに触れられません。
DOI はまだ受け取っていません。
受け取るまで、この頁にも稿にも番号を書きません。

## 断り

稿は法的な助言ではありません。
弁護士は、稿も、稿が扱うサイトも見ていません。
著者は、稿が扱うサイトとリポジトリの運営者です。
稿は、この利益相反を本文に書いています。
運営者のほかの創作の場は、事例から外しています。
研究の系列からその場の名を挙げず、リンクもしない決まりがあるからです。

## 数と引用の確かめ方

稿の数は、`scripts/generate.js` が、`verification/evidence.json` に固定したコミットのリポジトリから出します。
稿が引く運営者の文も、同じ台帳から印字します。
条文は、e-Gov 法令 API から取り寄せた文だけを引きます。
取り寄せた文と SHA-256 は `verification/statutes-texts.json` と `verification/statutes.json` にあります。

```
node scripts/generate.js
node verification/check.js
node verification/check.js --break
node verification/check_sources.js
node verification/check_sources.js --break
node tools/statutes.js
sh paper/build.sh
```

`check.js` は、引用・数・PDF の頁数と語数と SHA-256・名・開示・README・ワークフローを見ます。
`check_sources.js` は、固定したコミット・ファイル・引いた文・コミット・プルリクエスト・生成物・条文の写し・正本の写しを、兄弟のリポジトリと照らします。
どちらも、`--break` で検査を壊し、落ちることを確かめます。
PDF は `This is LuaHBTeX, Version 1.17.0 (TeX Live 2023/Debian)` と IPAGothic で組みました。
同じ版で組めば、同じ PDF になります。

## 開示

言語モデル Claude Code（Anthropic）を使いました。
リポジトリを読むこと、条文を取り寄せて記すこと、数と引用と出典を照らす台本を書くこと、本文の下書きに使いました。
責任は著者が負います。
Claude は著者ではありません。

## ライセンス

稿と原稿と散文は [CC BY 4.0](LICENSE) です。
台本と検査は [MIT](LICENSE-CODE) です。
引いた条文と、ほかの人の文は、それぞれの持ち主のものです。
誤りの知らせは、このリポジトリの issue の様式で受けます。
安全の問題は [SECURITY.md](SECURITY.md) にある道で受けます。
