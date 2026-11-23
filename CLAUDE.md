# site-legal-risk

SSRN に出す稿 "Legal Risk Management by Domain for Website Operation in the Age of AI: A Case Study of a Single Operator's Sites"
（「AI 時代のサイト運営における分野ごとの法務リスク管理：一人の運営者の事例研究」）の原稿・PDF・台本・検査。2026-11-23 に利用者が求めた。
本文は英語、要旨は英語と日本語。研究の側のリポジトリで、10 リポジトリの外に置く（golden-window-resolution と同じ扱い）。

## 決めごと

1. **DOI を推測で埋めない**。SSRN への提出は運営者のアカウントで行う。Claude には触れられない。番号を受け取るまで、README・CITATION.cff・.zenodo.json・稿に DOI を書かない。`check.js` が止める。
2. **条文は、e-Gov 法令 API から取り寄せた文だけを引く**。法令の番号は cpsbvbng26-dotcom の `verification/statutes.json` から取り、記憶から書かない。取り寄せは `node tools/statutes.js --record`。稿の引用は `\statq{法令 第N条}{文}` だけで書き、直後に `\summ{...}`（"Summary, not a translation"）を置く。記していない条を地の文に挙げると落ちる。外国の法令は引かない（取り寄せた写しが無い）。
3. **数を手で書かない**。稿の数は `scripts/generate.js` が兄弟のリポジトリの固定したコミットから出し、`\n<Key>{}` で印字する。地の文の数字・英語の数の語・日本語の数は、日付の台帳（`verification/dates.json`）と決まった形のほかは落ちる。
4. **引用と出典は台帳から**。リポジトリの文は `verification/evidence.json` に載せ、稿では `\srcq{id}`・`\ev{id}`・`\citeev{id}` で書く。`check_sources.js` が、固定したコミットのファイルに文があること、コミットが main にあること、PR がマージされたことを照らす。台帳に載せて使わない項目があれば落ちる。
5. **生成物を手で直さない**。`paper/generated/` と `verification/numbers.json` は `node scripts/generate.js` が書く。
6. **PDF を組み直したら、README（日英）の頁数・語数・SHA-256 を同じコミットで直す**。`paper/build.sh` で組む（LuaLaTeX、`texlive-luatex` と IPAGothic が要る）。SSRN に出した版は凍結し、誤りは正誤表と self-correction に記録する。
7. **運営者のほかの創作の場の名を書かない。リンクもしない**。事例から外したことだけを、名を挙げずに書く。使わない語は `verification/check.js` に符号で置いてある。所属・大学の名・自称の肩書きも書かない。
8. **存命の人物は「両親」という語までにする**（cpsbvbng26-dotcom の決めごと 10）。
9. **言語モデル利用の開示は消さない。Claude を著者にしない。** 稿は法的な助言ではないこと、弁護士が見ていないこと、著者が運営者であること（利益相反）を書く。消すと `check.js` が落ちる。
10. 稿と散文は CC BY 4.0、台本と検査は MIT。勝手に変えない。
11. `SECURITY.md`・`.github/ISSUE_TEMPLATE/error-report.yml`・`.github/checked-intake/verify.js`・`.github/workflows/checked-intake.yml`・`.github/workflows/empty-issue.yml` は cpsbvbng26-dotcom の正本と一字一句同じ写し。ここでは直さない。sha256 は `verification/copies.json`。
12. **検査の期待値を、通すために変えない**。検査を足したら `--break` の壊し方も足す。壊し方の無い検査があれば `--break` が落ちる。
13. 外のパッケージを足さない。`package.json` を置かない。アクションはコミットの値で固め、版を注釈に書く。
14. 枝を切って PR にする。コミットは種別ごとに分ける（原稿・PDF・台本・検査・文書）。マージの本文に開示の二行を入れる。
15. **Claude は利用者に命令しない**（cpsbvbng26-dotcom の決めごと 16）。SSRN・Zenodo のように Claude に触れられないものは、触れられないという事実だけを書く。
16. **issue の中身を言語モデルに渡すのは、本人の同意がある題と本文だけ**（同じく決めごと 17）。
17. **合っているかを、最低 10 回確かめる**（同じく決めごと 18）。公開の前に、稿の全体を出典に対して敵対的に読み直す。
18. **稿は、著者が創設したもののほかの団体の名を書かない。** 2026-11-23 に利用者が決めた：「論文の注意点、自分が創設したもの以外つまり団体名は一切かかないでね」。
    会社・出版社・大学・学会・官庁・団体が運営する場（ホスティング、コードの置き場、預け先、DOI の登録機関、プレプリントの場、政府の法令データベース、言語モデルの事業者）・登録簿の名を、
    稿の本文・引用・表・著者の欄・PDF の文に書かず、「a code-hosting platform」「the government's official law database」のように一般の語で書く。
    法令の名と条の番号は団体ではないので残す。製品の名「Claude Code」と「Claude」は開示に要るので残し、事業者の名は書かない。
    ライセンスの名「CC BY 4.0」と「MIT License」は法的な文書の名として残す（決めごと 10 のライセンスを正確に示すため。2026-11-23 に Claude が決めた）。
    著者の欄に ORCID の URL を置かない（README と CITATION.cff には置く）。README は稿ではないので、所在を言うのに要る名と URL を書いてよい。
    `check.js` が、出典と運営者のリポジトリに出てくる団体の名の表（`ORGS`）で、稿の本文と PDF の文を照らす。著者の場の名（Sophaxis ほか）は表に入れない。

```
node scripts/generate.js                       # 数・表・引用を兄弟のリポジトリから作り直す（SIBLINGS=<dir>、既定は親）
node verification/check.js [--break]           # 引用・数・PDF・名・開示・README・ワークフロー（要: pdfinfo・pdftotext）
node verification/check_sources.js [--break]   # 固定したコミット・ファイル・文・コミット・PR・生成物・正本の条文と写し
node tools/statutes.js [--record]              # 条文を取り寄せ直して比べる（要: laws.e-gov.go.jp）
sh paper/build.sh                              # PDF を組む
```
