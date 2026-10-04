// 설명회 슬라이드와 대본을 만든다. 발표 화면, 카피 단계 미리보기, 내려받기 HTML 이 모두 이것을 쓴다.
(function () {
  const HS = window.HS;
  const { esc, short, seat, seatOld, dots, josa: J, pct } = HS;

  // 슬라이드 종류 — 카피 단계의 '설명회 흐름'에 이 순서로 나온다.
  HS.SLIDE_KINDS = [
    { kind: 'title', label: '표지', tone: 'dark' },
    { kind: 'agenda', label: '오늘 순서', tone: '' },
    { kind: 'dots', label: '1학년 수 · 1등급 자리', tone: 'green' },
    { kind: 'compare', label: '같은 아이, 다른 학교', tone: 'green' },
    { kind: 'policy', label: '5등급제 변화', tone: 'blue' },
    { kind: 'plan', label: '학교별 평가 구조', tone: 'red' },
    { kind: 'exam', label: '학교별 시험 특징', tone: 'red' },
    { kind: 'table', label: '학교별 1등급 자리 표', tone: '' },
    { kind: 'decide', label: '지금 정할 것', tone: 'yellow' },
    { kind: 'cta', label: '개별 상담 안내', tone: 'dark' },
  ];

  HS.buildSlides = (state, opt = {}) => {
    const st = state.settings;
    const ps = HS.pickedSchools(state);
    const notes = id => state.notes[id] || {};
    const [a, b] = ps;
    const opening = HS.currentOpening(state);
    const out = [];
    const add = (kind, html, script) => {
      if (!opt.all && state.hidden[kind]) return;
      out.push({ kind, html, script });
    };
    const names = ps.map(s => short(s.name));
    const listNames = names.length > 3 ? names.slice(0, 3).join(', ') + ` 외 ${names.length - 3}곳` : names.join(', ');

    // 1. 표지
    add('title', `
      <div class="sl-title">
        <div class="sl-kicker">${esc(st.academy)}</div>
        <h1>${esc(st.title)}</h1>
        <p class="sl-sub">${esc(opening ? opening.line : '아이 한 명을 놓고 시작합니다')}</p>
        <p class="sl-meta">${esc([st.date, st.seats].filter(Boolean).join(' · '))}</p>
      </div>`,
      `안녕하세요, ${st.academy}입니다. 오늘은 ${listNames || '우리 지역 고등학교'}${ps.length ? `, ${ps.length}곳을` : '를'} 놓고 시작하겠습니다. ${opening ? opening.line : ''}`);

    // 2. 오늘 순서
    if (a) {
      const A = short(a.name);
      const items = [
        ['아이 한 명', `${A} ${a.g1}명 중 한 명`],
        ['그 아이 자리', `1등급 ${seat(a.g1)}명 안에 드는가`],
        ['안심', `예전 같으면 ${seatOld(a.g1)}명이던 자리입니다`],
        ['대책', `${J(st.academy, '이/가')} 이 아이에게 잡아 주는 순서`],
      ];
      add('agenda', `
        <div class="sl-head"><span class="sl-tag">오늘 순서</span><h2>이 순서로 말씀드립니다</h2></div>
        <ol class="sl-agenda">${items.map(([t, d], i) => `<li><b class="num">${i + 1}</b><div><strong>${t}</strong><span>${esc(d)}</span></div></li>`).join('')}</ol>`,
        `오늘은 네 가지 순서로 말씀드리겠습니다. 먼저 아이 한 명을 놓고, 그 아이의 자리를 보고, 왜 안심해도 되는지, 그리고 저희가 어떤 순서로 준비시키는지 말씀드리겠습니다.`);
    }

    // 3. 1학년 수 · 1등급 자리
    if (a) {
      const A = short(a.name), s1 = seat(a.g1);
      add('dots', `
        <div class="sl-split">
          <div>
            <span class="sl-tag">${esc(A)}</span>
            <h2 class="sl-big">1학년 ${a.g1}명 중<br>1등급은 <mark>${s1}명</mark>입니다</h2>
            <p class="sl-body">열 명 중 한 명. 학년 정원의 상위 10%가 1등급입니다.<br>검게 칠한 ${s1}개가 1등급 자리입니다.</p>
          </div>
          <div class="sl-dotbox">${dots(a.g1, s1, { size: a.g1 > 250 ? 12 : 16, gap: a.g1 > 250 ? 5 : 7, width: 520 })}
            <div class="sl-legend"><i class="on"></i> 1등급 ${s1}명 <i></i> 나머지 ${a.g1 - s1}명</div>
          </div>
        </div>`,
        `${J(A, '은/는')} 1학년이 ${a.g1}명입니다. 이 중 1등급은 ${s1}명입니다. 화면의 점 하나가 학생 한 명입니다. 검게 칠한 ${s1}개, 여기가 1등급 자리입니다.`);
    }

    // 4. 같은 아이, 다른 학교
    if (ps.length >= 2) {
      const cards = ps.slice(0, 3).map(s => {
        const n = notes(s.id), k = seat(s.g1);
        const eng = n.engA !== '' && n.engA != null ? `<div class="sl-bar"><span>같이 경쟁할 학생들의 ${esc(st.subject || '영어')} A 비율</span><div class="track"><i style="width:${Math.min(100, +n.engA)}%"></i></div><b>${pct(n.engA)}</b></div>` : '';
        return `<div class="sl-card">
          <div class="sl-card-h"><strong>${esc(short(s.name))}</strong><span>1학년 ${s.g1}명</span></div>
          <div class="sl-card-k"><b>${k}</b> 개의 1등급 자리</div>
          ${dots(s.g1, k, { size: 7, gap: 3, cols: 30, width: 300 })}
          ${eng}
        </div>`;
      }).join('');
      const [x, y] = [ps[0], ps[1]];
      add('compare', `
        <div class="sl-head"><span class="sl-tag">우리 아이라면</span><h2>같은 아이인데, 어느 쪽이 유리할까요</h2></div>
        <div class="sl-cards n${Math.min(3, ps.length)}">${cards}</div>`,
        `같은 아이를 두 학교에 보내 보겠습니다. ${J(short(x.name), '은/는')} 1등급 자리가 ${seat(x.g1)}개, ${J(short(y.name), '은/는')} ${seat(y.g1)}개입니다. ` +
        (Math.abs(seat(x.g1) - seat(y.g1)) <= 1
          ? '자리 수는 거의 같습니다. 그러면 누구와 경쟁하는지가 갈림길이 됩니다.'
          : '자리가 많다고 무조건 유리한 것은 아닙니다. 누구와 경쟁하는지도 같이 보셔야 합니다.'));
    }

    // 5. 5등급제 변화
    if (a) {
      const A = short(a.name), o = seatOld(a.g1), s1 = seat(a.g1);
      const times = o ? (s1 / o).toFixed(1).replace('.0', '') : '';
      add('policy', `
        <div class="sl-head"><span class="sl-tag">그런데 좋은 소식이 있습니다</span><h2>1등급 자리가 ${times ? `<mark>${times}배</mark> ` : ''}늘었습니다</h2></div>
        <div class="sl-policy">
          <div><span>예전 9등급제 (상위 4%)</span>${dots(a.g1, o, { size: 9, gap: 4, cols: 28, width: 380, on: 'var(--muted)' })}<b>${o}명</b></div>
          <div class="arrow">→</div>
          <div><span>지금 5등급제 (상위 10%)</span>${dots(a.g1, s1, { size: 9, gap: 4, cols: 28, width: 380 })}<b>${s1}명</b></div>
        </div>
        <div class="sl-grade5">${HS.GRADE5.map((p, i) => `<div style="flex:${p}" class="g${i + 1}"><b>${i + 1}등급</b><span>${p}%</span></div>`).join('')}</div>`,
        `그런데 좋은 소식이 있습니다. 지금 중3부터 내신이 5등급으로 바뀝니다. 1등급이 상위 4%에서 10%로 늘었습니다. 예전 기준이면 ${A} 1등급은 ${o}명이었지만, 지금은 ${s1}명입니다.`);
    }

    // 6-0. 학교별 평가 구조 (평가계획 공시)
    const planned = ps.filter(s => HS.hasPlan(notes(s.id)));
    if (planned.length) {
      const subj = st.subject || '영어';
      add('plan', `
        <div class="sl-head"><span class="sl-tag">학교 평가계획에서 본 것</span><h2>학교마다 ${esc(subj)} 시험 구조가 다릅니다</h2></div>
        <div class="sl-plans n${Math.min(4, planned.length)}">${planned.slice(0, 4).map(s => planRow(s, notes(s.id))).join('')}</div>
        <p class="sl-src">${esc(notes(planned[0].id).plan.src || '학교알리미 공시 「교과별 교수·학습 및 평가계획」')}</p>`,
        `학교가 공개한 평가계획을 보겠습니다. ` + planned.map(s => {
          const p = notes(s.id).plan, ts = HS.planTasks(notes(s.id));
          return `${J(short(s.name), '은/는')} 정기시험 ${(+p.w1 || 0) + (+p.w2 || 0)}%, 수행평가 ${p.perf || 0}%이고${p.essay ? `, 시험 배점의 ${p.essay}%가 ${p.essayLabel || '서·논술형'}입니다` : '입니다'}.${ts.length ? ` 수행평가는 ${ts.map(t => t.name).join(', ')}입니다.` : ''}`;
        }).join(' ') + ' 같은 영어라도 준비해야 할 것이 학교마다 다릅니다.');
    }

    // 6. 학교별 시험 특징
    ps.filter(s => HS.hasExam(notes(s.id))).forEach(s => {
      const n = notes(s.id);
      const acts = (n.actions || []).filter(Boolean);
      add('exam', `
        <div class="sl-head"><span class="sl-tag">${esc(short(s.name))}, 우리가 본 것</span>
          <h2>${esc(n.when ? n.when + '부터' : '')} <mark>${esc([n.subject, n.type].filter(Boolean).join(' '))} ${esc(n.value)}</mark>입니다</h2></div>
        ${n.then ? `<p class="sl-body lg">${esc(HS.thenLine(n))}</p>` : ''}
        ${acts.length ? `<div class="sl-label">그래서 이렇게 준비합니다</div><ol class="sl-actions">${acts.map((t, i) => `<li><b class="num">${i + 1}</b>${esc(t)}</li>`).join('')}</ol>` : ''}`,
        [HS.examLine(s, n), HS.thenLine(n), acts.length ? `그래서 저희는 ${acts.map(HS.end).join(' ')}` : ''].filter(Boolean).join(' '));
    });

    // 7. 학교별 1등급 자리 표
    if (ps.length) {
      add('table', `
        <div class="sl-head"><span class="sl-tag">우리 동네 고등학교</span><h2>학교마다 1등급 자리가 다릅니다</h2><p class="sl-body">같은 10%라도 학년 정원에 따라 자리 수가 달라집니다.</p></div>
        ${tableHtml(ps, notes, st, 'sl-table')}`,
        `오늘 다룬 학교를 한 표로 보겠습니다. ${ps.map(s => `${J(short(s.name), '은/는')} ${seat(s.g1)}자리`).join(', ')}입니다.`);
    }

    // 8. 지금 정할 것
    const deciders = ps.filter(s => notes(s.id).ifThis || notes(s.id).ifOther).slice(0, 2);
    if (deciders.length) {
      add('decide', `
        <div class="sl-head"><span class="sl-tag">오늘 정리</span><h2>지금 정할 것은 두 가지입니다</h2></div>
        <div class="sl-cards n${deciders.length}">${deciders.map(s => {
          const n = notes(s.id);
          return `<div class="sl-card">
            <div class="sl-card-h"><strong>${esc(J(short(s.name), '을/를'))} 1지망으로 한다면</strong></div>
            ${n.ifThis ? `<p class="sl-body">${esc(HS.end(n.ifThis))}</p>` : ''}
            ${n.ifOther ? `<div class="sl-alt"><span>다른 학교라면</span>${esc(HS.end(n.ifOther))}</div>` : ''}
          </div>`;
        }).join('')}</div>`,
        `정리하겠습니다. 지금 정할 것은 두 가지입니다. ${deciders.map(s => { const n = notes(s.id); return `${J(short(s.name), '을/를')} 1지망으로 한다면 ${HS.end(n.ifThis || '')} ${n.ifOther ? '다른 학교라면 ' + HS.end(n.ifOther) : ''}`; }).join(' ')}`);
    }

    // 9. 개별 상담 안내
    add('cta', `
      <div class="sl-title">
        <div class="sl-kicker">${esc(st.academy)}</div>
        <h1>갈림길은 한 가정씩<br>따로 정합니다</h1>
        <p class="sl-sub">설명회가 끝나고 한 가정당 10분, 개별 상담을 드립니다.</p>
        ${st.phone ? `<p class="sl-meta">상담 ${esc(st.phone)}</p>` : ''}
      </div>`,
      `오늘 말씀드린 것은 평균입니다. 우리 아이는 평균이 아닙니다. 설명회가 끝나고 한 가정당 10분씩 개별 상담을 드리겠습니다. 아이 성적표를 가지고 오시면 더 정확하게 말씀드릴 수 있습니다.`);

    return out;
  };

  function planRow(s, n) {
    const p = n.plan, w1 = +p.w1 || 0, w2 = +p.w2 || 0, pf = +p.perf || 0;
    const seg = (w, cls, label) => (w ? `<i class="${cls}" style="flex:${w}"><b>${label}</b> ${w}%</i>` : '');
    const ts = HS.planTasks(n);
    return `<div class="sl-plan">
      <div class="sl-plan-h"><strong>${esc(short(s.name))}</strong>${p.essay ? `<span class="sl-essay">시험 중 ${esc(p.essayLabel || '서·논술')} <b>${esc(p.essay)}%</b></span>` : ''}${p.when ? `<span class="sl-when">${esc(p.when)}</span>` : ''}</div>
      <div class="sl-stack">${seg(w1, 'e1', '1차 시험')}${seg(w2, 'e2', '2차 시험')}${seg(pf, 'pf', '수행')}</div>
      ${ts.length ? `<div class="sl-tasks">${ts.map(t => `<span>${esc(t.name)}${t.w ? ` <b>${esc(t.w)}%</b>` : ''}${t.how ? ` · ${esc(t.how)}` : ''}</span>`).join('')}</div>` : ''}
    </div>`;
  }
  HS.planRow = planRow;

  function tableHtml(ps, notes, st, cls) {
    const anyEng = ps.some(s => notes(s.id).engA !== '' && notes(s.id).engA != null);
    const anyUniv = ps.some(s => notes(s.id).univ !== '' && notes(s.id).univ != null);
    return `<table class="${cls}">
      <thead><tr><th>학교</th><th>1학년</th><th>1등급 자리</th><th>학급당</th>${anyEng ? `<th>${esc(st.subject || '영어')} A</th>` : ''}${anyUniv ? '<th>4년제 진학</th>' : ''}</tr></thead>
      <tbody>${ps.map(s => {
        const n = notes(s.id);
        return `<tr><td>${esc(short(s.name))}</td><td>${s.g1}명</td><td><b>${seat(s.g1)}</b></td><td>${s.c1 ? (s.g1 / s.c1).toFixed(1) + '명' : '-'}</td>${anyEng ? `<td>${pct(n.engA)}</td>` : ''}${anyUniv ? `<td>${pct(n.univ)}</td>` : ''}</tr>`;
      }).join('')}</tbody></table>`;
  }
  HS.tableHtml = tableHtml;

  // 슬라이드 한 장을 틀에 넣는다.
  HS.frame = (state, slide, i, total) => {
    const st = state.settings;
    const dark = slide.kind === 'title' || slide.kind === 'cta';
    return `<section class="slide ${dark ? 'dark' : ''} k-${slide.kind}">
      <div class="sl-top"><span>— ${esc(st.academy)}</span><span>${esc(st.title)}</span></div>
      <div class="sl-main">${slide.html}</div>
      <div class="sl-foot"><span>학교알리미 공시 ${esc(HS.dataYear)} · 1등급은 학년 정원의 10%로 계산</span><span>${i + 1} / ${total}</span></div>
    </section>`;
  };
})();
