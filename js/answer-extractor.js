/**
 * AutoOMR - 정답 텍스트 파서 (Answer Extractor)
 *
 * 역할: OCR 등으로 추출된 원시 텍스트를 분석하여 문항 번호와 정답을 추출한다.
 * 설계 원칙:
 *   - 확실하게 인식된 패턴만 파싱한다. 모호한 경우 'UNCERTAIN' 처리.
 *   - 파싱 신뢰도에 임의 수치를 부여하지 않는다 (HIGH / LOW / UNCERTAIN만 사용).
 *   - 연속 숫자 나열은 명시적 표식("정답:", "Answer Key:" 등)이 있을 때만 순서대로 해석한다.
 *   - 복잡한 표, 해설 속 정답, 수식 등은 파싱하지 않는다.
 *   - 이 모듈은 ScoringEngine, StorageManager와 독립적으로 동작한다.
 */

const AnswerExtractor = (() => {

  // ─────────────────────────────────────────────
  //  상수 정의
  // ─────────────────────────────────────────────

  /** 원형 숫자 ①~⑤ 및 유사 문자 → 정수 1~5 변환 맵 */
  const CIRCLE_MAP = {
    '\u2460': 1, '\u2461': 2, '\u2462': 3, '\u2463': 4, '\u2464': 5, // ①②③④⑤
    '\u2780': 1, '\u2781': 2, '\u2782': 3, '\u2783': 4, '\u2784': 5, // ➀➁➂➃➄
    '\u2776': 1, '\u2777': 2, '\u2778': 3, '\u2779': 4, '\u277A': 5, // ❶❷❸❹❺
    '\u24B5': 1, '\u24B6': 2, '\u24B7': 3, '\u24B8': 4, '\u24B9': 5, // alternative
  };

  /**
   * 연속 숫자 나열(형식 B)을 허용하는 명시적 표식 패턴.
   * 이 표식이 전체 텍스트에 존재해야만 형식 B 파싱을 시도한다.
   */
  const SEQUENTIAL_TRIGGER_RE = /(정답\s*[:：]|answer\s*key\s*[:：]|answers?\s*[:：])/i;

  // ─────────────────────────────────────────────
  //  내부 유틸리티
  // ─────────────────────────────────────────────

  /**
   * 원형 숫자 또는 일반 정수(1~5)를 숫자로 정규화.
   * 변환 불가 시 null 반환.
   */
  function normalizeChoice(token) {
    if (!token) return null;
    const ch = token.trim();
    if (CIRCLE_MAP[ch] !== undefined) return CIRCLE_MAP[ch];
    const n = parseInt(ch, 10);
    if (!isNaN(n) && n >= 1 && n <= 5) return n;
    return null;
  }

  /**
   * 줄 단위로 텍스트를 분리하고 빈 줄을 제거한다.
   */
  function splitLines(text) {
    return text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  }

  // ─────────────────────────────────────────────
  //  형식 A 파서 — "번호 + 정답" 쌍
  // ─────────────────────────────────────────────

  /**
   * 형식 A: 문항번호와 정답이 쌍으로 나타나는 패턴을 파싱한다.
   *
   * 지원 예시:
   *   "1. ③"   "1번 3"   "1-3"   "1: 3"   "1③"
   *   "1 ① 2 ② 3 ③ ..."  (한 줄에 여러 쌍)
   *
   * 지원하지 않는 경우 (파싱 안 함):
   *   "①②③④⑤..."  (문항번호 없이 정답만 나열)
   *   복잡한 표 구조
   */
  function parseFormatA(lines) {
    const results = [];

    /**
     * 안전 조건 준수 패턴:
     * 1) 문항 번호와 정답 사이에 명시적 구분자(./-/:/번 등)가 존재해야 하거나,
     * 2) 구분자가 없다면 정답이 반드시 원형 숫자(①~⑤ 등)여야 한다.
     * 이를 통해 '1 3 5 2 4' 같은 표식 없는 단순 공백 연속 숫자가
     * 문항 번호와 정답 쌍으로 잘못 파싱되는 것을 원천 차단한다.
     * 앞뒤 숫자 경계(?<!\d), (?!\d)를 적용해 자릿수 오인식도 방지한다.
     */
    const PAIR_PATTERN = /(?<!\d)(\d{1,3})(?:(?:\s*[.\-:\uFF1A\uFF0E\u00B7\u2013\u2014번]\s*([\u2460-\u2464\u2776-\u277A\u2780-\u2784①②③④⑤1-5]))|(?:\s*([\u2460-\u2464\u2776-\u277A\u2780-\u2784①②③④⑤])))(?!\d)/g;

    for (const line of lines) {
      const pairsInLine = [];
      let m;
      const localRe = new RegExp(PAIR_PATTERN.source, 'gu');

      while ((m = localRe.exec(line)) !== null) {
        const q = parseInt(m[1], 10);
        const rawChoice = m[2] || m[3];
        const ans = normalizeChoice(rawChoice);

        // 유효 범위: 문항번호 1~200, 정답 1~5
        if (q >= 1 && q <= 200 && ans !== null) {
          pairsInLine.push({ q, answer: ans, raw: m[0].trim(), parseConfidence: 'HIGH' });
        }
      }

      // 긴 줄(30자 초과)에 단 하나의 쌍만 있으면 해설에 섞인 것으로 간주 → LOW
      if (line.length > 30 && pairsInLine.length === 1) {
        pairsInLine.forEach(p => { p.parseConfidence = 'LOW'; });
      }

      results.push(...pairsInLine);
    }

    return results;
  }

  // ─────────────────────────────────────────────
  //  형식 B 파서 — 명시적 표식 뒤 연속 나열
  // ─────────────────────────────────────────────

  /**
   * 형식 B: "정답: 1 3 5 2 4 ..." 처럼 표식 뒤 공백으로 구분된 숫자 나열.
   * 요구사항 1 준수: 명시적 표식 없이 숫자만 나열된 경우는 절대 파싱하지 않는다.
   *
   * @param {string} fullText - 전체 원시 텍스트
   * @returns {ExtractedItem[] | null}
   */
  function parseFormatB(fullText) {
    if (!SEQUENTIAL_TRIGGER_RE.test(fullText)) return null;

    const triggerMatch = fullText.match(
      /(정답\s*[:：]|answer\s*key\s*[:：]|answers?\s*[:：])([\s\S]*)/i
    );
    if (!triggerMatch) return null;

    const afterTrigger = triggerMatch[2];

    // 표식 직후 첫 번째 단락(빈 줄 이전)에서만 연속 숫자를 추출한다.
    const segment = afterTrigger.split(/\n\s*\n/)[0];
    const tokens = segment.trim().split(/[\s,，、]+/);

    const results = [];
    let qNo = 1;

    for (const token of tokens) {
      if (!token) continue;
      const ans = normalizeChoice(token);
      if (ans !== null) {
        results.push({ q: qNo, answer: ans, raw: token, parseConfidence: 'HIGH' });
        qNo++;
      } else {
        // 숫자 이외 토큰이 등장하면 연속 나열 종료
        break;
      }
    }

    return results.length > 0 ? results : null;
  }

  // ─────────────────────────────────────────────
  //  중복·충돌 검사
  // ─────────────────────────────────────────────

  /**
   * 파싱 결과 배열에서 같은 문항 번호가 복수 인식된 경우를 탐지한다.
   *  - CONFLICT: 같은 번호에 서로 다른 정답
   *  - DUPLICATE: 같은 번호에 같은 정답 (중복 매칭)
   */
  function detectIssues(items) {
    const warnings = [];
    const seen = {};

    for (const item of items) {
      if (!seen[item.q]) {
        seen[item.q] = [item.answer];
      } else {
        seen[item.q].push(item.answer);
      }
    }

    for (const [q, answers] of Object.entries(seen)) {
      const unique = [...new Set(answers)];
      if (answers.length > 1 && unique.length > 1) {
        warnings.push({
          type: 'CONFLICT',
          q: Number(q),
          message: `${q}번 문항에 서로 다른 정답이 중복 인식됨: ${answers.join(', ')}`
        });
      } else if (answers.length > 1 && unique.length === 1) {
        warnings.push({
          type: 'DUPLICATE',
          q: Number(q),
          message: `${q}번 문항이 동일 정답으로 중복 인식됨 (정답: ${unique[0]})`
        });
      }
    }

    return warnings;
  }

  /**
   * 추출된 항목 중 연속 범위(min~max) 안에서 누락된 문항 번호를 반환한다.
   */
  function detectMissingQuestions(items) {
    if (items.length === 0) return [];
    const qNums = items.map(i => i.q).sort((a, b) => a - b);
    const min = qNums[0];
    const max = qNums[qNums.length - 1];
    const missing = [];
    for (let q = min; q <= max; q++) {
      if (!qNums.includes(q)) missing.push(q);
    }
    return missing;
  }

  // ─────────────────────────────────────────────
  //  중복 해소
  // ─────────────────────────────────────────────

  /**
   * 중복·충돌 항목을 해소하여 문항당 하나의 결과만 남긴다.
   *  - 같은 정답: 하나로 합침
   *  - 서로 다른 정답(충돌): answer = null, parseConfidence = 'UNCERTAIN'
   */
  function deduplicateItems(items) {
    const map = new Map();

    for (const item of items) {
      if (!map.has(item.q)) {
        map.set(item.q, { ...item });
      } else {
        const existing = map.get(item.q);
        if (existing.answer !== item.answer) {
          map.set(item.q, {
            q: item.q,
            answer: null,
            raw: `${existing.raw} / ${item.raw}`,
            parseConfidence: 'UNCERTAIN'
          });
        }
        // 같은 정답이면 기존 항목 유지 (아무것도 하지 않음)
      }
    }

    return [...map.values()].sort((a, b) => a.q - b.q);
  }

  // ─────────────────────────────────────────────
  //  공개 API
  // ─────────────────────────────────────────────

  /**
   * OCR 원시 텍스트에서 정답 목록을 추출한다.
   *
   * @param {string} rawText - OCR 또는 직접 입력된 텍스트
   * @returns {{
   *   items: Array<{q:number, answer:number|null, raw:string, parseConfidence:'HIGH'|'LOW'|'UNCERTAIN'}>,
   *   warnings: Array<{type:'CONFLICT'|'DUPLICATE', q:number, message:string}>,
   *   missingQuestions: number[],
   *   detectedFormat: 'FORMAT_A'|'FORMAT_B'|'COMBINED'|'NONE',
   *   rawText: string
   * }}
   */
  function extractFromText(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return { items: [], warnings: [], missingQuestions: [], detectedFormat: 'NONE', rawText: rawText || '' };
    }

    const lines = splitLines(rawText);
    let detectedFormat = 'NONE';

    // 1단계: 형식 A — 번호+정답 쌍 패턴 파싱
    const formatAItems = parseFormatA(lines);

    // 2단계: 형식 B — 명시적 표식 뒤 연속 나열 (형식 A 결과가 부족할 때 시도)
    let formatBItems = null;
    if (formatAItems.length < 3) {
      formatBItems = parseFormatB(rawText);
    }

    // 사용할 항목 결정
    let allItems = [];
    if (formatAItems.length > 0 && formatBItems && formatBItems.length > 0) {
      allItems = [...formatAItems, ...formatBItems];
      detectedFormat = 'COMBINED';
    } else if (formatAItems.length > 0) {
      allItems = formatAItems;
      detectedFormat = 'FORMAT_A';
    } else if (formatBItems && formatBItems.length > 0) {
      allItems = formatBItems;
      detectedFormat = 'FORMAT_B';
    } else {
      return { items: [], warnings: [], missingQuestions: [], detectedFormat: 'NONE', rawText };
    }

    // 3단계: 충돌·중복 경고 수집
    const warnings = detectIssues(allItems);

    // 4단계: 중복 해소 (충돌 → UNCERTAIN)
    const dedupedItems = deduplicateItems(allItems);

    // 5단계: 확정 항목만으로 누락 문항 탐지
    const confirmedItems = dedupedItems.filter(i => i.answer !== null);
    const missingQuestions = detectMissingQuestions(confirmedItems);

    return { items: dedupedItems, warnings, missingQuestions, detectedFormat, rawText };
  }

  return { extractFromText };

})();
