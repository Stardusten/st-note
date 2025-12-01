// Fuzzy search implementation for card search

const Rx = /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]/
const Bx = /\s/
const Vx = /[\u0F00-\u0FFF\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/

function Hx(e: string) {
  const t = e.toLowerCase()
  const n: string[] = []
  let i = 0
  for (let r = 0; r < t.length; r++) {
    const o = t.charAt(r)
    if (Bx.test(o)) {
      if (i !== r) n.push(t.substring(i, r))
      i = r + 1
    } else if (Rx.test(o) || Vx.test(o)) {
      if (i !== r) n.push(t.substring(i, r))
      n.push(o)
      i = r + 1
    }
  }
  if (i !== t.length) n.push(t.substring(i, t.length))
  return {
    query: e,
    tokens: n,
    fuzzy: t.split("")
  }
}

function qx(e: number[][], t: number, n: number, i: number): number {
  if (e.length === 0) return 0
  let r = 0
  r -= Math.max(0, e.length - 1)
  r -= i / 10
  const o = e[0][0]
  r -= (e[e.length - 1][1] - o + 1 - t) / 100
  r -= o / 1000
  r -= n / 10000
  return r
}

function Wx(
  e: string[],
  t: string,
  n: string,
  i: boolean
): { matches: number[][]; score: number } | null {
  if (e.length === 0) return null
  const r = n.toLowerCase()
  let o = 0
  let a = 0
  const s: number[][] = []
  for (let l = 0; l < e.length; l++) {
    const c = e[l]
    const u = r.indexOf(c, a)
    if (u === -1) return null
    const h = n.charAt(u)
    if (u > 0 && !Rx.test(h) && !Vx.test(h)) {
      const p = n.charAt(u - 1)
      if (
        (h.toLowerCase() !== h && p.toLowerCase() !== p) ||
        (h.toUpperCase() !== h && !Rx.test(p) && !Bx.test(p) && !Vx.test(p))
      ) {
        if (i) {
          if (u !== a) {
            a += c.length
            l--
            continue
          }
        } else {
          o += 1
        }
      }
    }
    if (s.length === 0) {
      s.push([u, u + c.length])
    } else {
      const d = s[s.length - 1]
      if (d[1] < u) {
        s.push([u, u + c.length])
      } else {
        d[1] = u + c.length
      }
    }
    a = u + c.length
  }
  return {
    matches: s,
    score: qx(s, t.length, r.length, o)
  }
}

function Ux(e: ReturnType<typeof Hx>, t: string) {
  if (e.query === "")
    return {
      score: 0,
      matches: []
    }
  const n = Wx(e.tokens, e.query, t, false)
  return n || Wx(e.fuzzy, e.query, t, true) || { score: -Infinity, matches: [] }
}

export function prepareFuzzySearch(query: string) {
  const t = Hx(query)
  return function (text: string) {
    return Ux(t, text)
  }
}

export type SearchResult = {
  score: number
  matches: number[][]
}