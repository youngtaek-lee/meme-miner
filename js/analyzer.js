// 섹션별 분석 로직

const SWEAR_WORDS = ['시발', '씨발', 'ㅅㅂ', '존나', 'ㅈㄴ', '개새', '미친', 'ㅁㅊ', '병신', 'ㅂㅅ', '지랄', '꺼져', '닥쳐', '개같', '씹'];
const REACTION_WORDS = ['ㅇㅇ', 'ㅇㅋ', 'ㄴㄴ', '응', '그래', '알겠', 'ㄱㄱ', '웅'];
const TYPO_PATTERNS = [
  { wrong: /됬/g, label: '됬→됐' },
  { wrong: /어떻해/g, label: '어떻해→어떡해' },
  { wrong: /왠만/g, label: '왠만→웬만' },
  { wrong: /역활/g, label: '역활→역할' },
  { wrong: /오랫만/g, label: '오랫만→오랜만' },
  { wrong: /금새/g, label: '금새→금세' },
  { wrong: /어의없/g, label: '어의없→어이없' },
  { wrong: /몇일/g, label: '몇일→며칠' },
  { wrong: /할꺼/g, label: '할꺼→할 거' },
  { wrong: /갈꺼/g, label: '갈꺼→갈 거' },
  { wrong: /먹을꺼/g, label: '먹을꺼→먹을 거' },
  { wrong: /않돼/g, label: '않돼→안 돼' },
  { wrong: /안되$/g, label: '안되→안 돼' },
];

function countPerMember(messages, members, countFn) {
  const result = {};
  for (const m of members) result[m] = 0;
  for (const msg of messages) {
    if (result[msg.name] !== undefined) {
      result[msg.name] += countFn(msg);
    }
  }
  return result;
}

function rank(scoreMap) {
  return Object.entries(scoreMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, score], i) => ({ rank: i + 1, name, score }));
}

function toPercent(count, total) {
  return total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0;
}

// 1. 지분율
export function analyzeShare(messages, members) {
  const total = messages.length;
  const counts = countPerMember(messages, members, () => 1);
  const scores = {};
  for (const m of members) scores[m] = toPercent(counts[m], total);
  return { title: '이 구역 지분율 1위', emoji: '👑', unit: '%', ranked: rank(scores) };
}

// 2. 야행성 (00~04시) — 본인 메시지 중 새벽 비율
export function analyzeNight(messages, members) {
  const total = {};
  const night = {};
  for (const m of members) { total[m] = 0; night[m] = 0; }
  for (const msg of messages) {
    if (total[msg.name] === undefined) continue;
    total[msg.name]++;
    if (msg.hour >= 0 && msg.hour < 5) night[msg.name]++;
  }
  const scores = {};
  for (const m of members) scores[m] = toPercent(night[m], total[m]);
  return { title: '야행성', emoji: '🌙', unit: '%', ranked: rank(scores) };
}

// 3. ㅋ 수집가 — 메시지 중 ㅋ 포함 비율
export function analyzeKk(messages, members) {
  const total = {};
  const kk = {};
  for (const m of members) { total[m] = 0; kk[m] = 0; }
  for (const msg of messages) {
    if (total[msg.name] === undefined) continue;
    total[msg.name]++;
    if (/ㅋ/.test(msg.content)) kk[msg.name]++;
  }
  const scores = {};
  for (const m of members) scores[m] = toPercent(kk[m], total[m]);
  return { title: '"ㅋ" 수집가', emoji: '😂', unit: '%', ranked: rank(scores) };
}

// 4. 욕쟁이 — 욕설 포함 메시지 비율
export function analyzeSwear(messages, members) {
  const total = {};
  const swear = {};
  for (const m of members) { total[m] = 0; swear[m] = 0; }
  for (const msg of messages) {
    if (total[msg.name] === undefined) continue;
    total[msg.name]++;
    if (SWEAR_WORDS.some(w => msg.content.includes(w))) swear[msg.name]++;
  }
  const scores = {};
  for (const m of members) scores[m] = toPercent(swear[m], total[m]);
  return { title: '욕쟁이', emoji: '🤬', unit: '%', ranked: rank(scores) };
}

// 5. 퍼스트 펭귄 (오전 6시 이후 날짜 첫 메시지)
export function analyzeFirstPenguin(messages, members) {
  const counts = {};
  for (const m of members) counts[m] = 0;

  const byDate = {};
  for (const msg of messages) {
    if (msg.hour < 6) continue;
    const key = `${msg.date.year}-${msg.date.month}-${msg.date.day}`;
    if (!byDate[key]) {
      byDate[key] = msg.name;
      if (counts[msg.name] !== undefined) counts[msg.name]++;
    }
  }

  return { title: '퍼스트 펭귄', emoji: '🐧', unit: '회', ranked: rank(counts) };
}

// 6. 영혼없는 대답
export function analyzeReaction(messages, members) {
  const total = {};
  const reaction = {};
  for (const m of members) { total[m] = 0; reaction[m] = 0; }

  for (const msg of messages) {
    if (total[msg.name] === undefined) continue;
    total[msg.name]++;
    const c = msg.content.trim();
    if (REACTION_WORDS.some(w => c === w) || (c.length <= 3 && /^[ㄱ-ㅎㅏ-ㅣ]+$/.test(c))) {
      reaction[msg.name]++;
    }
  }

  const scores = {};
  for (const m of members) {
    scores[m] = total[m] > 0 ? Math.round((reaction[m] / total[m]) * 100) : 0;
  }
  return { title: '대답에 영혼이 없는', emoji: '🤖', unit: '%', ranked: rank(scores) };
}

// 7. 프로 엄살러 — ㅠ/ㅜ 포함 메시지 비율
export function analyzeCry(messages, members) {
  const total = {};
  const cry = {};
  for (const m of members) { total[m] = 0; cry[m] = 0; }
  for (const msg of messages) {
    if (total[msg.name] === undefined) continue;
    total[msg.name]++;
    if (/[ㅠㅜ]/.test(msg.content)) cry[msg.name]++;
  }
  const scores = {};
  for (const m of members) scores[m] = toPercent(cry[m], total[m]);
  return { title: '프로 엄살러', emoji: '😭', unit: '%', ranked: rank(scores) };
}

// 8. 짤 중독자 — 짤/이모티콘 메시지 비율
export function analyzeMedia(messages, members) {
  const total = {};
  const media = {};
  for (const m of members) { total[m] = 0; media[m] = 0; }
  for (const msg of messages) {
    if (total[msg.name] === undefined) continue;
    total[msg.name]++;
    if (msg.content === '사진' || msg.content === '이모티콘' || msg.content === '동영상') media[msg.name]++;
  }
  const scores = {};
  for (const m of members) scores[m] = toPercent(media[m], total[m]);
  return { title: '짤 중독자', emoji: '📸', unit: '%', ranked: rank(scores) };
}

// 9. 맞춤법 파괴자 (같은 오류 2회 이상 반복 시 카운트)
export function analyzeTypo(messages, members) {
  // 멤버별 패턴별 카운트
  const patternCounts = {};
  for (const m of members) {
    patternCounts[m] = {};
    for (const p of TYPO_PATTERNS) patternCounts[m][p.label] = 0;
  }

  for (const msg of messages) {
    if (!patternCounts[msg.name]) continue;
    for (const p of TYPO_PATTERNS) {
      const matches = msg.content.match(p.wrong);
      if (matches) patternCounts[msg.name][p.label] += matches.length;
    }
  }

  // 모든 오류 횟수 합산
  const scores = {};
  for (const m of members) {
    scores[m] = Object.values(patternCounts[m]).reduce((a, b) => a + b, 0);
  }

  return { title: '맞춤법 파괴자', emoji: '🪓', unit: '회', ranked: rank(scores) };
}

// 불용어 — 누구나 쓰는 일상 단어, 개성 없는 단어
const STOPWORDS = new Set([
  // 대명사
  '나','너','우리','저','제','걔','얘','쟤','나는','내가','나도','나한테','저는','제가','저도',
  '너는','네가','너도','우리는','우리가','우리도','자기','본인',
  // 지시어
  '이거','저거','그거','이게','저게','그게','이건','저건','그건','이걸','저걸','그걸',
  '여기','거기','저기','이쪽','저쪽','그쪽','이때','그때','저때',
  // 시간
  '오늘','내일','어제','지금','아까','나중','요즘','최근','이제','벌써','아직','방금',
  '오전','오후','새벽','아침','점심','저녁','밤','낮',
  // 일반 동사/형용사 어미
  '있어','없어','했어','할게','할까','하자','해요','해','하면','하고','하는','하지','한다','하는데',
  '됐어','될거야','될것같아','됩니다','되는','되면','되고',
  '같아','같은','같이','인데','이고','이랑','이나',
  // 접속사/부사
  '그래서','그런데','근데','그리고','하지만','그냥','이제','이미','또','다시','더','좀',
  '잠깐','사실','약간','되게','완전','너무','정말','진짜','아니','맞아','그래','응',
  '아무튼','어쨌든','그냥','뭐','왜','어떻게','어디','언제',
  // 일반 명사
  '밥','집','일','시간','사람','친구','거기','오빠','언니','형','누나','동생',
  '생각','말','거','것','때','곳','데','분','점','번','개',
  // 지역명
  '서울','부산','대구','인천','광주','대전','울산','세종','제주',
  '경기','강원','충북','충남','전북','전남','경북','경남',
  '수원','성남','고양','용인','창원','청주','전주','천안','안산','안양','평택','시흥','화성','남양주','부천','의정부','파주','김포',
  '강남','강북','강서','강동','마포','종로','용산','홍대','신촌','이태원','여의도','판교','분당','일산',
  '동구','서구','남구','북구','중구','수성구','달서구','해운대','사상','금정',
  // 시스템
  '이모티콘','사진','동영상','삭제된','메시지',
  // 자음모음
  'ㅇㅇ','ㅇㅋ','ㄴㄴ','ㅎㅎ','ㅋㅋ','ㅠㅠ','ㅜㅜ','ㄱㄱ','ㅅㅂ','ㅈㄴ','ㄷㄷ','ㄹㅇ',
]);

// ㅋㅋㅋ... → ㅋㅋ, ㅎㅎㅎ... → ㅎㅎ 등 반복 자음모음 정규화
function normalizeToken(str) {
  return str.replace(/([ㄱ-ㅎㅏ-ㅣ])\1{5,}/g, '$1$1$1$1$1');
}

// 개인별 단골 표현 분석
export function analyzePersonalWords(messages, members) {
  const memberWords = {};
  const totalWords = {};
  for (const m of members) memberWords[m] = {};

  for (const msg of messages) {
    if (!memberWords[msg.name]) continue;
    if (['사진','이모티콘','동영상'].includes(msg.content.trim())) continue;

    const raw = normalizeToken(msg.content.trim().replace(/@\S+/g, '').trim());

    // 짧은 메시지 전체를 공백 제거해서 하나의 표현으로 추가
    // 순수 한글+자음모음만 허용 (숫자·영문 섞인 건 제외)
    const collapsed = raw.replace(/\s+/g, '');
    const isPureKorean = /^[가-힣ㄱ-ㅎㅏ-ㅣ]+$/.test(collapsed);
    const shortPhraseTokens = (isPureKorean && collapsed.length >= 2 && collapsed.length <= 15 && !STOPWORDS.has(collapsed))
      ? [collapsed] : [];

    const wordTokens = raw
      .split(/[\s\n.,!?~·…'"「」『』【】<>{}()\[\]\/\\|@#$%^&*+=]+/)
      .map(t => t.trim())
      .filter(t => {
        if (t.length < 2) return false;
        if (STOPWORDS.has(t)) return false;
        if (/[a-zA-Z]/.test(t)) return false; // 영문 포함 토큰 제외
        if (t === collapsed) return false; // 단어토큰과 중복 방지
        return true;
      });

    const tokens = [...shortPhraseTokens, ...wordTokens];

    for (const token of tokens) {
      memberWords[msg.name][token] = (memberWords[msg.name][token] || 0) + 1;
      totalWords[token] = (totalWords[token] || 0) + 1;
    }
    // collapsed 구문은 phraseTokens로도 따로 기록 (부스트용)
    if (shortPhraseTokens.length > 0) {
      const pt = shortPhraseTokens[0];
      memberWords[msg.name][`__phrase__${pt}`] = (memberWords[msg.name][`__phrase__${pt}`] || 0) + 1;
    }
  }

  const totalMsgs = messages.length;

  // 멤버별 — 독특함 top6 + 빈도 top2 합산
  const result = {};
  for (const m of members) {
    const memberMsgCount = messages.filter(msg => msg.name === m).length || 1;

    const entries = Object.entries(memberWords[m])
      .filter(([word, cnt]) => cnt >= 2 && !word.startsWith('__phrase__'))
      .map(([word, count]) => {
        const globalRate = (totalWords[word] || 1) / totalMsgs;
        const personalRate = count / memberMsgCount;
        const uniqueness = personalRate / globalRate;
        // 독특함 × 횟수 조합 점수 — 많이 쓸수록, 남들은 안 쓸수록 높음
        const score = uniqueness * count;
        return { word, count, score };
      });

    // 빈도 상위 3개 (자주 하는 말)
    const byFreq = [...entries]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // 독특함 상위 6개 (이 사람만 쓰는 느낌)
    const freqWords = new Set(byFreq.map(e => e.word));
    const byUnique = [...entries]
      .filter(e => !freqWords.has(e.word))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    result[m] = {
      freq: byFreq.map(({ word, count }) => ({ word, count })),
      unique: byUnique.map(({ word, count }) => ({ word, count })),
    };
  }
  return result;
}

export function analyzeAll(messages, members) {
  return [
    analyzeShare(messages, members),
    analyzeNight(messages, members),
    analyzeKk(messages, members),
    analyzeSwear(messages, members),
    analyzeFirstPenguin(messages, members),
    analyzeReaction(messages, members),
    analyzeCry(messages, members),
    analyzeMedia(messages, members),
  ];
}
