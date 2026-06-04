import { parseKakaoTxt, getMembers } from './parser.js';
import { analyzeAll } from './analyzer.js';

const uploadScreen = document.getElementById('upload-screen');
const resultScreen = document.getElementById('result-screen');
const loadingScreen = document.getElementById('loading');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

// ── 파일 드래그앤드롭 ──
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('over');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
});
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => { if (e.target.files[0]) processFile(e.target.files[0]); });

// PWA Web Share Target
if ('launchQueue' in window) {
  window.launchQueue.setConsumer(async launchParams => {
    if (!launchParams.files.length) return;
    const file = await launchParams.files[0].getFile();
    processFile(file);
  });
}

function processFile(file) {
  if (!file.name.endsWith('.txt')) {
    alert('카카오톡에서 내보낸 .txt 파일을 올려주세요.');
    return;
  }

  uploadScreen.style.display = 'none';
  loadingScreen.style.display = 'flex';

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const text = e.target.result;
      const messages = parseKakaoTxt(text);
      const members = getMembers(messages);

      if (members.length < 2) {
        alert('메시지를 불러오지 못했어요. 카카오톡 단체 대화 파일인지 확인해주세요.');
        reset();
        return;
      }

      const results = analyzeAll(messages, members);
      renderResults(results, messages, members);

      loadingScreen.style.display = 'none';
      resultScreen.style.display = 'block';
    } catch (err) {
      alert('파일을 읽는 중 오류가 발생했어요.');
      reset();
    }
  };
  reader.readAsText(file, 'UTF-8');
}

function renderResults(results, messages, members) {
  const header = document.querySelector('.result-header p');
  header.textContent = `총 ${messages.length.toLocaleString()}개 메시지 · 참여자 ${members.length}명`;

  const container = document.querySelector('.sections');
  container.innerHTML = '';

  for (const section of results) {
    container.appendChild(buildCard(section));
  }
}

function buildCard(section) {
  const card = document.createElement('div');
  card.className = 'section-card';

  const top3 = section.ranked.slice(0, 3);
  const rest = section.ranked.slice(3);
  const max = section.ranked[0]?.score || 1;

  const desc = getSectionDesc(section.emoji);

  card.innerHTML = `
    <div class="section-header">
      <span class="section-emoji">${section.emoji}</span>
      <div>
        <div class="section-title">${section.title}</div>
        <div class="section-desc">${desc}</div>
      </div>
    </div>
    <div class="podium">
      ${podiumItem(top3[1], 'second', '🥈')}
      ${podiumItem(top3[0], 'first',  '🥇')}
      ${podiumItem(top3[2], 'third',  '🥉')}
    </div>
    <div class="rank-list">
      ${rest.map(r => rankRow(r, max, section.unit)).join('')}
    </div>
  `;

  return card;
}

function podiumItem(r, cls, medal) {
  if (!r) return `<div class="podium-item ${cls}"><div class="podium-block"></div></div>`;
  return `
    <div class="podium-item ${cls}">
      <div class="podium-name">${r.name}</div>
      <div class="podium-score">${r.score.toLocaleString()}${''}</div>
      <div class="podium-block">${medal}</div>
    </div>
  `;
}

function rankRow(r, max, unit) {
  const pct = max > 0 ? (r.score / max) * 100 : 0;
  return `
    <div class="rank-row">
      <span class="rank-num">${r.rank}</span>
      <span class="rank-name">${r.name}</span>
      <div class="rank-bar-wrap">
        <div class="rank-bar" style="width:${pct}%"></div>
      </div>
      <span class="rank-score">${r.score.toLocaleString()} ${unit}</span>
    </div>
  `;
}

function getSectionDesc(emoji) {
  const map = {
    '👑': '이 단톡의 주인은 나야나',
    '🌙': '새벽에 활동하는 야생의 존재',
    '😂': 'ㅋ을 쌓는 것이 취미인 자',
    '🤬': '욕 없이는 대화가 안 됨',
    '🐧': '오전 6시 이후 첫 선톡을 날린 횟수',
    '🤖': 'ㅇㅇ, ㅇㅋ, ㄴㄴ으로 모든 것을 해결',
    '😭': 'ㅠ와 ㅜ로 세상의 슬픔을 표현',
    '📸': '말보다 짤이 편한 사람',
    '🪓': '반복되는 맞춤법 오류 횟수',
  };
  return map[emoji] || '';
}

function reset() {
  loadingScreen.style.display = 'none';
  resultScreen.style.display = 'none';
  uploadScreen.style.display = 'flex';
  fileInput.value = '';
}

document.getElementById('reset-btn').addEventListener('click', reset);
