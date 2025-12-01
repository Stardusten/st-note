1. 我选择使用 ProseMirror 编辑器，一则笔记的 obj.data.content 就是 ProseMirror 编辑器数据模型的序列化结果，obj.text 调用编辑器 .textContent 即可获得（因此你的 content: Block[] 是不需要的
2. 在我的设计中，笔记不需要有标题，第一行就是标题
3. mini-window 是没用的，不管是 ui 还是里面的数据模型都是过时无效的，之后请不要看 mini-window 部分，专心先完成 main-window 的实现
4. 不应该有一个 type 为 task 的对象，因为在我的设计中，任何一个对象都可以成为 task，比如一则笔记可以是 task，一个白板可以是 task，一个笔记集合也可以是task。因此，task 相关的属性如 checked schedule deadline 应该放到 data 里面，如果 checked 不是 undefined 则认为这是一个 task
5. 目前只考虑 card 这一个 type

先只专注于基础功能：

1. 使用 ProseMirror 官方默认的 schema，之后添加功能时再考虑自定义 schema
2. card 结构现在就是我想要的，coverImage 和 emoji 暂时放着占位就行，相关功能不需要现在实现
3. 左侧边栏不需要实现，保持现在的占位情况即可
4. 搜索使用基于 obj.text 的模糊匹配搜索，下面是一个成熟的搜索实现

var Rx = /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]/,
Bx = /\s/,
Vx =
/[\u0F00-\u0FFF\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;

function Hx(e) {
for (var t = e.toLowerCase(), n = [], i = 0, r = 0; r < t.length; r++) {
var o = t.charAt(r);
Bx.test(o)
? (i !== r && n.push(t.substring(i, r)), (i = r + 1))
: (Rx.test(o) || Vx.test(o)) &&
(i !== r && n.push(t.substring(i, r)), n.push(o), (i = r + 1));
}
return (
i !== t.length && n.push(t.substring(i, t.length)),
{
query: e,
tokens: n,
fuzzy: t.split(""),
}
);
}

function qx(e, t, n, i) {
if (0 === e.length) return 0;
var r = 0;
(r -= Math.max(0, e.length - 1)), (r -= i / 10);
var o = e[0][0];
return (
(r -= (e[e.length - 1][1] - o + 1 - t) / 100),
(r -= o / 1e3),
(r -= n / 1e4)
);
}

function Wx(e, t, n, i) {
if (0 === e.length) return null;
for (
var r = n.toLowerCase(), o = 0, a = 0, s = [], l = 0;
l < e.length;
l++
) {
var c = e[l],
u = r.indexOf(c, a);
if (-1 === u) return null;
var h = n.charAt(u);
if (u > 0 && !Rx.test(h) && !Vx.test(h)) {
var p = n.charAt(u - 1);
if (
(h.toLowerCase() !== h && p.toLowerCase() !== p) ||
(h.toUpperCase() !== h && !Rx.test(p) && !Bx.test(p) && !Vx.test(p))
)
if (i) {
if (u !== a) {
(a += c.length), l--;
continue;
}
} else o += 1;
}
if (0 === s.length) s.push([u, u + c.length]);
else {
var d = s[s.length - 1];
d[1] < u ? s.push([u, u + c.length]) : (d[1] = u + c.length);
}
a = u + c.length;
}
return {
matches: s,
score: qx(s, t.length, r.length, o),
};
}

function Ux(e, t) {
if ("" === e.query)
return {
score: 0,
matches: [],
};
var n = Wx(e.tokens, e.query, t, !1);
return n || Wx(e.fuzzy, e.query, t, !0);
}

function prepareFuzzySearch(e) {
var t = Hx(e);
return function (e) {
return Ux(t, e);
};
}

5. 通过自定义 schema 可以要求 doc 内至少有一个块，并且第一个块为标题。这需要自定义 schema 和上面的要求矛盾，这里重新说：我希望基于官方最简单的 schema，添加第一行为标题的最小改动。
