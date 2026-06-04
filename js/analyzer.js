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
