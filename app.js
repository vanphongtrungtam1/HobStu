(() => {
  'use strict';

  const DATA = window.APP_DATA;
  const app = document.getElementById('app');
  const tabs = [...document.querySelectorAll('.lesson-tab')];
  const toast = document.getElementById('toast');
  let toastTimer;
  let activeTab = 'review';
  let fontSize = 18;

  const tabTitles = {
    review: ['Vocabulary Review', 'Ôn lại từ và cụm từ đã học trước khi vào bài mới.'],
    'listening-2': ['Listening Part 2 · Conversations', 'Làm Lead-in để nhận diện paraphrase, sau đó nghe và trả lời Questions 9–20.'],
    'listening-3': ['Listening Part 3 · Talks', 'Làm Lead-in để nhận diện paraphrase, sau đó nghe và trả lời Questions 21–35.'],
    'reading-2': ['Reading Passage 2', 'Lead-in Paraphrase Decoder → đọc bài → trả lời 10 câu hỏi.'],
    'reading-3': ['Reading Passage 3', 'Lead-in Paraphrase Decoder → đọc bài → trả lời 10 câu hỏi.'],
    'reading-4': ['Reading Passage 4', 'Lead-in Paraphrase Decoder → đọc bài → trả lời 10 câu hỏi.']
  };

  function esc(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function optionRows(item, name) {
    return `<div class="options">${item.options.map((option, index) => `
      <label class="option-row" data-answer="${esc(option)}">
        <input type="radio" name="${name}" value="${esc(option)}">
        <span class="option-letter">${String.fromCharCode(65 + index)}.</span>
        <span>${esc(option)}</span>
      </label>`).join('')}</div>`;
  }

  function practiceCard(item, kind, prefix) {
    const prompt = kind === 'vocab'
      ? `<h4><span class="item-number">${item.id}</span>${esc(item.meaning)}</h4>`
      : `<h4><span class="item-number">${item.id}</span><span class="source-phrase">“${esc(item.source)}”</span><span class="arrow-note">Ý tương đương trong câu hỏi/phương án là:</span></h4>`;
    return `<article class="practice-item" data-correct="${esc(item.answer)}">${prompt}${optionRows(item, `${prefix}-${item.id}`)}</article>`;
  }

  function sectionActions(label = 'Check') {
    return `<div class="action-row">
      <button type="button" class="action-btn check-action">${label}</button>
      <button type="button" class="action-btn secondary reset-action">Reset</button>
      <output class="result"></output>
    </div>`;
  }

  function renderReview() {
    return `
      <section class="panel-heading"><h2>${tabTitles.review[0]}</h2><p>${tabTitles.review[1]}</p></section>
      <section class="section-card answer-section">
        <header class="section-head"><div><h3>Exercise 1 · Vietnamese → English</h3><p>Chọn từ hoặc cụm từ tiếng Anh đúng với nghĩa tiếng Việt.</p></div></header>
        <div class="section-body question-grid">${DATA.vocab.map(item => practiceCard(item, 'vocab', 'vocab')).join('')}</div>
        ${sectionActions()}
      </section>
      <section class="section-card answer-section misuse-section">
        <header class="section-head"><div><h3>Exercise 2 · Find the Misused Word</h3><p>Mỗi câu có một từ được dùng sai nghĩa. Bấm trực tiếp vào từ sai.</p></div></header>
        <div class="section-body question-grid">${DATA.misuse.map(renderMisuse).join('')}</div>
        ${sectionActions()}
      </section>`;
  }

  function renderMisuse(item) {
    const tokens = item.sentence.match(/[A-Za-z]+(?:[’'][A-Za-z]+)?|[^A-Za-z]+/g) || [];
    const words = tokens.map((token, index) => /^[A-Za-z]/.test(token)
      ? `<button type="button" class="click-word" data-word="${esc(token.replace(/[.,!?;:]$/, ''))}" data-index="${index}">${esc(token)}</button>`
      : esc(token)).join('');
    return `<article class="practice-item misuse-item" data-correct="${esc(item.wrong)}" data-correction="${esc(item.correction)}">
      <h4><span class="item-number">${item.id}</span>Choose the misused word</h4>
      <div class="misuse-sentence">${words}</div><p class="correction" hidden></p>
    </article>`;
  }

  function renderLeadIn(items, id, label) {
    return `<section class="section-card lead-in answer-section">
      <header class="section-head"><div><h3>Lead-in · Paraphrase Decoder</h3><p>${esc(label)} Đọc cụm từ trong bài và chọn cách diễn đạt tương đương.</p></div></header>
      <div class="section-body question-grid">${items.map(item => practiceCard(item, 'paraphrase', id)).join('')}</div>
      ${sectionActions()}
    </section>`;
  }

  function collectRanges(text, phrases) {
    const normalized = text.replace(/’/g, "'").toLowerCase();
    const ranges = [];
    phrases.forEach(({ text: phrase, question }) => {
      const needle = String(phrase).replace(/’/g, "'").toLowerCase();
      const start = normalized.indexOf(needle);
      if (start >= 0) ranges.push({ start, end: start + needle.length, question });
    });
    return ranges.sort((a,b) => a.start - b.start).filter((range, i, all) => !i || range.start >= all[i-1].end);
  }

  function evidenceText(text, phrases, className = 'evidence-mark') {
    const ranges = collectRanges(text, phrases);
    if (!ranges.length) return esc(text);
    let cursor = 0;
    return ranges.map(range => {
      const before = esc(text.slice(cursor, range.start));
      const marked = `<mark class="${className}">${esc(text.slice(range.start, range.end))}</mark><span class="evidence-label">Q${range.question}</span>`;
      cursor = range.end;
      return before + marked;
    }).join('') + esc(text.slice(cursor));
  }

  function listeningQuestion(question, groupId) {
    const item = { options: question.options };
    return `<article class="question-card" data-correct="${question.answer}">
      <h4><span class="item-number">${question.number}</span>${esc(question.stem)}</h4>
      <div class="options">${item.options.map((option,index) => {
        const letter = String.fromCharCode(65 + index);
        return `<label class="option-row" data-letter="${letter}"><input type="radio" name="${groupId}-q${question.number}" value="${letter}"><span class="option-letter">${letter}.</span><span>${esc(option)}</span></label>`;
      }).join('')}</div>
    </article>`;
  }

  function listeningGroup(group) {
    const phrases = group.questions.map(q => ({ text: q.evidence, question: q.number }));
    const range = `${group.questions[0].number}–${group.questions.at(-1).number}`;
    return `<article class="exam-group answer-section" data-group="${esc(group.id)}">
      <header class="media-bar">
        <div><span class="range-label">Questions ${range}</span><h3>${esc(group.title)}</h3></div>
        <audio controls preload="metadata" src="${esc(group.audio)}">Your browser does not support audio.</audio>
      </header>
      <div class="exam-body">
        <div class="exam-questions">${group.questions.map(q => listeningQuestion(q, group.id)).join('')}</div>
        <aside class="script-pane" hidden><h4>Script · Questions ${range}</h4>${group.script.map(block => `<p class="script-block">${block.speaker ? `<span class="speaker">${esc(block.speaker)}: </span>` : ''}${evidenceText(block.text, phrases)}</p>`).join('')}</aside>
      </div>
      <div class="action-row">
        <button type="button" class="action-btn check-action">Check</button>
        <button type="button" class="action-btn secondary script-action">Script</button>
        <button type="button" class="action-btn secondary reset-action">Reset</button>
        <output class="result"></output>
      </div>
    </article>`;
  }

  function renderListening(part) {
    const key = `listening-${part}`;
    const groups = DATA.listening.filter(group => group.part === part);
    return `<section class="panel-heading"><h2>${tabTitles[key][0]}</h2><p>${tabTitles[key][1]}</p></section>
      ${renderLeadIn(DATA.listeningLeadins[part], `listen-lead-${part}`, `Chuẩn bị cho Part ${part}.`)}
      ${groups.map(listeningGroup).join('')}`;
  }

  function annotateReadingParagraph(text, paragraphIndex, passage) {
    const phrases = [];
    passage.questions.forEach(q => q.evidencePhrases.forEach(phrase => {
      if (phrase.p === paragraphIndex) phrases.push({ text: phrase.text, question: q.n });
    }));
    return evidenceText(text, phrases, 'reading-evidence');
  }

  function readingQuestion(question, passageId) {
    return `<article class="question-card" data-correct="${question.answer}">
      <h4><span class="item-number">${question.n}</span>${esc(question.text)}</h4>
      <div class="options">${Object.entries(question.options).map(([letter,option]) => `<label class="option-row" data-letter="${letter}"><input type="radio" name="reading-${passageId}-q${question.n}" value="${letter}"><span class="option-letter">${letter}.</span><span>${esc(option)}</span></label>`).join('')}</div>
    </article>`;
  }

  function renderReading(id) {
    const passage = DATA.passages.find(item => item.id === id);
    const key = `reading-${id}`;
    return `<section class="panel-heading"><h2>${tabTitles[key][0]}</h2><p>${tabTitles[key][1]}</p></section>
      ${renderLeadIn(DATA.readingLeadins[id], `reading-lead-${id}`, `Chuẩn bị cho Passage ${id}.`)}
      <section class="reading-shell answer-section">
        <header class="reading-toolbar"><div><span class="range-label">B1+ · 10 questions</span><h3>${esc(passage.title)}</h3></div><span>Passage ${id}</span></header>
        <div class="reading-layout">
          <article class="passage-pane">${passage.paragraphs.map((text,index) => `<div class="passage-paragraph"><span class="paragraph-number">P${index+1}</span><div>${annotateReadingParagraph(text,index,passage)}</div></div>`).join('')}</article>
          <div class="reading-questions">${passage.questions.map(q => readingQuestion(q,id)).join('')}</div>
        </div>
        ${sectionActions()}
      </section>`;
  }

  function render() {
    pauseAllAudio();
    if (activeTab === 'review') app.innerHTML = renderReview();
    else if (activeTab.startsWith('listening-')) app.innerHTML = renderListening(Number(activeTab.at(-1)));
    else app.innerHTML = renderReading(Number(activeTab.at(-1)));
    app.focus({ preventScroll: true });
    window.scrollTo({ top: document.querySelector('.lesson-nav').offsetTop, behavior: 'instant' });
  }

  function pauseAllAudio() {
    document.querySelectorAll('audio').forEach(audio => audio.pause());
  }

  function checkSection(section) {
    let correctCount = 0;
    let total = 0;
    section.querySelectorAll('.practice-item[data-correct], .question-card[data-correct]').forEach(item => {
      const correct = item.dataset.correct;
      const radios = [...item.querySelectorAll('input[type="radio"]')];
      if (!radios.length) return;
      total += 1;
      item.querySelectorAll('.option-row').forEach(row => row.classList.remove('key-correct','user-wrong'));
      const selected = radios.find(input => input.checked);
      if (!selected) return;
      const selectedRow = selected.closest('.option-row');
      if (selected.value === correct) {
        selectedRow.classList.add('key-correct');
        correctCount += 1;
      } else {
        selectedRow.classList.add('user-wrong');
      }
    });
    section.querySelectorAll('.misuse-item').forEach(item => {
      total += 1;
      const words = [...item.querySelectorAll('.click-word')];
      const selected = words.find(button => button.classList.contains('is-selected'));
      const target = words.find(button => button.dataset.word.toLowerCase() === item.dataset.correct.toLowerCase());
      words.forEach(button => button.classList.remove('key-correct','user-wrong'));
      if (!selected) return;
      if (selected === target) {
        selected.classList.add('key-correct');
        correctCount += 1;
        const correction = item.querySelector('.correction');
        correction.hidden = false;
        correction.innerHTML = `<strong>${esc(item.dataset.correct)}</strong> → <strong>${esc(item.dataset.correction)}</strong>`;
      } else {
        selected.classList.add('user-wrong');
        const correction = item.querySelector('.correction');
        correction.hidden = true;
        correction.textContent = '';
      }
    });
    const result = section.querySelector('.result');
    if (result) result.value = `Score: ${correctCount}/${total}`;
    showToast(`Kết quả: ${correctCount}/${total}`);
  }

  function resetSection(section) {
    section.querySelectorAll('input[type="radio"]').forEach(input => { input.checked = false; });
    section.querySelectorAll('.key-correct,.user-wrong,.is-selected').forEach(element => element.classList.remove('key-correct','user-wrong','is-selected'));
    section.querySelectorAll('.correction').forEach(element => { element.hidden = true; element.textContent = ''; });
    section.classList.remove('evidence-on');
    const result = section.querySelector('.result');
    if (result) result.value = '';
  }

  tabs.forEach(tab => tab.addEventListener('click', () => {
    if (tab.dataset.tab === activeTab) return;
    activeTab = tab.dataset.tab;
    tabs.forEach(item => {
      const selected = item === tab;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-selected', String(selected));
    });
    render();
  }));

  app.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const section = button.closest('.answer-section');
    if (button.classList.contains('check-action')) checkSection(section);
    if (button.classList.contains('reset-action')) resetSection(section);
    if (button.classList.contains('script-action')) {
      const group = button.closest('.exam-group');
      const pane = group.querySelector('.script-pane');
      pane.hidden = !pane.hidden;
      group.classList.toggle('script-open', !pane.hidden);
      button.textContent = pane.hidden ? 'Script' : 'Hide Script';
    }
    if (button.classList.contains('click-word')) {
      const item = button.closest('.misuse-item');
      item.querySelectorAll('.click-word').forEach(word => word.classList.remove('is-selected','key-correct','user-wrong'));
      button.classList.add('is-selected');
      const correction = item.querySelector('.correction');
      correction.hidden = true;
      correction.textContent = '';
    }
  });

  app.addEventListener('change', event => {
    if (event.target.type !== 'radio') return;
    const item = event.target.closest('[data-correct]');
    item.querySelectorAll('.option-row').forEach(row => row.classList.remove('key-correct','user-wrong'));
  });

  document.getElementById('fontDown').addEventListener('click', () => setFont(fontSize - 2));
  document.getElementById('fontUp').addEventListener('click', () => setFont(fontSize + 2));
  function setFont(value) {
    fontSize = Math.max(16, Math.min(28, value));
    document.documentElement.style.setProperty('--reading-size', `${fontSize}px`);
    document.getElementById('fontSize').value = fontSize;
  }

  document.addEventListener('play', event => {
    if (event.target.tagName !== 'AUDIO') return;
    document.querySelectorAll('audio').forEach(audio => { if (audio !== event.target) audio.pause(); });
  }, true);

  render();
})();
