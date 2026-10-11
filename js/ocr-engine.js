/**
 * AutoOMR - OCR 엔진 어댑터 (OcrEngine)
 *
 * 역할: 이미지에서 텍스트를 추출하는 OCR 백엔드를 추상화한다.
 * 설계 원칙:
 *   - 현재 구현: Tesseract.js (브라우저 내 동작, 무료, 외부 API 없음)
 *   - OcrEngine.recognize(imageSource) 인터페이스만 유지하면 추후 다른 엔진으로 교체 가능.
 *   - OCR 인식 신뢰도(ocrConfidence)와 정답 파싱 신뢰도(parseConfidence)는 완전히 분리한다.
 *   - ocrConfidence: Tesseract.js가 반환하는 실제 값 (0~100), 신뢰도 근거가 없으면 null.
 *   - 이 모듈은 AnswerExtractor, ScoringEngine과 독립적으로 동작한다.
 *
 * 교체 방법:
 *   OcrEngine.setBackend('custom', { recognize: async (src, onProgress) => ({text, ocrConfidence}) })
 */

const OcrEngine = (() => {

  // 현재 활성 백엔드 식별자
  let _currentBackend = 'tesseract';

  // 커스텀 백엔드 저장소
  const _customBackends = {};

  // Tesseract 워커 캐시 (재사용으로 초기화 비용 절약)
  let _tesseractWorkerPromise = null;

  // ─────────────────────────────────────────────
  //  Tesseract.js 백엔드
  // ─────────────────────────────────────────────

  /**
   * Tesseract.js CDN 로드 여부 확인.
   * index.html에서 CDN 스크립트가 로드되어 있어야 한다.
   */
  function isTesseractAvailable() {
    return typeof Tesseract !== 'undefined';
  }

  /**
   * Tesseract 워커를 초기화하고 캐시한다.
   * 한국어+영어 언어팩 사용.
   */
  async function getTesseractWorker() {
    if (_tesseractWorkerPromise) return _tesseractWorkerPromise;

    if (!isTesseractAvailable()) {
      throw new Error('Tesseract.js가 로드되지 않았습니다. CDN 스크립트를 확인해주세요.');
    }

    _tesseractWorkerPromise = Tesseract.createWorker('kor+eng', 1, {
      logger: () => {} // 내부 로그 억제 (진행률은 recognize() 콜백으로 전달)
    }).catch(err => {
      _tesseractWorkerPromise = null; // 실패 시 캐시 초기화 (재시도 허용)
      throw err;
    });

    return _tesseractWorkerPromise;
  }

  /**
   * Tesseract.js를 사용하여 이미지에서 텍스트를 추출한다.
   *
   * @param {string|File|Blob|HTMLImageElement} imageSource
   * @param {function({stage:string, progress:number})} onProgress - 진행 콜백 (0.0~1.0)
   * @returns {Promise<{text:string, ocrConfidence:number|null}>}
   */
  async function recognizeWithTesseract(imageSource, onProgress) {
    const worker = await getTesseractWorker();

    // Tesseract.js v4+ API
    const result = await worker.recognize(imageSource, {}, {
      // 진행률 콜백
      logger: (m) => {
        if (onProgress && m.progress !== undefined) {
          onProgress({ stage: m.status || 'processing', progress: m.progress });
        }
      }
    });

    const { data } = result;

    // OCR 신뢰도: Tesseract가 실제로 제공하는 값 (0~100)
    // 값이 없으면 null (임의 수치 생성 금지)
    const ocrConfidence = (typeof data.confidence === 'number') ? data.confidence : null;

    return {
      text: data.text || '',
      ocrConfidence
    };
  }

  // ─────────────────────────────────────────────
  //  공개 API
  // ─────────────────────────────────────────────

  /**
   * 이미지 소스에서 텍스트를 추출한다.
   *
   * @param {string|File|Blob|HTMLImageElement} imageSource
   * @param {function({stage:string, progress:number})} onProgress
   * @returns {Promise<{text:string, ocrConfidence:number|null}>}
   */
  async function recognize(imageSource, onProgress) {
    if (_currentBackend === 'tesseract') {
      return recognizeWithTesseract(imageSource, onProgress);
    }

    const customBackend = _customBackends[_currentBackend];
    if (customBackend) {
      return customBackend.recognize(imageSource, onProgress);
    }

    throw new Error(`알 수 없는 OCR 백엔드: ${_currentBackend}`);
  }

  /**
   * OCR 백엔드를 변경한다.
   * @param {'tesseract'|string} backendId
   * @param {object} [implementation] - 커스텀 백엔드일 때 { recognize: async fn } 객체
   */
  function setBackend(backendId, implementation) {
    if (backendId !== 'tesseract' && implementation) {
      _customBackends[backendId] = implementation;
    }
    _currentBackend = backendId;

    // 백엔드 변경 시 Tesseract 워커 캐시 초기화
    if (backendId !== 'tesseract') {
      _tesseractWorkerPromise = null;
    }
  }

  /**
   * 현재 활성 백엔드 식별자를 반환한다.
   */
  function getBackendId() {
    return _currentBackend;
  }

  /**
   * Tesseract.js CDN 로드 상태를 확인한다.
   * @returns {boolean}
   */
  function isAvailable() {
    if (_currentBackend === 'tesseract') return isTesseractAvailable();
    return !!_customBackends[_currentBackend];
  }

  return { recognize, setBackend, getBackendId, isAvailable };

})();
