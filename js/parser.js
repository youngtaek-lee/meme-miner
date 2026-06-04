// KakaoTalk txt 파서
// 형식: [이름 / 소속] [오전/오후 H:MM] 내용

export function parseKakaoTxt(text) {
  const lines = text.split(/\r?\n/);
  const messages = [];
  let currentDate = null;

  const dateHeaderRe = /^-+\s+(\d{4})년\s+(\d{1,2})월\s+(\d{1,2})일.+-+$/;
  const msgRe = /^\[(.+?)\]\s+\[(오전|오후)\s+(\d{1,2}):(\d{2})\]\s+([\s\S]+)$/;

  for (const line of lines) {
    const dateMatch = line.match(dateHeaderRe);
    if (dateMatch) {
      currentDate = {
        year: parseInt(dateMatch[1]),
        month: parseInt(dateMatch[2]),
        day: parseInt(dateMatch[3]),
      };
      continue;
    }

    const msgMatch = line.match(msgRe);
    if (msgMatch && currentDate) {
      let hour = parseInt(msgMatch[3]);
      const min = parseInt(msgMatch[4]);
      if (msgMatch[2] === '오후' && hour !== 12) hour += 12;
      if (msgMatch[2] === '오전' && hour === 12) hour = 0;

      // 이름에서 소속 제거: "홍길동 / 대학교" → "홍길동"
      const rawName = msgMatch[1];
      const name = rawName.includes(' / ') ? rawName.split(' / ')[0].trim() : rawName.trim();

      messages.push({
        name,
        hour,
        min,
        date: { ...currentDate },
        timestamp: new Date(currentDate.year, currentDate.month - 1, currentDate.day, hour, min),
        content: msgMatch[5].trim(),
      });
    }
  }

  return messages;
}

export function getMembers(messages) {
  const set = new Set(messages.map(m => m.name));
  return [...set];
}
