const $ = selector => document.querySelector(selector);
const data = window.archiveData;
const feed = $('#feed'), detail = $('#detail'), end = $('#ending');
const phaseNames = ['查找', '代写', '代为决定', '代签与冒名'];
const transitions = ['', '先帮我写一句。原意还是我的。', '草稿不用给我看。你替我决定。', '凡是该我确认的，你先替我确认。'];
const records = new Map(data.prompts.map(p => [p.row, p]));
for (const story of data.posts) records.set(story.id, story);
for (const scene of data.scenes) records.set(scene.id, scene);
const phaseEnds = [25, 50, 75, data.order.length];
const sequence = data.order.map((id, index) => ({
  ...records.get(id),
  stage: phaseEnds.findIndex(end => index < end)
}));
const paper = $('#paper'), boundary = $('#boundary');
let cursor = 0, stage = 0, taken = false, takingOver = false, frame = false;

const motion = createScrollMotion(sequence.length, () => taken || detail.open, takeOver);

function el(tag, cls, txt) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (txt != null) node.textContent = txt;
  return node;
}
function button(cls, label, fn) {
  const b = el('button', cls, label);
  b.onclick = fn;
  return b;
}
function link(label, url) {
  const a = el('a', '', label);
  a.href = url;
  if (url.endsWith('.csv')) a.download = '';
  else { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  return a;
}
function pop(title, kicker, ...children) {
  if (taken) return;
  $('#detailBody').replaceChildren(el('div', 'eyebrow', kicker), el('h2', '', title), ...children);
  if (!detail.open) detail.showModal();
  detail.scrollTop = 0;
}
const paragraph = text => el('p', '', text);
function hasSource(p) { return p.row == null && !p.fiction && !p.readOnly; }
function openTag(tag) {
  const list = sequence.filter(p => p.tag === tag);
  const entries = list.map(p => hasSource(p)
    ? link(p.zh, p.source)
    : el('span', '', p.zh));
  pop('# ' + tag, '关键词索引', ...entries.map(entry => { const item = el('p'); item.append(entry); return item; }));
}
function searchStudy() {
  const marks = el('ol', 'marks');
  for (const item of data.images) {
    const mark = el('li', item.screen ? 'screen' : '');
    mark.append(link(String(item.rank).padStart(2, '0'), item.source));
    mark.firstChild.setAttribute('aria-label', '第 ' + item.rank + ' 张图，' + item.tag + '，查看来源');
    marks.append(mark);
  }
  pop('找食材，搜到了谁？', '检索实验 / 同一句查询，两个结果页',
    paragraph('检索词：chatgpt recipe fridge ingredients。网页搜索和图片搜索都取自 Bing。'),
    paragraph('网页结果首条是 ChatGPT 首页。再看图片结果的前十二张：七张以标识或字样为主体，五张把标识放在设备屏幕上。没有一张拍到食材。'),
    marks, el('small', 'legend', '空心为标识与字样，实心为屏幕中的标识。点编号可看图片来源。'),
    paragraph('这是一次检索留下的切片。冰箱实录的作者用照片辨认食材；在这次检索里，食材甚至没有入镜。'),
    link('网页结果 · Bookmarklet 导出', 'bookmarklet-web.csv'), el('br'),
    link('图片标注 · Tagger 导出', 'tagger-images.csv'));
}
function appendRow(p, i) {
  if (i && p.stage !== sequence[i - 1].stage) feed.append(el('div', 'phaseNote', transitions[p.stage]));
  const row = el('article', 'card');
  row.dataset.phase = p.stage;
  row.dataset.index = i;
  const n = el('span', 'num');
  n.append(el('b', '', '/'), String(i + 1).padStart(3, '0'));
  const middle = el('div', 'entry');
  const hasOriginal = hasSource(p);
  row.dataset.access = hasOriginal ? 'original' : 'read-only';
  const kind = p.caseStudy ? '事件档案 · 据出处改写' :
    p.fiction ? '作品虚构' : p.id ? '生活实录 · 据原文重述' : '真实问答 · WildChat';
  const heading = el('h3', 'request');
  if (hasOriginal) heading.append(link(p.zh, p.source));
  else heading.textContent = p.zh;
  const tag = hasOriginal ? button('tag', '# ' + p.tag, () => openTag(p.tag)) : el('span', 'tag', '# ' + p.tag);
  middle.append(el('small', 'kind', kind), heading, tag);
  if (p.answerSummary) {
    const summary = el('p', 'answerPreview');
    summary.append(el('strong', '', p.caseStudy ? '事件摘述' : p.fiction ? '代理回执' : p.id ? '实录摘述' : 'AI 回答摘述'), p.answerSummary);
    middle.append(summary);
  }
  if (p.readOnly) middle.append(el('small', 'kind', p.sourceLabel));
  row.append(n, middle);
  if (hasOriginal) {
    const aside = el('aside', 'related'), a = link(p.title, p.source);
    a.className = 'postLink';
    aside.append(el('span', 'postlabel', '阅读原文'), a, el('small', 'sourceName', p.sourceLabel));
    if (p.id === 'fridge') aside.append(button('studyLink', '检索实验：搜食材时，看见了什么？', searchStudy));
    row.append(aside);
  } else {
    row.append(el('small', 'readOnly', p.fiction ? '代理手记' : '只读摘录'));
  }
  feed.append(row);
}
function batch() {
  const target = Math.min(sequence.length, cursor + 4);
  while (cursor < target) { appendRow(sequence[cursor], cursor); cursor++; }
}
function takeOver() {
  takingOver = true;
  paper.inert = true;
  document.documentElement.classList.add('takeover');
  $('#takeoverStatus').hidden = false;
  while (cursor < sequence.length) batch();
}
function lockGesture(event) {
  if (takingOver) event.preventDefault();
}
for (const type of ['wheel', 'touchmove', 'pointerdown', 'click', 'contextmenu']) {
  document.addEventListener(type, lockGesture, {capture: true, passive: false});
}
document.addEventListener('keydown', event => {
  if (['Escape', 'Tab', 'Enter', ' ', 'ArrowDown', 'ArrowUp', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) lockGesture(event);
}, {capture: true});
function finish() {
  taken = true;
  motion.stop();
  $('#takeoverStatus').hidden = true;
  end.showModal();
  document.title = '代理阅读中 · BY PROXY';
}
function advance() {
  frame = false;
  if (taken || detail.open) return;
  let reached = 0;
  for (const r of feed.querySelectorAll('.card')) {
    if (r.getBoundingClientRect().top > innerHeight * .72) break;
    reached = Number(r.dataset.index);
  }
  stage = sequence[reached].stage;
  motion.update(reached);
  document.body.dataset.stage = stage;
  $('#control').textContent = takingOver ? '代理接管中' : phaseNames[stage];
  $('#phase').textContent = $('#control').textContent;
  const edge = boundary.getBoundingClientRect();
  if (edge.top < innerHeight + 180 && cursor < sequence.length) { batch(); schedule(); }
  else if (takingOver && edge.bottom <= innerHeight + 1) finish();
}
function schedule() {
  if (!frame) { frame = true; requestAnimationFrame(advance); }
}
function about() {
  const methods = el('div', 'methods');
  function section(title, content) { methods.append(el('h3', '', title), paragraph(content)); }
  section('Recompiling · 重编材料', '从 Ai2 的 WildChat 选出 61 组公开问答，档案前半段展示其中部分。44 张可点击的卡片来自个人实录、报道、公开研究和法律文件。事件档案里的提问是创作性改写。标有「作品虚构」的提问及其代理回执构成虚构叙事。');
  section('Rearranging · 重排阅读顺序', '把原本独立的记录编成「查找、代写、代为决定、代签与冒名」四段。前面的人让模型帮忙找答案，后来的人把署名和确认也交给它。相邻记录的关系来自编排。');
  const compare = el('details', 'originalReply');
  compare.append(el('summary', '', '对照原始行号与作品顺序'));
  const table = el('table', 'compare');
  const head = table.insertRow();
  for (const h of ['作品序号', '数据行号', '提问']) head.append(el('th', '', h));
  for (const [i, p] of sequence.entries()) {
    if (p.row == null) continue;
    const tr = table.insertRow();
    for (const text of [String(i + 1).padStart(3, '0'), p.row, p.zh]) tr.append(el('td', '', text));
  }
  compare.append(table); methods.append(compare);
  section('Reconfiguring · 改写界面行为', '每五条有两篇有原文入口，三条只读。越往下，同样的手势走得越短，页面回拽得越频繁，也退得越远。进入末段，作品收回页面操作，代理翻完最后六条并签收。');
  section('工具留下了什么？', 'CSV Text Explorer 在 61 条提问原文中检索「扮演」「你是」「act as」等角色措辞。SearchEnginesBookmarklet 从保存的 Bing 网页搜索结果页导出 10 条。Search Image Tagger 给同一查询的前 12 张 Bing 图片按画面标注。图片取自单独保存的图片结果页。');
  methods.append(button('tag', '查看冰箱检索实验', searchStudy));
  for (const [label, url] of [
    ['61 条问答选样', 'wildchat-selection.csv'], ['角色措辞检索结果', 'course-tool-role-extract.csv'],
    ['10 条网页结果', 'bookmarklet-web.csv'], ['12 张图片的标注', 'tagger-images.csv'],
    ['WildChat · Ai2', 'https://huggingface.co/datasets/allenai/WildChat-1M'],
    ['数据许可 · ODC-By', 'https://opendatacommons.org/licenses/by/1-0/'],
    ['SearchEnginesBookmarklet', 'https://medialab.github.io/SearchEnginesBookmarklet/'],
    ['Search Image Tagger', 'https://internetpoetics.neocities.org/search-image-tagger/'],
    ['CSV Text Explorer', 'https://internetpoetics.neocities.org/csv-text-explorer/']
  ]) { const line = el('div'); line.append(link(label, url)); methods.append(line); }
  section('制作说明', '作品根据创作者提出的滚动与接管构想制作。OpenAI Codex 参与选样、中文摘述、标注与网页实现。页面内的代理行为由本地脚本触发。');
  pop('作品与方法', '代问 / BY PROXY', methods);
}
$('#about').onclick = about;
$('.close').onclick = () => detail.close();
detail.addEventListener('click', e => {
  if (e.target !== detail) return;
  const r = detail.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) detail.close();
});
detail.addEventListener('close', schedule);
end.addEventListener('cancel', e => e.preventDefault());
batch(); schedule();
addEventListener('scroll', schedule, {passive: true});
addEventListener('resize', schedule);
