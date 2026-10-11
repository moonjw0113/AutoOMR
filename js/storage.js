/**
 * AutoOMR - 데이터 모델 및 localStorage 관리 모듈
 * 브라우저 재접속, 새로고침 시에도 영구 보존되는 데이터 계층
 */

const STORAGE_KEYS = {
  WORKBOOKS: 'autoomr_workbooks',
  SUBMISSIONS: 'autoomr_submissions',
  DRAFTS: 'autoomr_drafts',
  SETTINGS: 'autoomr_settings'
};

const StorageManager = {
  /**
   * 로컬 스토리지에서 안전하게 데이터 가져오기
   */
  get(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from localStorage:`, e);
      return defaultValue;
    }
  },

  /**
   * 로컬 스토리지에 데이터 저장
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`Error writing ${key} to localStorage:`, e);
      return false;
    }
  },

  /**
   * 고유 ID 생성 (타임스탬프 + 랜덤 문자열)
   */
  generateId(prefix = 'wb') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  },

  /* ================== 문제집 (Workbooks) API ================== */

  getWorkbooks() {
    const workbooks = this.get(STORAGE_KEYS.WORKBOOKS, []);
    return Array.isArray(workbooks) ? workbooks : [];
  },

  getWorkbookById(id) {
    const list = this.getWorkbooks();
    return list.find(wb => wb.id === id) || null;
  },

  saveWorkbook(workbookData) {
    const list = this.getWorkbooks();
    const now = new Date().toISOString();

    if (workbookData.id) {
      // 수정
      const index = list.findIndex(wb => wb.id === workbookData.id);
      if (index !== -1) {
        const updated = {
          ...list[index],
          ...workbookData,
          updatedAt: now
        };
        list[index] = updated;
        this.set(STORAGE_KEYS.WORKBOOKS, list);
        
        // 정답 변경 시 기존 풀이 기록 재채점 동기화
        this.syncSubmissionsWithWorkbook(updated);
        return updated;
      }
    }

    // 신규 생성
    const newWorkbook = {
      id: this.generateId('wb'),
      title: workbookData.title.trim(),
      subject: workbookData.subject.trim() || '기타',
      totalQuestions: Number(workbookData.totalQuestions),
      answerKey: workbookData.answerKey || {}, // { [questionNo]: 1~5 }
      createdAt: now,
      updatedAt: now
    };

    list.unshift(newWorkbook);
    this.set(STORAGE_KEYS.WORKBOOKS, list);
    return newWorkbook;
  },

  deleteWorkbook(id) {
    // 1. 문제집 삭제
    const list = this.getWorkbooks().filter(wb => wb.id !== id);
    this.set(STORAGE_KEYS.WORKBOOKS, list);

    // 2. 연관된 풀이 기록 삭제
    const submissions = this.getSubmissions().filter(s => s.workbookId !== id);
    this.set(STORAGE_KEYS.SUBMISSIONS, submissions);

    // 3. 연관된 임시 답안 삭제
    this.clearDraft(id);
    return true;
  },

  /* ================== 임시 답안 (Drafts) API ================== */

  getDraft(workbookId) {
    const drafts = this.get(STORAGE_KEYS.DRAFTS, {});
    return drafts[workbookId] || null;
  },

  saveDraft(workbookId, answers, currentQuestion = 1, elapsedSeconds = 0) {
    const drafts = this.get(STORAGE_KEYS.DRAFTS, {});
    drafts[workbookId] = {
      answers: answers || {},
      currentQuestion: currentQuestion || 1,
      elapsedSeconds: elapsedSeconds || 0,
      savedAt: new Date().toISOString()
    };
    this.set(STORAGE_KEYS.DRAFTS, drafts);
  },

  clearDraft(workbookId) {
    const drafts = this.get(STORAGE_KEYS.DRAFTS, {});
    if (drafts[workbookId]) {
      delete drafts[workbookId];
      this.set(STORAGE_KEYS.DRAFTS, drafts);
    }
  },

  /* ================== 풀이 기록 (Submissions) API ================== */

  getSubmissions() {
    const submissions = this.get(STORAGE_KEYS.SUBMISSIONS, []);
    return Array.isArray(submissions) ? submissions : [];
  },

  getSubmissionById(id) {
    const list = this.getSubmissions();
    return list.find(s => s.id === id) || null;
  },

  getLatestSubmissionByWorkbookId(workbookId) {
    const list = this.getSubmissions()
      .filter(s => s.workbookId === workbookId)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    return list[0] || null;
  },

  saveSubmission(submissionData) {
    const list = this.getSubmissions();
    const now = new Date().toISOString();

    if (submissionData.id) {
      // 기존 기록 업데이트 (답안 수정 후 재채점)
      const index = list.findIndex(s => s.id === submissionData.id);
      if (index !== -1) {
        list[index] = {
          ...list[index],
          ...submissionData,
          updatedAt: now
        };
        this.set(STORAGE_KEYS.SUBMISSIONS, list);
        return list[index];
      }
    }

    const newSubmission = {
      id: this.generateId('sub'),
      workbookId: submissionData.workbookId,
      userAnswers: submissionData.userAnswers || {},
      scoreResult: submissionData.scoreResult || null,
      startedAt: submissionData.startedAt || now,
      submittedAt: now,
      elapsedSeconds: submissionData.elapsedSeconds || 0
    };

    list.unshift(newSubmission);
    this.set(STORAGE_KEYS.SUBMISSIONS, list);

    // 제출 완료되었으므로 임시 답안 제거
    this.clearDraft(submissionData.workbookId);

    return newSubmission;
  },

  deleteSubmission(id) {
    const list = this.getSubmissions().filter(s => s.id !== id);
    this.set(STORAGE_KEYS.SUBMISSIONS, list);
    return true;
  },

  /**
   * 문제집 정답이 변경되었을 때 관련 제출 기록들을 새 정답 기준으로 자동 동기화
   */
  syncSubmissionsWithWorkbook(updatedWorkbook) {
    const list = this.getSubmissions();
    let changed = false;

    for (let i = 0; i < list.length; i++) {
      if (list[i].workbookId === updatedWorkbook.id) {
        // 새 정답 기준으로 재채점
        const newResult = ScoringEngine.grade(updatedWorkbook, list[i].userAnswers);
        list[i].scoreResult = newResult;
        list[i].syncedAt = new Date().toISOString();
        changed = true;
      }
    }

    if (changed) {
      this.set(STORAGE_KEYS.SUBMISSIONS, list);
    }
  },

  /**
   * 최초 실행 시 학습용 샘플 문제집 자동 탑재
   */
  initSampleDataIfEmpty() {
    const workbooks = this.getWorkbooks();
    if (workbooks.length === 0) {
      const sample1 = {
        id: this.generateId('wb'),
        title: '2025학년도 대학수학능력시험 국어영역 (홀수형)',
        subject: '국어',
        totalQuestions: 20,
        answerKey: {
          1: 1, 2: 3, 3: 5, 4: 2, 5: 4,
          6: 2, 7: 1, 8: 3, 9: 4, 10: 5,
          11: 3, 12: 2, 13: 4, 14: 1, 15: 5,
          16: 2, 17: 4, 18: 3, 19: 1, 20: 5
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const sample2 = {
        id: this.generateId('wb'),
        title: '고교 기초 수학 모의평가 (일부 미등록 정답 포함)',
        subject: '수학',
        totalQuestions: 15,
        answerKey: {
          1: 2, 2: 4, 3: 1, 4: 3, 5: 5,
          6: 4, 7: 2, 8: 1, // 9~15는 미등록(채점 제외) 상태 예시
        },
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString()
      };

      this.set(STORAGE_KEYS.WORKBOOKS, [sample1, sample2]);
      return true;
    }
    return false;
  }
};
