(function () {
  const contentEl = document.getElementById('content');
  const tocEl = document.getElementById('toc');
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');

  let chapters = [];
  let searchIndex = [];
  let currentChapter = null;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function loadManifest() {
    const res = await fetch('data/manifest.json');
    if (!res.ok) throw new Error('无法加载 data/manifest.json');
    return res.json();
  }

  async function loadChapter(file) {
    const res = await fetch('data/' + file);
    if (!res.ok) throw new Error('无法加载 ' + file);
    return res.json();
  }

    function renderToc() {
    let html = '';
    chapters.forEach((ch, chIdx) => {
      const chapterKey = 'ch-' + chIdx;
      html += `<div class="chapter-toggle" data-target="${chapterKey}">
        <span class="chapter-arrow">▼</span>
        <span class="chapter-name">${esc(ch.chapter)}</span>
      </div>`;
      html += `<div class="chapter-body" id="${chapterKey}">`;
      ch.sections.forEach(sec => {
        html += `<a class="section" href="#" data-chapter="${esc(ch.file)}" data-sec="${esc(sec.id)}">${esc(sec.title)}</a>`;
        if (sec.subsections) {
          sec.subsections.forEach(sub => {
            html += `<a class="sub" href="#" data-chapter="${esc(ch.file)}" data-sec="${esc(sec.id)}" data-sub="${esc(sub.id)}">${esc(sub.title)}</a>`;
          });
        }
      });
      if (ch.chapterExamples && ch.chapterExamples.length) {
        html += `<a class="section" href="#" data-chapter="${esc(ch.file)}" data-sec="__chapter_examples">章末综合例题（${ch.chapterExamples.length}）</a>`;
      }
      html += `</div>`;
    });
    tocEl.innerHTML = html;

    // 章节折叠/展开
    tocEl.querySelectorAll('.chapter-toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const targetId = toggle.dataset.target;
        const body = document.getElementById(targetId);
        if (!body) return;
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? 'block' : 'none';
        const arrow = toggle.querySelector('.chapter-arrow');
        if (arrow) arrow.textContent = isHidden ? '▼' : '▶';
      });
    });

    // 节点击跳转
    tocEl.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const file = a.dataset.chapter;
        const secId = a.dataset.sec;
        const subId = a.dataset.sub;
        openChapter(file, secId, subId);
        tocEl.querySelectorAll('a').forEach(x => x.classList.remove('active'));
        a.classList.add('active');
      });
    });
  }

  function renderChapter(ch, targetSec, targetSub) {
    let html = `<h1>${esc(ch.chapter)}</h1>`;

    ch.sections.forEach(sec => {
      html += `<h2 id="${esc(sec.id)}">${esc(sec.title)}</h2>`;
      if (sec.intro) html += sec.intro;

      if (sec.subsections) {
        sec.subsections.forEach(sub => {
          html += `<h3 id="${esc(sub.id)}">${esc(sub.title)}</h3>`;
          if (sub.content) html += sub.content;
          if (sub.examples) html += renderExamples(sub.examples, '例题');
        });
      }
      if (sec.examples) html += renderExamples(sec.examples, '例题');
    });

    if (ch.chapterExamples && ch.chapterExamples.length) {
      html += `<h2 id="__chapter_examples">📝 章末综合例题</h2>`;
      html += renderExamples(ch.chapterExamples, '综合', true);
    }

    contentEl.innerHTML = html;
    contentEl.parentElement.scrollTop = 0;

    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise([contentEl]).catch(() => {});
    }

    let targetEl = null;
    if (targetSub) targetEl = document.getElementById(targetSub);
    else if (targetSec) targetEl = document.getElementById(targetSec);
    if (targetEl) {
      setTimeout(() => targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  }

  function renderExamples(list, label, isChapterEnd) {
    if (!list || !list.length) return '';

    const groupTitle = isChapterEnd
      ? `📚 ${label}例题（共 ${list.length} 道）`
      : `📚 ${label}（共 ${list.length} 道）`;

    const items = list.map((ex, i) => {
      const badge = isChapterEnd
        ? `<span class="badge chapter-end">${label}${i + 1}</span>`
        : `<span class="badge">${label}${i + 1}</span>`;
      return `
        <details class="example">
          <summary>${badge}<span class="q-text">${ex.q}</span></summary>
          <div class="answer">${ex.a}</div>
        </details>`;
    }).join('');

    return `
      <details class="example-group">
        <summary class="group-summary">${groupTitle}</summary>
        <div class="group-body">${items}</div>
      </details>`;
  }

  async function openChapter(file, secId, subId) {
    try {
      if (!currentChapter || currentChapter.file !== file) {
        const ch = await loadChapter(file);
        ch.file = file;
        currentChapter = ch;
        renderChapter(ch, secId, subId);
      } else {
        let el = null;
        if (subId) el = document.getElementById(subId);
        else if (secId) el = document.getElementById(secId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) {
      contentEl.innerHTML = `<p style="color:#c0392b;">加载失败：${esc(err.message)}</p>`;
    }
  }

  function buildSearchIndex() {
    searchIndex = [];
    chapters.forEach(ch => {
      ch.sections.forEach(sec => {
        searchIndex.push({
          type: '知识点',
          text: sec.title,
          file: ch.file,
          sec: sec.id,
          sub: null
        });
        if (sec.subsections) {
          sec.subsections.forEach(sub => {
            searchIndex.push({
              type: '知识点',
              text: sub.title,
              file: ch.file,
              sec: sec.id,
              sub: sub.id
            });
          });
        }
        const addEx = (list) => {
          if (!list) return;
          list.forEach((ex, i) => {
            searchIndex.push({
              type: '例题',
              text: '例' + (i + 1) + '：' + stripHtml(ex.q),
              file: ch.file,
              sec: sec.id,
              sub: null
            });
          });
        };
        addEx(sec.examples);
        if (sec.subsections) sec.subsections.forEach(sub => addEx(sub.examples));
      });
      if (ch.chapterExamples) {
        ch.chapterExamples.forEach((ex, i) => {
          searchIndex.push({
            type: '章末例题',
            text: '综合' + (i + 1) + '：' + stripHtml(ex.q),
            file: ch.file,
            sec: '__chapter_examples',
            sub: null
          });
        });
      }
    });
  }

  function stripHtml(s) {
    return String(s == null ? '' : s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }

  function doSearch(kw) {
    kw = kw.trim().toLowerCase();
    if (!kw) { searchResults.classList.remove('show'); return; }

    const hits = searchIndex.filter(item =>
      item.text.toLowerCase().includes(kw) ||
      item.type.toLowerCase().includes(kw)
    ).slice(0, 30);

    if (!hits.length) {
      searchResults.innerHTML = `<div class="empty">没有找到「${esc(kw)}」</div>`;
      searchResults.classList.add('show');
      return;
    }

    searchResults.innerHTML = hits.map((h, i) => {
      const re = new RegExp('(' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      const txt = esc(h.text).replace(re, '<span class="hit">$1</span>');
      return `<div class="item" data-idx="${i}">
        <span class="tag">${esc(h.type)}</span>${txt}
      </div>`;
    }).join('');
    searchResults.classList.add('show');

    searchResults.querySelectorAll('.item').forEach((el, i) => {
      el.addEventListener('click', () => {
        const h = hits[i];
        openChapter(h.file, h.sec, h.sub);
        searchResults.classList.remove('show');
        searchInput.value = '';
      });
    });
  }

  async function init() {
    try {
      const manifest = await loadManifest();
      const parts = [];
      for (const item of manifest.chapters) {
        const ch = await loadChapter(item.file);
        ch.file = item.file;
        parts.push(ch);
      }

      const chapterMap = {};
      parts.forEach(p => {
        const key = p.chapter || '未命名';
        if (!chapterMap[key]) {
          chapterMap[key] = {
            chapter: key,
            sections: [],
            chapterExamples: [],
            files: []
          };
        }
        const target = chapterMap[key];
        if (p.sections) target.sections = target.sections.concat(p.sections);
        if (p.chapterExamples) target.chapterExamples = target.chapterExamples.concat(p.chapterExamples);
        target.files.push(p.file);
      });

      chapters = Object.values(chapterMap).map(c => {
        c.file = c.files[0];
        return c;
      });

      renderToc();
      buildSearchIndex();

      if (chapters.length) {
        const first = chapters[0];
        currentChapter = first;
        renderChapter(first);
        const firstLink = tocEl.querySelector('a.section');
        if (firstLink) firstLink.classList.add('active');
      }
    } catch (err) {
      contentEl.innerHTML = `<p style="color:#c0392b;">初始化失败：${esc(err.message)}<br>请确认已通过 start.bat 启动，而不是直接双击 index.html。</p>`;
    }
  }

  let searchTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => doSearch(searchInput.value), 180);
  });
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) doSearch(searchInput.value);
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-box')) searchResults.classList.remove('show');
  });

  init();
})();