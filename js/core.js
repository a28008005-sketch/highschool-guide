// 상태 저장, 계산식, 문장 도우미. 화면(app.js)과 슬라이드(slides.js)가 함께 쓴다.
(function () {
  const HS = (window.HS = {});
  const KEY = 'hsguide.v1';

  // ── 내신 5등급제 ──────────────────────────────────────────────
  // 1등급 = 학년 정원의 상위 10%, 예전 9등급제 1등급 = 상위 4%
  HS.GRADE5 = [10, 24, 32, 24, 10];
  HS.seat = n => Math.floor((n || 0) * 0.1);
  HS.seatOld = n => Math.floor((n || 0) * 0.04);

  // ── 데이터 ───────────────────────────────────────────────────
  const DATA = window.SCHOOL_DATA || { year: '', schools: [] };
  HS.dataYear = DATA.year;
  HS.dataDate = DATA.fetchedAt;

  HS.defaults = () => ({
    step: 'pick',
    settings: {
      academy: '고래영어학원',
      title: '2027 예비고1 고교선택 설명회',
      date: '11월 8일 토요일',
      seats: '학부모 40석',
      phone: '',
      subject: '영어',
    },
    filter: { sido: '경남', sigungu: '진주시', q: '', type: '일반고', coed: '', sort: 'name' },
    picked: [],
    notes: {},       // 학교 id → 해설 입력값
    custom: [],      // 직접 추가한 학교
    copy: { opening: 'number', first: 0 },
    hidden: {},      // 발표에서 뺀 슬라이드 종류
    activeNote: null,
  });

  HS.load = () => {
    const base = HS.defaults();
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved) return deepMerge(base, saved);
    } catch (e) { /* 저장소를 못 쓰면 기본값으로 */ }
    return base;
  };
  HS.save = state => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 무시 */ }
  };
  function deepMerge(a, b) {
    for (const k of Object.keys(b)) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) deepMerge(a[k], b[k]);
      else a[k] = b[k];
    }
    return a;
  }

  HS.allSchools = state => DATA.schools.concat(state.custom || []);
  HS.byId = (state, id) => HS.allSchools(state).find(s => s.id === id);
  HS.pickedSchools = state => state.picked.map(id => HS.byId(state, id)).filter(Boolean);

  HS.short = name => String(name)
    .replace(/대학교사범대학부설/, '사대부')
    .replace(/대학교부속/, '대부속')
    .replace(/여자고등학교$/, '여고')
    .replace(/고등학교$/, '고');

  HS.note = (state, id) => {
    if (!state.notes[id]) {
      state.notes[id] = {
        subject: state.settings.subject || '영어', type: '', value: '', when: '',
        then: '', actions: [''], ifThis: '', ifOther: '', engA: '', univ: '',
      };
    }
    return state.notes[id];
  };
  HS.hasExam = n => n && n.type && n.value;

  // ── 한국어 조사 ───────────────────────────────────────────────
  HS.josa = (word, pair) => {
    const [withB, without] = pair.split('/');
    const w = String(word).trim();
    const ch = w.charCodeAt(w.length - 1);
    let batchim;
    if (ch >= 0xac00 && ch <= 0xd7a3) batchim = (ch - 0xac00) % 28;
    else if (/[0-9]$/.test(w)) batchim = '013678'.includes(w.slice(-1)) ? 1 : 0;
    else batchim = 0;
    if (pair === '으로/로' && batchim === 8) return w + without; // ㄹ 받침
    return w + (batchim ? withB : without);
  };
  const J = HS.josa;
  HS.end = s => {
    s = String(s || '').trim();
    return s && !/[.!?…]$/.test(s) ? s + '.' : s;
  };

  // ── 문장 만들기 ───────────────────────────────────────────────
  HS.examLine = (s, n) => {
    if (!HS.hasExam(n)) return '';
    const when = n.when ? `${n.when}부터 ` : '';
    return `${J(HS.short(s.name), '은/는')} ${when}${[n.subject, n.type].filter(Boolean).join(' ')} ${n.value}입니다.`;
  };
  HS.thenLine = n => (n.then ? HS.end('그래서 ' + n.then.replace(/^그래서\s*/, '')) : '');

  HS.openings = state => {
    const ps = HS.pickedSchools(state);
    const [a, b] = ps;
    const list = [];
    if (!a) return list;
    const A = HS.short(a.name), sa = HS.seat(a.g1);
    list.push({
      id: 'number', label: '숫자 충격', desc: '1학년 수와 1등급 자리를 먼저 던집니다',
      lines: [
        `${A} 1학년은 ${a.g1}명입니다. 1등급은 ${sa}명입니다.`,
        `${a.g1}명 중 ${sa}명. ${A}에서 1등급이 되는 인원입니다.`,
        `열 명 중 한 명. 이게 지금 ${A} 1등급의 기준입니다.`,
      ],
    });
    list.push({
      id: 'story', label: '한 아이 이야기', desc: '우리 아이 한 명을 세워 놓고 시작합니다',
      lines: [
        `우리 아이가 ${A} 1학년 ${a.g1}명 중 한 명이라고 생각해 보세요.`,
        `오늘은 아이 한 명을 놓고 이야기하겠습니다. ${A}에 입학한 아이입니다.`,
        `${a.g1}명이 같이 시험을 봅니다. 그중 ${sa}명만 1등급입니다. 우리 아이는 어디에 있을까요?`,
      ],
    });
    if (b) {
      const B = HS.short(b.name), sb = HS.seat(b.g1);
      list.push({
        id: 'fork', label: '두 학교 갈림길', desc: '두 학교의 1등급 자리를 나란히 놓습니다',
        lines: [
          `${J(A, '은/는')} 1등급 자리가 ${sa}개, ${J(B, '은/는')} ${sb}개입니다.`,
          `같은 성적이라도 ${A}에서는 ${sa}명 안에, ${B}에서는 ${sb}명 안에 들어야 1등급입니다.`,
          `${J(A, '과/와')} ${B}, 어느 쪽이 우리 아이에게 유리할까요?`,
        ],
      });
    }
    const old = HS.seatOld(a.g1);
    list.push({
      id: 'policy', label: '제도 변화', desc: '9등급 → 5등급, 1등급 자리가 늘어난 이야기',
      lines: [
        `1등급 자리가 ${old ? (sa / old).toFixed(1).replace('.0', '') + '배' : '크게'} 늘었습니다. ${A} 기준 ${old}명에서 ${sa}명입니다.`,
        `지금 중3부터 내신이 5등급으로 바뀝니다. 1등급은 상위 10%입니다.`,
        `예전 같으면 ${A} 1등급은 ${old}명이었습니다. 이제는 ${sa}명입니다.`,
      ],
    });
    list.push({
      id: 'question', label: '질문 던지기', desc: '학부모에게 먼저 묻고 시작합니다',
      lines: [
        `같은 아이인데, 어느 학교가 더 유리할까요?`,
        `학교를 고를 때 무엇부터 보셨나요? 오늘은 숫자 하나만 보겠습니다.`,
        `1등급, 몇 명이 받는지 알고 계신가요?`,
      ],
    });
    return list;
  };
  HS.currentOpening = state => {
    const list = HS.openings(state);
    const o = list.find(x => x.id === state.copy.opening) || list[0];
    if (!o) return null;
    return { ...o, line: o.lines[Math.min(state.copy.first || 0, o.lines.length - 1)] };
  };

  // ── 그림 ─────────────────────────────────────────────────────
  // n 개의 점 중 k 개를 채운다. 슬라이드·배부물·화면 모두 같은 그림을 쓴다.
  HS.dots = (n, k, opt = {}) => {
    const cols = opt.cols || Math.min(n, Math.max(10, Math.ceil(Math.sqrt(n * 3))));
    const size = opt.size || 10, gap = opt.gap || 4;
    const on = opt.on || 'var(--ink)', off = opt.off || 'var(--dot-off)';
    const rows = Math.ceil(n / cols), step = size + gap;
    let c = '';
    for (let i = 0; i < n; i++) {
      const x = (i % cols) * step + size / 2, y = Math.floor(i / cols) * step + size / 2;
      c += `<circle cx="${x}" cy="${y}" r="${size / 2}" fill="${i < k ? on : off}"/>`;
    }
    const w = cols * step - gap, h = rows * step - gap;
    return `<svg class="dots" viewBox="0 0 ${w} ${h}" width="${opt.width || w}" role="img" aria-label="${n}명 중 ${k}명">${c}</svg>`;
  };

  HS.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  HS.pct = v => (v === '' || v == null || isNaN(+v) ? '-' : (+v).toFixed(1).replace('.0', '') + '%');
})();
