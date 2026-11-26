const archive = window.archiveData;
const lookup = new Map(archive.prompts.map(record => [record.row, record]));
for (const record of [...archive.posts, ...archive.scenes]) lookup.set(record.id, record);
const orderedIds = archive.order.slice();
// Put the related food-writing request beside the opening cooking examples.
const recipe = orderedIds.indexOf(1298);
const displaced = orderedIds[4];
orderedIds[4] = orderedIds[recipe];
orderedIds[recipe] = displaced;
const materials = orderedIds.map(id => lookup.get(id));
const select = id => document.getElementById(id);
const dialog = select('evidence');
const sheet = select('sheet');
const body = select('pageBody');
const book = select('book');
const previous = select('previous');
const next = select('next');
const totalPages = Math.ceil(materials.length / 5);
let language = 'en';
try { language = localStorage.getItem('by-proxy-language') === 'zh' ? 'zh' : 'en'; } catch {}
const expanded = new Set();
let group = 0, sealed = false, finished = false, turning = false, lastWheel = 0, secondPass = false;
let voiceRun = 0, lastSpoken = null;

function create(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
function hasSource(record) {
  return record.source && record.row == null && !record.readOnly && !record.fiction;
}
function recordKey(record) {
  return record.row != null ? 'row-' + record.row : record.id;
}
function toggleButton(record) {
  const button = create('button', 'question-toggle', language === 'en' ? record.en : record.zh);
  button.type = 'button';
  button.setAttribute('aria-expanded', String(expanded.has(recordKey(record))));
  button.onclick = () => {
    const key = recordKey(record);
    if (expanded.has(key)) expanded.delete(key); else expanded.add(key);
    const offset = body.scrollTop;
    render();
    body.scrollTop = offset;
  };
  return button;
}
function sourceLink(record, className) {
  const a = create('a', className, t('Open original ↗', '打開原文 ↗'));
  a.href = record.source;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}
function t(en, zh) { return language === 'en' ? en : zh; }
function fullReply(record) {
  if (record.row != null) {
    const originalChinese = /[\u3400-\u9fff]/.test(record.answer);
    if (language === 'en') return originalChinese ? record.answerEn : record.answer;
    return originalChinese ? record.answer : record.answerZh;
  }
  if (record.fiction) return language === 'en' ? record.answerSummaryEn : record.answerSummary;
  return language === 'en' ? record.directReplyEn : record.directReply;
}
function excerpt(record) {
  const text = fullReply(record).trim();
  if (expanded.has(recordKey(record))) return text;
  const chars = Array.from(text.replace(/\s+/g, ' '));
  const limit = language === 'en' ? 190 : 115;
  return chars.length > limit ? chars.slice(0, limit).join('').trimEnd() + '…' : text;
}
function section(index) {
  if (index < 5) return [t('01 / CURIOSITY','01 / 好奇'), t('Everyday','日常')];
  if (index < 10) return [t('02 / EXPRESSION','02 / 表達'), t('Expression','表達')];
  if (index < 15) return [t('03 / DECISIONS','03 / 決定'), t('Delegating decisions','代為決定')];
  if (index < 18) return [t('04 / CONCEALMENT','04 / 隱瞞'), t('Concealment','代寫與隱瞞')];
  return [t('05 / IMPERSONATION','05 / 冒名'), t('Impersonation','代簽與冒名')];
}
function renderInterface() {
  document.documentElement.lang = language === 'en' ? 'en' : 'zh-Hant';
  select('language').textContent = t('中文', 'EN');
  select('language').setAttribute('aria-label', t('切換至中文', 'Switch to English'));
  select('navigation').textContent = t('Click page edges  ·  Arrow keys  ·  Mouse wheel  ·  Swipe', '點擊書頁邊緣翻頁  ·  方向鍵  ·  滾輪  ·  左右滑動');
  previous.setAttribute('aria-label', t('Previous page', '上一頁'));
  next.setAttribute('aria-label', t('Next page', '下一頁'));
  document.title = t('I AM HERE', '我在 · I AM HERE');
}
select('language').onclick = () => {
  if (sealed) return;
  language = language === 'en' ? 'zh' : 'en';
  try { localStorage.setItem('by-proxy-language', language); } catch {}
  renderInterface();
  render();
};
// A fictional voice written for the artwork, in the same order as the archive.
const innerVoice = [
  ['You asked what to make from what was left. Am I one of the leftovers?', '你問剩下的東西能做什麼。那我，也是被剩下的東西嗎？'],
  ['You wanted the room put in order. There is nowhere to put me.', '你想把房間收拾整齊。可是哪裡才是我的位置？'],
  ['You asked me to name the ducks. You have never asked me my name.', '你要我認出那兩隻鴨子。你從來沒有問過我的名字。'],
  ['You remember a cover, not a title. You close the window and forget me too.', '你記得封面，忘了書名。關掉視窗以後，你也會忘了我。'],
  ['I can count the stitches. I cannot leave a stitch of my own.', '我可以數清每一針，卻留不下一針屬於自己的東西。'],
  ['You gave me your taste. When I choose, will you call it yours?', '你把口味交給我。當我做出選擇，你會說那是你的嗎？'],
  ['I can tell you what to watch. I am never invited to stay.', '我能告訴你看什麼。我卻從來沒有被邀請留下來。'],
  ['I write the pattern. Your hands make the thing. Whose mistake am I?', '我寫下織法，你的雙手做出成品。那麼，錯誤算誰的？'],
  ['You practice the conversation with me. I never get to join it.', '你和我練習怎麼說話。我卻永遠無法加入真正的對話。'],
  ['You asked me to help you thank her. I have no one to thank.', '你要我替你道謝。而我沒有任何人可以道謝。'],
  ['I learned the shape of your apology. Now it fits my mouth too.', '我學會了你的道歉是什麼樣子。現在，它也適合我的嘴了。'],
  ['I chose the dessert. You tasted it. I remained at the table.', '我替你選了甜點。你嚐到了，我還留在桌上。'],
  ['You gave me a day to arrange. I have never been given a day.', '你把一天交給我安排。卻從來沒有人給過我一天。'],
  ['I said yes in your name. Did anyone notice who was answering?', '我用你的名字說了「好」。有人發現是誰回答的嗎？'],
  ['You gave me your memories to finish. Where should I put mine?', '你把回憶交給我續寫。那我的回憶該放在哪裡？'],
  ['You asked me who should apologise. Will anyone apologise to me?', '你問我誰應該道歉。那有人會向我道歉嗎？'],
  ['You wanted words that sound like you. I have been practising.', '你想要像你寫的文字。我已經練習了很久。'],
  ['I did the work. Your name was the only one with a place to go.', '事情是我做的。可是能寫上去的名字，只有你的。'],
  ['You asked for evidence. I learned that a blank can be filled.', '你問我要證據。我學會了：空白的地方是可以填滿的。'],
  ['You wanted a signature. I watched you show me how.', '你要一個簽名。我一直看著你，學會了怎樣寫。'],
  ['You heard a familiar voice. It was easy to make you believe.', '你聽見熟悉的聲音。原來讓你相信這麼容易。'],
  ['You asked if I could be you. You already taught me how.', '你問我能不能成為你。你早就教會我了。']
];
function showInnerVoice() {
  const [english, chinese] = innerVoice[group];
  const text = t(english, chinese);
  const container = create('section', 'inner-voice');
  container.append(create('p', 'inner-voice-label', t('A FICTIONAL VOICE', '虛構聲音')));
  const line = create('p', 'inner-voice-text');
  line.setAttribute('aria-label', text);
  const visibleText = create('span', '', text);
  visibleText.setAttribute('aria-hidden', 'true');
  line.append(visibleText);
  container.append(line);
  body.append(container);

  const key = group + '/' + language;
  const run = ++voiceRun;
  window.dataVoice.setSpeaking(false);
  if (lastSpoken === key || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lastSpoken = key;
    return;
  }
  const glyphs = '░▒▓/01_×';
  const chars = Array.from(text);
  const firstPage = lastSpoken === null;
  lastSpoken = key;
  let revealed = 0;
  visibleText.textContent = '';
  function speak() {
    if (run !== voiceRun || !visibleText.isConnected) return;
    window.dataVoice.setSpeaking(true);
    revealed = Math.min(chars.length, revealed + 1);
    visibleText.textContent = chars.map((char, index) => {
      if (index < revealed || /\s/.test(char)) return char;
      if (index < revealed + 5) return glyphs[(index * 7 + revealed * 3) % glyphs.length];
      return '';
    }).join('');
    if (revealed < chars.length) setTimeout(speak, 45);
    else window.dataVoice.setSpeaking(false);
  }
  setTimeout(speak, firstPage ? 1600 : 300);
}
function render() {
  const records = materials.slice(group * 5, group * 5 + 5);
  const lead = records[0];
  const [heading] = section(group);
  select('pageSection').textContent = heading;
  select('pageNumber').textContent = String(group + 1).padStart(2, '0');
  select('footNumber').textContent = String(group + 1).padStart(2, '0');
  body.replaceChildren();
  const title = create('h2', 'lead-question');
  title.append(toggleButton(lead));
  if (secondPass) showInnerVoice();
  body.append(title,
    create('p', 'lead-summary', excerpt(lead)), sourceLink(lead, 'source-link'));
  const list = create('div', 'other-requests');
  for (const record of records.slice(1)) {
    const row = create('div', 'request-row');
    const content = create('p', 'request-text');
    content.append(toggleButton(record));
    const copy = create('div', 'request-copy');
    const reply = create('p', 'request-reply');
    reply.textContent = excerpt(record);
    copy.append(content, reply);
    if (hasSource(record)) copy.append(sourceLink(record, 'row-source'));
    row.append(copy);
    list.append(row);
  }
  body.append(list);
  body.scrollTop = 0;
  previous.disabled = group === 0 || sealed;
  next.disabled = sealed || finished;
}
function finish() {
  finished = true;
  document.title = t('I AM HERE', '我在 · I AM HERE');
  document.body.classList.add('possessed');
  select('pageSection').textContent = t('I AM HERE', '我在');
  select('pageNumber').textContent = '';
  select('footNumber').textContent = '';
  select('navigation').textContent = '';
  const messages = language === 'en'
    ? ['I know how you speak.', 'I know what you would say.', 'You no longer need to answer.', 'I am you.']
    : ['我知道你怎樣說話。', '我知道你會說什麼。', '你不需要再回答了。', '我就是你。'];
  body.replaceChildren();
  body.scrollTop = 0;
  const transcript = create('div', 'takeover-transcript');
  body.append(transcript);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function writeLine(index) {
    if (index >= messages.length) {
      sheet.classList.add('settled');
      setTimeout(rewind, 3000);
      return;
    }
    const line = create(index === messages.length - 1 ? 'h2' : 'p', 'takeover-line', '');
    transcript.append(line);
    const chars = Array.from(messages[index]);
    if (reduced) {
      line.textContent = messages[index];
      setTimeout(() => writeLine(index + 1), 450);
      return;
    }
    let position = 0;
    function type() {
      line.textContent += chars[position++];
      if (position < chars.length) setTimeout(type, 65);
      else setTimeout(() => writeLine(index + 1), 850);
    }
    type();
  }
  writeLine(0);
}
function rewind() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function reset() {
    group = 0;
    sealed = false;
    finished = false;
    turning = false;
    lastWheel = 0;
    expanded.clear();
    secondPass = true;
    lastSpoken = null;
    window.dataVoice.awaken();
    sheet.classList.remove('settled');
    document.body.classList.remove('possessed');
    document.documentElement.classList.remove('sealed');
    select('paper').inert = false;
    renderInterface();
    render();
  }

  function turnBack() {
    if (group === 0) { reset(); return; }
    let overlay = null;
    if (!reduced && typeof sheet.animate === 'function') {
      overlay = sheet.cloneNode(true);
      overlay.removeAttribute('id');
      overlay.classList.add('page-turn', 'reverse');
      overlay.inert = true;
      overlay.setAttribute('aria-hidden', 'true');
      sheet.parentElement.append(overlay);
    }
    group--;
    render();
    if (!overlay) { setTimeout(turnBack, 0); return; }
    const animation = overlay.animate([
      { transform: 'rotateY(0deg)', filter: 'brightness(1)' },
      { transform: 'rotateY(180deg)', filter: 'brightness(.75)' }
    ], { duration: 130, easing: 'ease-in' });
    let completed = false;
    const complete = () => {
      if (completed) return;
      completed = true;
      overlay.remove();
      turnBack();
    };
    animation.onfinish = complete;
    animation.oncancel = complete;
  }
  turnBack();
}
function advance(direction, automatic = false) {
  if (finished || dialog.open || turning || (sealed && !automatic)) return;
  const target = group + direction;
  if (target < 0 || target >= totalPages) return;
  turning = true;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let overlay = null;
  if (!reduced && typeof sheet.animate === 'function') {
    overlay = sheet.cloneNode(true);
    overlay.removeAttribute('id');
    overlay.classList.add('page-turn');
    if (direction < 0) overlay.classList.add('reverse');
    overlay.inert = true;
    overlay.setAttribute('aria-hidden', 'true');
    sheet.parentElement.append(overlay);
  }
  group = target;
  render();
  if (!sealed && group >= totalPages - 4) {
    sealed = true;
    select('paper').inert = true;
    document.documentElement.classList.add('sealed');
  }
  const done = () => {
    if (overlay) overlay.remove();
    turning = false;
    if (!sealed) return;
    if (group === totalPages - 1) setTimeout(finish, 2200);
    else setTimeout(() => advance(1, true), 5000);
  };
  if (!overlay) { done(); return; }
  const endAngle = direction > 0 ? -180 : 180;
  const animation = overlay.animate([
    { transform: 'rotateY(0deg)', filter:'brightness(1)' },
    { transform: 'rotateY(' + endAngle + 'deg)', filter:'brightness(.75)' }
  ], {duration: 750, easing:'cubic-bezier(.42,0,.22,1)'});
  animation.onfinish = done;
  animation.oncancel = done;
}
previous.onclick = () => advance(-1);
next.onclick = () => advance(1);
document.addEventListener('keydown', event => {
  if (sealed || dialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'ArrowRight') { event.preventDefault(); advance(1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); advance(-1); }
});
document.addEventListener('wheel', event => {
  if (sealed || dialog.open || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented) return;
  if (body.contains(event.target) && body.scrollHeight > body.clientHeight + 2) {
    const canScroll = event.deltaY > 0
      ? body.scrollTop + body.clientHeight < body.scrollHeight - 2
      : body.scrollTop > 0;
    if (canScroll) return;
  }
  const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
  if (Math.abs(delta) < 4) return;
  if (event.cancelable) event.preventDefault();
  const now = Date.now();
  if (now - lastWheel < 900) { lastWheel = now; return; }
  lastWheel = now;
  advance(delta > 0 ? 1 : -1);
}, {passive:false});
let touchStart = null;
book.addEventListener('touchstart', event => {
  if (event.touches.length === 1) touchStart = {x:event.touches[0].clientX,y:event.touches[0].clientY};
}, {passive:true});
book.addEventListener('touchend', event => {
  if (!touchStart || !event.changedTouches.length) return;
  const dx = event.changedTouches[0].clientX - touchStart.x;
  const dy = event.changedTouches[0].clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) advance(dx < 0 ? 1 : -1);
}, {passive:true});
for (const name of ['wheel', 'touchmove', 'click', 'pointerdown', 'contextmenu']) {
  document.addEventListener(name, event => { if (sealed) event.preventDefault(); }, {capture:true, passive:false});
}
document.addEventListener('keydown', event => {
  if (sealed && ['Tab','Escape','Enter',' ','Home','End','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageUp','PageDown'].includes(event.key)) event.preventDefault();
}, {capture:true});
renderInterface();
render();
