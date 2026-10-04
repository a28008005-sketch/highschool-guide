// 학교알리미 공개용데이터를 받아 data/schools.json 을 만든다.
//   - 09 학년별·학급별 학생수 → 1·2·3학년 학생수, 학급수
//   - 0  학교기본정보         → 남녀공학, 설립, 주소, 전화, 홈페이지, 좌표
// 사용: node tools/fetch_data.mjs [공시년도]   (기본: 올해)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const YEAR = process.argv[2] || String(new Date().getFullYear());

// 학교알리미 시도교육청 코드. 2026년부터 05 는 전남광주통합특별시다.
const REGIONS = new Map([['01', '서울'], ['02', '부산'], ['03', '대구'], ['04', '인천'], ['05', '전남광주'], ['06', '대전'], ['07', '울산'], ['08', '세종'], ['10', '경기'], ['11', '강원'], ['12', '충북'], ['13', '충남'], ['14', '전북'], ['16', '경북'], ['17', '경남'], ['18', '제주']]);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function openData(apiType, region) {
  const body = new URLSearchParams({
    APIKEY: 'schoolinfo2020', APITYPE: apiType, DEPTHNO: '0',
    SCHULKNDCODE: '04', PBANYR: YEAR, LCTNSCCODE: region,
  });
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch('https://www.schoolinfo.go.kr/openData.do', { method: 'POST', body });
      return (await res.json()).list || [];
    } catch (e) {
      await sleep(1500);
    }
  }
  throw new Error(`학교알리미 응답 없음 (항목 ${apiType}, 시도 ${region})`);
}

const shortSido = s => s
  .replace('전남광주통합특별시', '전남광주')
  .replace(/특별자치시|특별자치도|특별시|광역시/, '')
  .replace(/^(충청|전라|경상)(남|북)도$/, (_, a, b) => a[0] + b)
  .replace(/도$/, '');

const schools = [];
for (const [code, regionName] of REGIONS) {
  const counts = await openData('09', code);
  const infos = new Map((await openData('0', code)).map(r => [r.SCHUL_CODE, r]));
  for (const r of counts) {
    if (r.PBAN_EXCP_YN === 'Y' || !r.COL_S1) continue;
    const info = infos.get(r.SCHUL_CODE) || {};
    const [sido = '', ...rest] = String(r.ADRCD_NM || info.ADRCD_NM || '').split(' ');
    schools.push({
      id: r.SCHUL_CODE,
      name: r.SCHUL_NM,
      sido: sido ? shortSido(sido) : regionName,
      sigungu: rest.join(' '),
      type: (r.HS_KND_SC_NM || '').replace('고등학교', '고'),   // 일반고, 특성화고, 특수목적고, 자율고
      fond: r.FOND_SC_CODE || '',                              // 공립 · 사립 · 국립
      coed: (info.COEDU_SC_CODE || '').replace('남녀공학', '공학'),
      g1: r.COL_S1 || 0, g2: r.COL_S2 || 0, g3: r.COL_S3 || 0,
      c1: r.COL_C1 || 0, c2: r.COL_C2 || 0, c3: r.COL_C3 || 0,
      addr: [info.SCHUL_RDNMA, info.SCHUL_RDNDA].filter(Boolean).join(' ').replace(' ,', ','),
      tel: info.USER_TELNO || '',
      web: info.HMPG_ADRES || '',
      lat: info.LTTUD || null, lng: info.LGTUD || null,
    });
  }
  console.log(code, counts.length);
  await sleep(400);
}

schools.sort((a, b) => a.sido.localeCompare(b.sido, 'ko') || a.sigungu.localeCompare(b.sigungu, 'ko') || a.name.localeCompare(b.name, 'ko'));
const out = { year: YEAR, source: '학교알리미 공개용데이터', fetchedAt: new Date().toISOString().slice(0, 10), schools };
fs.writeFileSync(path.join(ROOT, 'data', 'schools.json'), JSON.stringify(out));
// file:// 로 열어도 동작하도록 같은 내용을 스크립트로도 남긴다.
fs.writeFileSync(path.join(ROOT, 'data', 'schools.js'), 'window.SCHOOL_DATA = ' + JSON.stringify(out) + ';\n');
console.log('저장', schools.length, '교');
