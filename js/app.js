// 화면. 단계마다 #view 를 다시 그리고, 이벤트는 #view 한 곳에서 data-act 로 받는다.
(function () {
  const HS = window.HS;
  const { esc, short, seat, seatOld, dots, pct } = HS;
  const $ = (s, el = document) => el.querySelector(s);
  const view = $('#view');

  let state = HS.load();
  const save = () => HS.save(state);

  const STEPS = [
    { id: 'pick', n: '1', label: '학교 고르기' },
    { id: 'notes', n: '2', label: '해설 입력' },
    { id: 'copy', n: '3', label: '카피 고르기' },
    { id: 'present', n: '4', label: '발표' },
    { id: 'compare', label: '비교' },
    { id: 'handout', label: '배부물' },
    { id: 'export', label: '자료 내려받기' },
  ];

  // ── 머리 ─────────────────────────────────────────────────────
  function renderChrome() {
    const st = state.settings;
    $('#academyLabel').textContent = st.academy;
    $('#eventTitle').textContent = st.title;
    $('#eventMeta').textContent = [st.date, st.seats].filter(Boolean).join(' · ');
    $('#dataBadge').textContent = `학교알리미 공시 ${HS.dataYear} · ${HS.allSchools(state).length.toLocaleString()}교`;
    $('#steps').innerHTML = STEPS.map(s => `
      <button type="button" class="step ${state.step === s.id ? 'on' : ''} ${s.n ? '' : 'sub'}" data-step="${s.id}">
        ${s.n ? `<b>${s.n}</b>` : ''}<span>${s.label}</span>
      </button>`).join('');
    document.title = `${st.title} · 고교선택 가이드`;
  }
  $('#steps').addEventListener('click', e => {
    const b = e.target.closest('[data-step]');
    if (b) go(b.dataset.step);
  });
  function go(step) {
    state.step = step;
    save();
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    renderChrome();
    const fn = { pick: viewPick, notes: viewNotes, copy: viewCopy, present: viewPresent, compare: viewCompare, handout: viewHandout, export: viewExport }[state.step] || viewPick;
    view.className = 'v-' + state.step;
    view.innerHTML = fn();
    after();
  }
  function after() {
    // 축소 미리보기 슬라이드 크기 맞추기
    view.querySelectorAll('.thumb').forEach(fitThumb);
  }
  const ro = new ResizeObserver(entries => entries.forEach(en => fitThumb(en.target)));
  function fitThumb(t) {
    t.style.setProperty('--s', t.clientWidth / 1280);
    if (!t._ro) { t._ro = 1; ro.observe(t); }
  }

  // ── 1. 학교 고르기 ───────────────────────────────────────────
  const TYPES = ['일반고', '자율고', '특수목적고', '특성화고', ''];
  const typeLabel = t => (t ? t.replace('특수목적고', '특목고') : '전체');
  const COEDS = ['', '공학', '남', '녀'];

  function filtered() {
    const f = state.filter;
    const q = f.q.trim().replace(/\s+/g, '');
    let list = HS.allSchools(state).filter(s =>
      (q ? s.name.replace(/\s+/g, '').includes(q) : (!f.sido || s.sido === f.sido) && (!f.sigungu || s.sigungu === f.sigungu)) &&
      (!f.type || s.type === f.type) && (!f.coed || s.coed === f.coed));
    if (f.sort === 'g1') list = list.slice().sort((a, b) => b.g1 - a.g1);
    else if (f.sort === 'g1asc') list = list.slice().sort((a, b) => a.g1 - b.g1);
    return list;
  }

  function viewPick() {
    const f = state.filter;
    const all = HS.allSchools(state);
    const sidos = [...new Set(all.map(s => s.sido))].sort((a, b) => a.localeCompare(b, 'ko'));
    const inSido = all.filter(s => s.sido === f.sido && (!f.type || s.type === f.type) && (!f.coed || s.coed === f.coed));
    const sgg = {};
    inSido.forEach(s => (sgg[s.sigungu] = (sgg[s.sigungu] || 0) + 1));
    const list = filtered();
    const LIMIT = 150;
    const ps = HS.pickedSchools(state);

    return `
    <div class="pick">
      <aside class="panel filters">
        <label class="lbl">학교 검색</label>
        <input class="input" type="search" data-f="q" value="${esc(f.q)}" placeholder="학교 이름 (전국)">
        <label class="lbl">시·도</label>
        <select class="input" data-f="sido">${sidos.map(s => `<option ${s === f.sido ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
        <label class="lbl">유형</label>
        <div class="chips">${TYPES.map(t => `<button type="button" class="chip ${f.type === t ? 'on' : ''}" data-act="ftype" data-v="${t}">${typeLabel(t)}</button>`).join('')}</div>
        <label class="lbl">남녀</label>
        <div class="chips">${COEDS.map(t => `<button type="button" class="chip ${f.coed === t ? 'on' : ''}" data-act="fcoed" data-v="${t}">${t ? (t === '공학' ? '공학' : t + '고') : '전체'}</button>`).join('')}</div>
        <label class="lbl">시·군·구</label>
        <div class="sgg">
          <button type="button" class="sgg-i ${!f.sigungu ? 'on' : ''}" data-act="fsgg" data-v=""><span>전체</span><b>${inSido.length}</b></button>
          ${Object.keys(sgg).sort((a, b) => a.localeCompare(b, 'ko')).map(k => `<button type="button" class="sgg-i ${f.sigungu === k ? 'on' : ''}" data-act="fsgg" data-v="${esc(k)}"><span>${esc(k)}</span><b>${sgg[k]}</b></button>`).join('')}
        </div>
        <details class="add-school">
          <summary>공시에 없는 학교 직접 추가</summary>
          <input class="input" id="addName" placeholder="학교 이름">
          <input class="input" id="addG1" type="number" min="1" placeholder="1학년 학생 수">
          <button type="button" class="btn small" data-act="addSchool">추가하고 담기</button>
        </details>
      </aside>

      <section class="grid-wrap">
        <div class="grid-head">
          <h2>${f.q ? `‘${esc(f.q)}’ 검색` : `${esc(f.sido)} ${esc(f.sigungu || '전체')}`} <span class="muted">${list.length}교</span></h2>
          <select class="input slim" data-f="sort">
            <option value="name" ${f.sort === 'name' ? 'selected' : ''}>이름순</option>
            <option value="g1" ${f.sort === 'g1' ? 'selected' : ''}>1학년 많은 순</option>
            <option value="g1asc" ${f.sort === 'g1asc' ? 'selected' : ''}>1학년 적은 순</option>
          </select>
        </div>
        <div class="cards">${list.slice(0, LIMIT).map(card).join('') || '<p class="empty">조건에 맞는 학교가 없습니다.</p>'}</div>
        ${list.length > LIMIT ? `<p class="muted center">앞의 ${LIMIT}교만 보여 줍니다. 시·군·구를 고르거나 검색해 주세요.</p>` : ''}
      </section>

      <aside class="panel picked">
        <div class="panel-h"><h3>오늘 다룰 학교</h3><span class="muted">${ps.length}곳</span></div>
        ${ps.length ? `<ol class="picked-list">${ps.map((s, i) => `
          <li><b class="num">${i + 1}</b><div><strong>${esc(short(s.name))}</strong><span>1등급 ${seat(s.g1)}자리 · 1학년 ${s.g1}명</span></div>
            <span class="ord"><button type="button" data-act="up" data-id="${s.id}" ${i ? '' : 'disabled'} aria-label="위로">↑</button><button type="button" data-act="toggle" data-id="${s.id}" aria-label="빼기">×</button></span></li>`).join('')}</ol>`
          : '<p class="empty">왼쪽 카드에서 <b>+ 담기</b>를 눌러 설명회에서 다룰 학교를 고르세요. 2~4곳을 권합니다.</p>'}
        <button type="button" class="btn primary block" data-act="go" data-v="notes" ${ps.length ? '' : 'disabled'}>해설 입력으로 →</button>
        <p class="hint">첫 번째 학교가 슬라이드의 주인공이 됩니다. ↑ 로 순서를 바꾸세요.</p>
        ${window.DEMO_STATE ? `<button type="button" class="btn small ghost block" data-act="demo">예시 불러오기 · 진주 3개교 평가계획 분석</button>` : ''}
      </aside>
    </div>`;
  }

  function card(s) {
    const on = state.picked.includes(s.id);
    const k = seat(s.g1);
    const max = Math.max(s.g1, s.g2, s.g3, 1);
    return `<article class="card ${on ? 'on' : ''}">
      <div class="card-h"><strong title="${esc(s.name)}">${esc(s.name)}</strong>
        <button type="button" class="pickbtn" data-act="toggle" data-id="${s.id}">${on ? '✓ 담김' : '+ 담기'}</button></div>
      <div class="card-sub">${esc([s.sigungu, s.fond, s.coed === '공학' ? '남녀공학' : s.coed ? s.coed + '학교' : '', typeLabel(s.type)].filter(Boolean).join(' · '))}</div>
      <div class="card-k"><b>${k}</b><span>명<br>1등급 자리</span>
        <div class="card-g1">1학년 <b>${s.g1}</b>명${s.c1 ? `<br>${s.c1}학급 · 학급당 ${(s.g1 / s.c1).toFixed(1)}명` : ''}</div></div>
      ${s.sid ? `<a class="card-link" href="${HS.infoUrl(s)}" target="_blank" rel="noopener">학교알리미 공시 · 평가계획 ↗</a>` : ''}
      <div class="mini">${[['1', s.g1], ['2', s.g2], ['3', s.g3]].map(([g, v]) => `<div><span>${g}학년</span><i style="width:${(v / max) * 100}%"></i><b>${v || '-'}</b></div>`).join('')}</div>
    </article>`;
  }

  // ── 2. 해설 입력 ─────────────────────────────────────────────
  function viewNotes() {
    const ps = HS.pickedSchools(state);
    if (!ps.length) return needSchools();
    if (!ps.find(s => s.id === state.activeNote)) state.activeNote = ps[0].id;
    const s = HS.byId(state, state.activeNote);
    const n = HS.note(state, s.id);
    const fld = (k, label, ph, type = 'text') => `<label class="fld"><span>${label}</span><input class="input" type="${type}" data-n="${k}" value="${esc(n[k])}" placeholder="${esc(ph)}"></label>`;
    const pfld = (k, label, ph) => `<label class="fld"><span>${label}</span><input class="input" type="number" data-p="${k}" value="${esc(n.plan[k])}" placeholder="${esc(ph)}"></label>`;
    return `
    <div class="tabs">${ps.map(x => `<button type="button" class="tab ${x.id === s.id ? 'on' : ''}" data-act="note" data-id="${x.id}">${esc(short(x.name))}${HS.hasExam(state.notes[x.id]) ? ' <i class="dot-ok"></i>' : ''}</button>`).join('')}</div>
    <div class="notes">
      <section class="panel form">
        <div class="panel-h"><h3>${esc(s.name)}</h3><span class="muted">1학년 ${s.g1}명 · 1등급 ${seat(s.g1)}자리</span></div>
        <div class="lbl">시험 특징 <span class="muted">학교 평가계획서·기출을 보고 적어 주세요</span></div>
        <div class="grid4">
          ${fld('subject', '과목', '영어')}
          ${fld('type', '유형', '서술형')}
          ${fld('value', '수치', '40%')}
          ${fld('when', '시기', '1학기 중간고사')}
        </div>
        <label class="fld"><span>그래서 어떻게 되나</span><input class="input" data-n="then" value="${esc(n.then)}" placeholder="객관식만 풀어 온 학생이 첫 시험에서 무너집니다"></label>
        <div class="lbl">대책 <span class="muted">학원이 잡아 주는 순서</span></div>
        <div class="actions-list">${(n.actions || ['']).map((t, i) => `
          <div class="act-row"><b class="num">${i + 1}</b><input class="input" data-a="${i}" value="${esc(t)}" placeholder="${['겨울방학에 서술형 훈련을 먼저 잡습니다', '3월 개학 전 기출 어휘 1,200개를 끝냅니다', '1학기 중간 4주 전부터 학교별 대비반을 엽니다'][i] || '대책을 적어 주세요'}">
          ${i ? `<button type="button" class="x" data-act="delAction" data-i="${i}" aria-label="삭제">×</button>` : ''}</div>`).join('')}</div>
        <button type="button" class="btn small ghost" data-act="addAction">+ 대책 한 줄 더</button>
        <div class="lbl">대안</div>
        <div class="grid2">
          <label class="fld"><span>이 학교를 쓴다면</span><input class="input" data-n="ifThis" value="${esc(n.ifThis)}" placeholder="서술형 훈련을 겨울방학에 먼저 시작합니다"></label>
          <label class="fld"><span>다른 학교라면</span><input class="input" data-n="ifOther" value="${esc(n.ifOther)}" placeholder="어휘량을 먼저 끌어올립니다"></label>
        </div>
        <div class="lbl">평가계획 <span class="muted">학교알리미 → 「교과별(학년별) 교수·학습 및 평가계획」 → 1학년 1학기 파일의 ${esc(state.settings.subject || '영어')} 쪽 ‘평가의 종류와 반영비율’ 표</span></div>
        ${s.sid ? `<a class="btn small plan-open" href="${HS.infoUrl(s)}" target="_blank" rel="noopener">${esc(short(s.name))} 학교알리미 공시 열기 ↗</a>` : ''}
        <div class="grid4">
          ${pfld('w1', '1차 시험 반영 (%)', '30')}
          ${pfld('w2', '2차 시험 반영 (%)', '30')}
          ${pfld('perf', '수행평가 반영 (%)', '40')}
          ${pfld('essay', '시험 중 서·논술 (%)', '40')}
        </div>
        <div class="fld"><span>수행평가 과제</span></div>
        <div class="actions-list">${n.plan.tasks.map((t, i) => `
          <div class="task-row">
            <input class="input" data-t="${i}:name" value="${esc(t.name)}" placeholder="${['기사문 읽고 요약문 쓰기', '영어 말하기 발표', '읽기 포트폴리오'][i] || '과제 이름'}">
            <input class="input" data-t="${i}:w" value="${esc(t.w)}" placeholder="비율 %" type="number">
            <input class="input" data-t="${i}:how" value="${esc(t.how)}" placeholder="방법 (서술·논술, 구술발표 …)">
            ${i ? `<button type="button" class="x" data-act="delTask" data-i="${i}" aria-label="삭제">×</button>` : '<span></span>'}
          </div>`).join('')}</div>
        <button type="button" class="btn small ghost" data-act="addTask">+ 수행평가 과제 추가</button>
        <label class="fld"><span>출처</span><input class="input" data-p="src" value="${esc(n.plan.src)}" placeholder="학교알리미 공시 「교과별 교수·학습 및 평가계획」 2026 1학기 1학년 공통영어1"></label>
        <div class="lbl">공시 보충 <span class="muted">학교알리미 학교별 공시에서 보고 적으면 비교·표에 나옵니다 (선택)</span></div>
        <div class="grid2">
          ${fld('engA', (state.settings.subject || '영어') + ' 성취도 A 비율 (%)', '24.6', 'number')}
          ${fld('univ', '4년제 대학 진학률 (%)', '74.9', 'number')}
        </div>
        <div class="row-end">
          ${ps.length > 1 ? `<button type="button" class="btn ghost" data-act="nextNote">다음 학교 →</button>` : ''}
          <button type="button" class="btn primary" data-act="go" data-v="copy">카피 고르기 →</button>
        </div>
      </section>
      <aside class="panel preview" id="notePreview">${notePreview(s, n)}</aside>
    </div>`;
  }

  function notePreview(s, n) {
    const exam = HS.examLine(s, n), then = HS.thenLine(n);
    const acts = (n.actions || []).filter(Boolean);
    const box = (tone, tag, body, empty) => `<div class="say ${tone} ${body ? '' : 'empty'}"><span class="say-tag">${tag}</span><p>${body || empty}</p></div>`;
    return `
      <div class="panel-h"><h3>이렇게 말하게 됩니다</h3><span class="muted">입력하면 바로 바뀝니다</span></div>
      ${box('red', '시험 문장', esc(exam), '과목·유형·수치를 채우면 문장이 나옵니다.')}
      ${box('red', '그래서', esc(then), '‘그래서 어떻게 되나’를 채워 주세요.')}
      ${box('green', '대책', acts.map((t, i) => `${i + 1}. ${esc(HS.end(t))}`).join('<br>'), '대책을 채우면 학부모가 안심할 문장이 나옵니다.')}
      ${box('yellow', '대안', [n.ifThis && `이 학교라면 — ${esc(HS.end(n.ifThis))}`, n.ifOther && `다른 학교라면 — ${esc(HS.end(n.ifOther))}`].filter(Boolean).join('<br>'), '어느 쪽을 골라도 할 일이 있다는 걸 보여 줍니다.')}
      <div class="say plan-prev ${HS.hasPlan(n) ? '' : 'empty'}"><span class="say-tag">평가 구조</span>${HS.hasPlan(n) ? HS.planRow(s, n) : '<p>평가계획 반영비율을 채우면 막대 그림이 나옵니다.</p>'}</div>
      <p class="hint">한 번 적어 둔 해설은 내년 설명회에도 그대로 다시 씁니다. 학교가 평가계획을 바꾸면 그 부분만 고치세요.</p>`;
  }

  // ── 3. 카피 고르기 ───────────────────────────────────────────
  function viewCopy() {
    const ps = HS.pickedSchools(state);
    if (!ps.length) return needSchools();
    const list = HS.openings(state);
    const cur = HS.currentOpening(state);
    const all = HS.buildSlides(state, { all: true });
    const counts = {};
    all.forEach(s => (counts[s.kind] = (counts[s.kind] || 0) + 1));
    return `
    <div class="copy">
      <section class="panel">
        <div class="panel-h"><h3>어떻게 열까요</h3><span class="muted">첫 30초가 설명회 전체 분위기를 정합니다</span></div>
        <div class="openings">${list.map(o => `
          <button type="button" class="opening ${o.id === cur.id ? 'on' : ''}" data-act="opening" data-v="${o.id}">
            <strong>${o.label}</strong><span>${o.desc}</span></button>`).join('')}</div>
        <div class="panel-h"><h3>첫 문장 고르기</h3><span class="muted">표지와 대본 첫 줄에 들어갑니다</span></div>
        <div class="lines">${cur.lines.map((l, i) => `
          <label class="line ${l === cur.line ? 'on' : ''}"><input type="radio" name="first" data-act="first" data-v="${i}" ${l === cur.line ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>
        <div class="row-end"><button type="button" class="btn primary" data-act="go" data-v="present">발표 자료 만들기 →</button></div>
      </section>
      <aside class="panel flow">
        <div class="panel-h"><h3>설명회 흐름</h3><span class="muted">끄면 발표에서 빠집니다</span></div>
        ${HS.SLIDE_KINDS.map(k => {
          const c = counts[k.kind] || 0;
          return `<label class="flow-i t-${k.tone} ${c ? '' : 'na'}">
            <input type="checkbox" data-act="hide" data-v="${k.kind}" ${state.hidden[k.kind] ? '' : 'checked'} ${c ? '' : 'disabled'}>
            <span>${k.label}</span><b>${c ? c + '장' : k.kind === 'exam' ? '해설 입력 필요' : k.kind === 'compare' ? '학교 2곳 이상' : k.kind === 'decide' ? '대안 입력 필요' : '-'}</b></label>`;
        }).join('')}
        <p class="hint">총 ${HS.buildSlides(state).length}장 · 한 장에 1분 남짓, 15분 안쪽 설명회 분량입니다.</p>
      </aside>
    </div>`;
  }

  // ── 4. 발표 ─────────────────────────────────────────────────
  function viewPresent() {
    const ps = HS.pickedSchools(state);
    if (!ps.length) return needSchools();
    const slides = HS.buildSlides(state);
    return `
    <div class="present-head">
      <div><h2>발표 자료 <span class="muted">${slides.length}장</span></h2><p class="muted">슬라이드를 누르면 그 장부터 발표합니다. 아래 회색 글은 대본입니다.</p></div>
      <button type="button" class="btn primary lg" data-act="play" data-i="0">▶ 발표 시작</button>
    </div>
    <div class="thumbs">${slides.map((sl, i) => `
      <figure class="thumb-wrap">
        <button type="button" class="thumb" data-act="play" data-i="${i}" aria-label="${i + 1}번 슬라이드부터 발표">${HS.frame(state, sl, i, slides.length)}</button>
        <figcaption>${esc(sl.script)}</figcaption>
      </figure>`).join('')}</div>`;
  }

  let pIdx = 0, pScript = true;
  function play(i) {
    pIdx = i;
    $('#present').hidden = false;
    document.body.classList.add('presenting');
    drawPresent();
  }
  function drawPresent() {
    const slides = HS.buildSlides(state);
    pIdx = Math.max(0, Math.min(slides.length - 1, pIdx));
    const sl = slides[pIdx];
    $('#presentStage').innerHTML = HS.frame(state, sl, pIdx, slides.length);
    $('#presentScript').textContent = sl.script;
    $('#presentScript').hidden = !pScript;
    $('#presentCount').textContent = `${pIdx + 1} / ${slides.length}`;
    fitPresent();
  }
  function fitPresent() {
    const wrap = $('.present-stage-wrap');
    const k = Math.min(wrap.clientWidth / 1280, wrap.clientHeight / 720);
    $('#presentStage').style.setProperty('--s', k);
  }
  function stopPresent() {
    $('#present').hidden = true;
    document.body.classList.remove('presenting');
    if (document.fullscreenElement) document.exitFullscreen();
  }
  window.addEventListener('resize', () => { if (!$('#present').hidden) fitPresent(); });
  document.addEventListener('keydown', e => {
    if ($('#present').hidden) return;
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { pIdx++; drawPresent(); e.preventDefault(); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { pIdx--; drawPresent(); e.preventDefault(); }
    else if (e.key === 'Escape') stopPresent();
    else if (e.key.toLowerCase() === 's') { pScript = !pScript; drawPresent(); }
    else if (e.key.toLowerCase() === 'f') { document.fullscreenElement ? document.exitFullscreen() : $('#present').requestFullscreen(); }
  });
  $('#present').addEventListener('click', e => {
    if (e.target.closest('.present-script')) return;
    const x = e.clientX / window.innerWidth;
    pIdx += x < 0.3 ? -1 : 1;
    drawPresent();
  });

  // ── 비교 ─────────────────────────────────────────────────────
  const PALETTE = ['#2F6F62', '#D9573B', '#C9A227', '#3D6FB6', '#8A5BB8', '#4E9A8F', '#B86B3D', '#6B7A8F'];

  function viewCompare() {
    const ps = HS.pickedSchools(state);
    if (!ps.length) return needSchools();
    const maxG = Math.max(...ps.flatMap(s => [s.g1, s.g2, s.g3]), 1);
    const maxK = Math.max(...ps.map(s => seat(s.g1)), 1);
    const legend = ps.map((s, i) => `<span><i style="background:${PALETTE[i % 8]}"></i>${esc(short(s.name))}</span>`).join('');
    return `
    <div class="compare">
      <section class="panel">
        <div class="panel-h"><h3>학년별 학생 수</h3><span class="muted">학교알리미 공시 ${esc(HS.dataYear)}</span></div>
        <div class="hbars">${ps.map((s, i) => `
          <div class="hb-group"><div class="hb-name">${esc(short(s.name))}</div>
            ${[['1학년', s.g1], ['2학년', s.g2], ['3학년', s.g3]].map(([g, v], j) => `
              <div class="hb"><span>${g}</span><div class="track"><i style="width:${(v / maxG) * 100}%;background:${PALETTE[i % 8]};opacity:${1 - j * 0.25}"></i></div><b>${v}</b></div>`).join('')}
          </div>`).join('')}</div>
        <div class="panel-h"><h3>1등급 자리</h3><span class="muted">1학년 × 10%, 소수점 버림</span></div>
        <div class="hbars">${ps.map((s, i) => `
          <div class="hb big"><span>${esc(short(s.name))}</span><div class="track"><i style="width:${(seat(s.g1) / maxK) * 100}%;background:${PALETTE[i % 8]}"></i></div><b>${seat(s.g1)}자리</b></div>`).join('')}</div>
      </section>
      <section class="panel">
        <div class="panel-h"><h3>규모와 성격 한눈에</h3><span class="muted">항목마다 가장 큰 학교를 바깥 끝으로 맞춘 그림</span></div>
        ${radar(ps)}
        <div class="legend">${legend}</div>
        ${HS.tableHtml(ps, id => state.notes[id] || {}, state.settings, 'tbl')}
      </section>
      ${ps.some(s => HS.hasPlan(state.notes[s.id])) ? `<section class="panel wide">
        <div class="panel-h"><h3>${esc(state.settings.subject || '영어')} 평가 구조</h3><span class="muted">학교알리미 「교과별 교수·학습 및 평가계획」 공시</span></div>
        <div class="sl-plans app">${ps.filter(s => HS.hasPlan(state.notes[s.id])).map(s => HS.planRow(s, state.notes[s.id])).join('')}</div>
      </section>` : ''}
    </div>`;
  }

  function radar(ps) {
    const notes = id => state.notes[id] || {};
    const axes = [
      ['1학년', s => s.g1], ['2학년', s => s.g2], ['3학년', s => s.g3],
      ['1등급 자리', s => seat(s.g1)], ['학급당 학생', s => (s.c1 ? s.g1 / s.c1 : 0)],
    ];
    if (ps.some(s => notes(s.id).engA)) axes.push([(state.settings.subject || '영어') + ' A', s => +notes(s.id).engA || 0]);
    if (ps.some(s => notes(s.id).univ)) axes.push(['4년제 진학', s => +notes(s.id).univ || 0]);
    const R = 150, cx = 220, cy = 190, N = axes.length;
    const pt = (i, r) => [cx + r * Math.sin((2 * Math.PI * i) / N), cy - r * Math.cos((2 * Math.PI * i) / N)];
    const max = axes.map(([, f]) => Math.max(...ps.map(f), 1));
    let g = '';
    for (const lv of [0.25, 0.5, 0.75, 1]) g += `<polygon points="${axes.map((_, i) => pt(i, R * lv).join(',')).join(' ')}" fill="none" stroke="var(--line)"/>`;
    axes.forEach(([label], i) => {
      const [x, y] = pt(i, R), [lx, ly] = pt(i, R + 26);
      g += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--line)"/><text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle">${esc(label)}</text>`;
    });
    ps.forEach((s, j) => {
      const pts = axes.map(([, f], i) => pt(i, R * (f(s) / max[i])).join(',')).join(' ');
      g += `<polygon points="${pts}" fill="${PALETTE[j % 8]}" fill-opacity=".12" stroke="${PALETTE[j % 8]}" stroke-width="2"/>`;
    });
    return `<svg class="radar" viewBox="0 0 440 380" role="img" aria-label="학교 비교 레이더 그림">${g}</svg>`;
  }

  // ── 배부물 ───────────────────────────────────────────────────
  function handoutHtml() {
    const ps = HS.pickedSchools(state);
    const st = state.settings;
    const [a, b] = ps;
    const notes = id => state.notes[id] || {};
    const head = a ? (b
      ? `${HS.josa(short(a.name), '은/는')} <mark>${seat(a.g1)}자리</mark>, ${HS.josa(short(b.name), '은/는')} ${seat(b.g1)}자리입니다.`
      : `${short(a.name)} 1학년 ${a.g1}명 중 <mark>${seat(a.g1)}자리</mark>입니다.`) : '';
    const exams = ps.filter(s => HS.hasExam(notes(s.id)));
    return `<article class="handout">
      <div class="ho-top"><span>${esc(st.academy)}</span><span>${esc(st.date)}</span></div>
      <h1>${esc(st.title)}</h1>
      <h2>학교마다 1등급 자리 수가 다릅니다.<br>${head}</h2>
      <div class="ho-row">
        ${a ? `<div class="ho-dots"><span class="muted">${esc(short(a.name))} 1학년 ${a.g1}명 가운데 1등급이 되는 ${seat(a.g1)}명</span>${dots(a.g1, seat(a.g1), { size: 6, gap: 3, cols: 32, width: 300 })}</div>` : ''}
        <div class="ho-g5"><h3>지금 중3부터 내신이 5등급으로 바뀝니다</h3>
          <div class="sl-grade5 small">${HS.GRADE5.map((p, i) => `<div style="flex:${p}" class="g${i + 1}"><b>${i + 1}등급</b><span>${p}%</span></div>`).join('')}</div>
          <p class="small">1등급이 상위 4%에서 10%로 늘었습니다.${a ? ` 예전 기준이면 ${HS.josa(short(a.name), '은/는')} ${seatOld(a.g1)}명, 지금은 ${seat(a.g1)}명입니다.` : ''}</p></div>
      </div>
      <h3>오늘 다룬 학교</h3>
      ${HS.tableHtml(ps, notes, st, 'tbl ho-tbl')}
      <p class="muted small">학교알리미 공시 ${esc(HS.dataYear)}년 기준. 1등급 자리는 학년 정원의 10%로 계산했습니다.</p>
      ${ps.some(s => HS.hasPlan(notes(s.id))) ? `<h3>학교마다 ${esc(st.subject || '영어')} 시험 구조가 다릅니다</h3><div class="sl-plans ho">${ps.filter(s => HS.hasPlan(notes(s.id))).map(s => HS.planRow(s, notes(s.id))).join('')}</div>` : ''}
      ${exams.length ? `<h3>학교별로 미리 준비할 것</h3><div class="ho-exams n${Math.min(3, exams.length)}">${exams.map(s => {
        const n = notes(s.id);
        const acts = (n.actions || []).filter(Boolean);
        return `<div class="ho-exam"><strong>${esc(HS.examLine(s, n))}</strong>${n.then ? `<p>${esc(HS.thenLine(n))}</p>` : ''}${acts.length ? `<ul>${acts.map(t => `<li>${esc(HS.end(t))}</li>`).join('')}</ul>` : ''}</div>`;
      }).join('')}</div>` : ''}
      <div class="ho-cta"><strong>개별 상담은 한 가정당 10분입니다</strong><span>${esc(st.academy)}${st.phone ? ' · ' + esc(st.phone) : ''}</span></div>
    </article>`;
  }
  function viewHandout() {
    if (!state.picked.length) return needSchools();
    return `
    <div class="present-head no-print">
      <div><h2>학부모 배부물 <span class="muted">A4 한 장</span></h2><p class="muted">설명회 끝나고 나눠 드릴 요약지입니다. 학원 이름은 설정에서 바꿉니다.</p></div>
      <button type="button" class="btn primary lg" data-act="print">인쇄하기 · A4 한 장</button>
    </div>
    <div class="handout-wrap">${handoutHtml()}</div>`;
  }

  // ── 내려받기 ─────────────────────────────────────────────────
  function viewExport() {
    const n = HS.buildSlides(state).length;
    return `
    <div class="export">
      <section class="panel">
        <h3>발표 자료 (HTML)</h3>
        <p class="muted">슬라이드 ${n}장과 대본을 파일 하나로 내려받습니다. 인터넷 없이 열리고, 열어서 <b>인쇄 · PDF로 저장</b>을 누르면 PDF가 됩니다.</p>
        <button type="button" class="btn primary" data-act="dlSlides" ${state.picked.length ? '' : 'disabled'}>발표 자료 내려받기</button>
      </section>
      <section class="panel">
        <h3>학부모 배부물 (HTML)</h3>
        <p class="muted">A4 한 장짜리 요약지를 파일로 받습니다. 학원 컴퓨터에서 열어 바로 인쇄하세요.</p>
        <button type="button" class="btn primary" data-act="dlHandout" ${state.picked.length ? '' : 'disabled'}>배부물 내려받기</button>
      </section>
      <section class="panel">
        <h3>작업 백업</h3>
        <p class="muted">고른 학교, 해설, 카피를 파일로 저장합니다. 다른 컴퓨터에서 불러오면 그대로 이어서 작업합니다. 작업 내용은 이 브라우저에만 저장되니 가끔 백업해 두세요.</p>
        <div class="row">
          <button type="button" class="btn" data-act="backup">백업 내려받기</button>
          <label class="btn ghost">백업 불러오기<input type="file" accept=".json,application/json" data-act="restore" hidden></label>
          <button type="button" class="btn ghost danger" data-act="reset">처음부터 다시</button>
        </div>
      </section>
      <section class="panel">
        <h3>데이터 출처</h3>
        <p class="muted">학교알리미 공개용데이터 ‘학년별·학급별 학생수’와 ‘학교기본정보’, ${esc(HS.dataYear)}년 공시입니다 (${esc(HS.dataDate || '')} 수집). 1등급 자리는 1학년 학생 수의 10%를 소수점 버림으로 계산했습니다. 성취도 A 비율과 4년제 진학률은 공개용데이터에 없어서 해설 입력에서 직접 넣습니다.</p>
      </section>
    </div>`;
  }

  async function cssText(href) {
    try {
      const r = await fetch(href);
      if (r.ok) return await r.text();
    } catch (e) { /* file:// 에서는 fetch 가 막힌다 */ }
    const sheet = [...document.styleSheets].find(s => s.href && s.href.includes(href));
    try { return [...sheet.cssRules].map(r => r.cssText).join('\n'); } catch (e) { return ''; }
  }
  function download(name, text, type = 'text/html') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  const fileStamp = () => new Date().toISOString().slice(0, 10);
  const FONT = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">';

  async function dlSlides() {
    const css = await cssText('css/slides.css');
    const slides = HS.buildSlides(state);
    const st = state.settings;
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(st.title)}</title>${FONT}<style>${css}
body{margin:0;background:#E9E6DF;font-family:'Pretendard Variable',Pretendard,system-ui,sans-serif}
.bar{position:sticky;top:0;z-index:5;display:flex;gap:12px;align-items:center;padding:10px 20px;background:#1b1b1b;color:#fff;font-size:14px}
.bar b{margin-right:auto}.bar button{background:#FFD43B;border:0;border-radius:8px;padding:8px 14px;font:inherit;font-weight:700;cursor:pointer}
.list{display:flex;flex-direction:column;align-items:center;gap:28px;padding:28px 12px}
.page{width:min(1280px,100%)}.wrap{width:100%;aspect-ratio:16/9;overflow:hidden;position:relative;box-shadow:0 2px 12px rgba(0,0,0,.12)}
.wrap .slide{position:absolute;top:0;left:0;transform-origin:0 0}
.script{background:#fff;padding:14px 18px;font-size:15px;line-height:1.7;color:#444;border-radius:0 0 8px 8px}
.show{position:fixed;inset:0;background:#111;display:none;align-items:center;justify-content:center;z-index:9}.show.on{display:flex}
@media print{@page{size:1280px 720px;margin:0}body{background:#fff}.bar,.script{display:none}.list{padding:0;gap:0}.page{width:1280px;break-after:page}.wrap{box-shadow:none;aspect-ratio:auto;height:720px}.wrap .slide{transform:none}}
</style></head><body>
<div class="bar"><b>${esc(st.academy)} · ${esc(st.title)}</b><button onclick="present(0)">▶ 발표</button><button onclick="print()">인쇄 · PDF로 저장</button></div>
<div class="list">${slides.map((sl, i) => `<div class="page"><div class="wrap">${HS.frame(state, sl, i, slides.length)}</div><div class="script">${esc(sl.script)}</div></div>`).join('')}</div>
<div class="show" id="show"></div>
<script>
var pages=[].slice.call(document.querySelectorAll('.page .slide')),cur=-1,show=document.getElementById('show');
// 화면 폭에 맞춰 1280×720 슬라이드를 줄인다
function fit(){document.querySelectorAll('.wrap').forEach(function(w){w.firstElementChild.style.transform='scale('+(w.clientWidth/1280)+')'});if(cur>=0){var k=Math.min(innerWidth/1280,innerHeight/720);show.firstElementChild.style.transform='scale('+k+')'}}
function present(i){cur=Math.max(0,Math.min(pages.length-1,i));show.innerHTML='';var c=pages[cur].cloneNode(true);c.style.transformOrigin='center';show.appendChild(c);show.classList.add('on');fit()}
document.addEventListener('keydown',function(e){if(cur<0)return;if(['ArrowRight',' ','PageDown','Enter'].indexOf(e.key)>=0)present(cur+1);else if(['ArrowLeft','PageUp'].indexOf(e.key)>=0)present(cur-1);else if(e.key==='Escape'){cur=-1;show.classList.remove('on')}});
show.addEventListener('click',function(e){present(cur+(e.clientX<innerWidth*.3?-1:1))});
addEventListener('resize',fit);addEventListener('beforeprint',function(){document.querySelectorAll('.wrap .slide').forEach(function(s){s.style.transform='none'})});addEventListener('afterprint',fit);fit();
</script></body></html>`;
    download(`${st.academy}_설명회발표_${fileStamp()}.html`, html);
  }

  async function dlHandout() {
    const css = (await cssText('css/app.css')) + '\n' + (await cssText('css/slides.css'));
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(state.settings.title)} 배부물</title>${FONT}<style>${css}
body{background:#E9E6DF}.handout-wrap{padding:24px 0}.printbtn{position:fixed;right:20px;top:20px}@media print{.printbtn{display:none}}</style></head>
<body><button class="btn primary printbtn" onclick="print()">인쇄하기</button><div class="handout-wrap">${handoutHtml()}</div></body></html>`;
    download(`${state.settings.academy}_배부물_${fileStamp()}.html`, html);
  }

  // ── 공통 ─────────────────────────────────────────────────────
  function needSchools() {
    return `<div class="panel empty-big"><h2>먼저 다룰 학교를 골라 주세요</h2><p class="muted">1단계에서 학교를 담으면 해설, 카피, 발표 자료가 만들어집니다.</p>
      <button type="button" class="btn primary" data-act="go" data-v="pick">학교 고르기로</button></div>`;
  }

  view.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || el.tagName === 'INPUT') return;
    const act = el.dataset.act, v = el.dataset.v, id = el.dataset.id;
    const f = state.filter;
    switch (act) {
      case 'go': return go(v);
      case 'ftype': f.type = v; break;
      case 'fcoed': f.coed = v; break;
      case 'fsgg': f.sigungu = v; f.q = ''; break;
      case 'toggle': {
        const i = state.picked.indexOf(id);
        if (i >= 0) state.picked.splice(i, 1); else state.picked.push(id);
        break;
      }
      case 'up': {
        const i = state.picked.indexOf(id);
        if (i > 0) [state.picked[i - 1], state.picked[i]] = [state.picked[i], state.picked[i - 1]];
        break;
      }
      case 'addSchool': {
        const name = $('#addName').value.trim(), g1 = parseInt($('#addG1').value, 10);
        if (!name || !(g1 > 0)) { alert('학교 이름과 1학년 학생 수를 넣어 주세요.'); return; }
        const s = { id: 'c' + Date.now(), name, sido: f.sido, sigungu: f.sigungu || '직접 추가', type: f.type || '일반고', fond: '', coed: '', g1, g2: 0, g3: 0, c1: 0, c2: 0, c3: 0, custom: true };
        state.custom.push(s);
        state.picked.push(s.id);
        break;
      }
      case 'note': state.activeNote = id; break;
      case 'nextNote': {
        const i = state.picked.indexOf(state.activeNote);
        state.activeNote = state.picked[(i + 1) % state.picked.length];
        break;
      }
      case 'addAction': HS.note(state, state.activeNote).actions.push(''); break;
      case 'delAction': HS.note(state, state.activeNote).actions.splice(+el.dataset.i, 1); break;
      case 'addTask': HS.note(state, state.activeNote).plan.tasks.push({ name: '', w: '', how: '' }); break;
      case 'delTask': HS.note(state, state.activeNote).plan.tasks.splice(+el.dataset.i, 1); break;
      case 'demo':
        if (state.picked.length && !confirm('지금 고른 학교와 해설을 진주 예시로 바꿀까요?')) return;
        state = Object.assign(HS.defaults(), JSON.parse(JSON.stringify(window.DEMO_STATE)));
        break;
      case 'opening': state.copy.opening = v; state.copy.first = 0; break;
      case 'play': return play(+el.dataset.i);
      case 'print': return window.print();
      case 'dlSlides': return dlSlides();
      case 'dlHandout': return dlHandout();
      case 'backup': return download(`고교선택가이드_백업_${fileStamp()}.json`, JSON.stringify(state, null, 2), 'application/json');
      case 'reset':
        if (!confirm('고른 학교와 해설을 모두 지우고 처음부터 시작할까요? 먼저 백업을 받아 두면 되돌릴 수 있습니다.')) return;
        state = HS.defaults();
        break;
      default: return;
    }
    save();
    render();
  });

  view.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.f) {
      state.filter[el.dataset.f] = el.value;
      if (el.dataset.f === 'sido') state.filter.sigungu = '';
    } else if (el.dataset.act === 'first') state.copy.first = +el.dataset.v;
    else if (el.dataset.act === 'hide') state.hidden[el.dataset.v] = !el.checked;
    else if (el.dataset.act === 'restore') return restore(el.files[0]);
    else return;
    save();
    render();
  });

  let qTimer;
  view.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.f === 'q') {
      clearTimeout(qTimer);
      qTimer = setTimeout(() => {
        state.filter.q = el.value;
        save();
        const pos = el.selectionStart;
        render();
        const q = view.querySelector('[data-f="q"]');
        q.focus();
        q.setSelectionRange(pos, pos);
      }, 250);
      return;
    }
    if (el.dataset.n || el.dataset.a || el.dataset.p || el.dataset.t) {
      const n = HS.note(state, state.activeNote);
      if (el.dataset.n) n[el.dataset.n] = el.value;
      else if (el.dataset.a) n.actions[+el.dataset.a] = el.value;
      else if (el.dataset.p) n.plan[el.dataset.p] = el.value;
      else { const [i, k] = el.dataset.t.split(':'); n.plan.tasks[+i][k] = el.value; }
      save();
      $('#notePreview').innerHTML = notePreview(HS.byId(state, state.activeNote), n);
    }
  });

  function restore(file) {
    if (!file) return;
    file.text().then(t => {
      try {
        const data = JSON.parse(t);
        if (!data.settings || !Array.isArray(data.picked)) throw new Error();
        state = Object.assign(HS.defaults(), data);
        save();
        render();
        alert('백업을 불러왔습니다.');
      } catch (e) { alert('백업 파일이 아닙니다.'); }
    });
  }

  // ── 설정 ─────────────────────────────────────────────────────
  const dlg = $('#settingsDlg');
  $('#btnSettings').addEventListener('click', () => {
    const fm = dlg.querySelector('form');
    for (const [k, v] of Object.entries(state.settings)) if (fm.elements[k]) fm.elements[k].value = v;
    dlg.showModal();
  });
  dlg.addEventListener('close', () => {
    if (dlg.returnValue !== 'ok') return;
    const fm = dlg.querySelector('form');
    for (const k of Object.keys(state.settings)) if (fm.elements[k]) state.settings[k] = fm.elements[k].value.trim();
    save();
    render();
  });

  if (!window.SCHOOL_DATA) {
    view.innerHTML = '<div class="panel empty-big"><h2>학교 데이터를 찾지 못했습니다</h2><p class="muted">data/schools.js 가 있는지 확인하고, 없으면 <code>node tools/fetch_data.mjs</code> 를 실행하세요.</p></div>';
  } else {
    render();
  }
})();
