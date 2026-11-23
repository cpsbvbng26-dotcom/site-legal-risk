-- Typesetting helpers for the paper (LuaLaTeX, no Japanese TeX package).
-- emit(s, ja): prints s with the characters that TeX treats specially turned into \char, and, when ja is true, with a
-- line-break opportunity after each CJK character, except before closing punctuation and after opening brackets.
-- srcq(id): prints the quotation of an evidence item from generated/quotes.lua, with its source.
local Q = dofile("generated/quotes.lua")

local SPECIAL = { [35]=true, [36]=true, [37]=true, [38]=true, [92]=true, [94]=true, [95]=true, [123]=true, [125]=true, [126]=true }
local NOBREAK_BEFORE = { ["、"]=true, ["。"]=true, ["」"]=true, ["』"]=true, ["）"]=true, ["・"]=true, ["："]=true, ["，"]=true, ["．"]=true }
local NOBREAK_AFTER = { ["「"]=true, ["『"]=true, ["（"]=true }

local function cjk(c) return c >= 0x3000 and c <= 0x9FFF or c >= 0xFF00 and c <= 0xFFEF end

function emit(s, ja, paths)
  local cs = {}
  for _, c in utf8.codes(s) do cs[#cs + 1] = c end
  local out = {}
  for i, c in ipairs(cs) do
    local ch = utf8.char(c)
    if SPECIAL[c] then out[#out + 1] = "\\char" .. c .. "\\relax "
    elseif c == 45 and cs[i + 1] == 45 then out[#out + 1] = "-\\kern0pt "
    else out[#out + 1] = ch end
    local nx = cs[i + 1] and utf8.char(cs[i + 1])
    if paths and (c == 47 or c == 95 or c == 46) then out[#out + 1] = "\\allowbreak{}" end
    if ja and cjk(c) and nx and not NOBREAK_BEFORE[nx] and not NOBREAK_AFTER[ch] then out[#out + 1] = "\\hskip0pt plus 0.4pt\\relax " end
  end
  tex.sprint(table.concat(out))
end

function ja(s)
  tex.sprint("{\\jafont ")
  emit(s, true)
  tex.sprint("}")
end

function srcq(id)
  local x = Q[id]
  if not x or x.quote == "" then tex.error("no quotation for evidence item " .. id) return end
  if x.lang == "ja" then
    tex.sprint("{\\jafont 「")
    emit(x.quote, true)
    tex.sprint("」}")
  else
    tex.sprint("“")
    emit((x.quote:gsub('"(.-)"', "‘%1’")), false)
    tex.sprint("”")
  end
  tex.sprint(" (")
  emit(x.repo .. ", " .. x.where, false, true)
  tex.sprint(")")
end

function ev(id)
  local x = Q[id]
  if not x then tex.error("no evidence item " .. id) return end
  tex.sprint("\\textsf{")
  emit(x.repo .. ", " .. x.where, false, true)
  tex.sprint("}")
end
