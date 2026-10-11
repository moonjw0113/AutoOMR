/**
 * AutoOMR - 애플리케이션 메인 컨트롤러 및 UI 핸들러
 */

const App = {
  // 현재 애플리케이션 상태
  state: {
    currentView: 'HOME', // 'HOME' | 'EDITOR' | 'SOLVER' | 'RESULT' | 'OCR'
    activeWorkbookId: null,
    editingWorkbookId: null,
    activeQuestion: 1,
    userAnswers: {},
    currentSubmissionId: null,
    currentResult: null,
    resultFilter: 'ALL',
    pendingDeleteWorkbookId: null,
    // OCR 관련 상태
    ocrWorkbookId: null,       // OCR 대상 문제집 ID
    ocrImageFile: null,        // 선택된 이미지 File 객체
    ocrExtractResult: null,    // AnswerExtractor 추출 결과
    ocrOcrConfidence: null,    // Tesseract.js OCR 신뢰도 (0~100 또는 null)
    ocrPendingItems: []        // 사용자가 편집한 최종 항목 목록
  },

  // DOM 캐시
  elements: {},

  /**
   * 앱 초기화
   */
  init() {
    this.cacheElements();
    this.bindEvents();

    // 초기 데이터 확인 및 샘플 데이터 탑재
    StorageManager.initSampleDataIfEmpty();

    // 시작 화면 렌더링
    this.switchView('HOME');
  },

  /**
   * DOM 엘리먼트 캐싱
   */
  cacheElements() {
    this.elements = {
      // 헤더
      brandHomeLink: document.getElementById('brandHomeLink'),
      btnHeaderHome: document.getElementById('btnHeaderHome'),
      btnHeaderNewWorkbook: document.getElementById('btnHeaderNewWorkbook'),

      // 뷰 컨테이너
      viewHome: document.getElementById('viewHome'),
      viewEditor: document.getElementById('viewEditor'),
      viewSolver: document.getElementById('viewSolver'),
      viewResult: document.getElementById('viewResult'),
      viewOcr: document.getElementById('viewOcr'),

      // 홈 뷰
      workbookGrid: document.getElementById('workbookGrid'),
      homeEmptyState: document.getElementById('homeEmptyState'),
      btnHomeCreateWorkbook: document.getElementById('btnHomeCreateWorkbook'),
      btnEmptyCreate: document.getElementById('btnEmptyCreate'),
      btnEmptySample: document.getElementById('btnEmptySample'),

      // 편집 뷰
      editorTitle: document.getElementById('editorTitle'),
      workbookForm: document.getElementById('workbookForm'),
      editWorkbookId: document.getElementById('editWorkbookId'),
      wbTitleInput: document.getElementById('wbTitleInput'),
      wbSubjectInput: document.getElementById('wbSubjectInput'),
      wbTotalCountInput: document.getElementById('wbTotalCountInput'),
      btnApplyQuestionCount: document.getElementById('btnApplyQuestionCount'),
      btnCancelEditor: document.getElementById('btnCancelEditor'),
      btnSaveWorkbook: document.getElementById('btnSaveWorkbook'),
      quickAnswerString: document.getElementById('quickAnswerString'),
      btnApplyQuickAnswers: document.getElementById('btnApplyQuickAnswers'),
      btnClearAllAnswers: document.getElementById('btnClearAllAnswers'),
      registeredAnsCount: document.getElementById('registeredAnsCount'),
      totalAnsCount: document.getElementById('totalAnsCount'),
      unregisteredAnsCountBadge: document.getElementById('unregisteredAnsCountBadge'),
      answerKeyMatrix: document.getElementById('answerKeyMatrix'),

      // 풀이 뷰 (OMR)
      solverSubjectBadge: document.getElementById('solverSubjectBadge'),
      solverExamTitle: document.getElementById('solverExamTitle'),
      solverAutosaveStatus: document.getElementById('solverAutosaveStatus'),
      currentQBadge: document.getElementById('currentQBadge'),
      currentQDisplay: document.getElementById('currentQDisplay'),
      bubbleButtons: [
        document.getElementById('btnBubble1'),
        document.getElementById('btnBubble2'),
        document.getElementById('btnBubble3'),
        document.getElementById('btnBubble4'),
        document.getElementById('btnBubble5')
      ],
      btnPrevQuestion: document.getElementById('btnPrevQuestion'),
      btnNextQuestion: document.getElementById('btnNextQuestion'),
      omrMarkedCount: document.getElementById('omrMarkedCount'),
      omrTotalCount: document.getElementById('omrTotalCount'),
      omrNavGrid: document.getElementById('omrNavGrid'),
      btnResetDraftAnswers: document.getElementById('btnResetDraftAnswers'),
      btnOpenSubmitModal: document.getElementById('btnOpenSubmitModal'),

      // 결과 뷰
      resultExamTitle: document.getElementById('resultExamTitle'),
      resultScoreDisplay: document.getElementById('resultScoreDisplay'),
      resultAccuracyRate: document.getElementById('resultAccuracyRate'),
      resultGradableSummary: document.getElementById('resultGradableSummary'),
      resultCorrectCount: document.getElementById('resultCorrectCount'),
      resultIncorrectCount: document.getElementById('resultIncorrectCount'),
      resultUnansweredCount: document.getElementById('resultUnansweredCount'),
      resultExcludedCount: document.getElementById('resultExcludedCount'),
      filterCountAll: document.getElementById('filterCountAll'),
      filterCountIncorrect: document.getElementById('filterCountIncorrect'),
      filterCountCorrect: document.getElementById('filterCountCorrect'),
      filterCountUnanswered: document.getElementById('filterCountUnanswered'),
      filterCountExcluded: document.getElementById('filterCountExcluded'),
      resultDetailsGrid: document.getElementById('resultDetailsGrid'),
      btnResultGoHome: document.getElementById('btnResultGoHome'),
      btnResultRetake: document.getElementById('btnResultRetake'),
      btnResultRetakeBottom: document.getElementById('btnResultRetakeBottom'),
      btnResultEditWorkbook: document.getElementById('btnResultEditWorkbook'),
      btnResultEditAnswers: document.getElementById('btnResultEditAnswers'),

      // 모달
      modalSubmitReview: document.getElementById('modalSubmitReview'),
      modalSubmitSummaryText: document.getElementById('modalSubmitSummaryText'),
      unansweredWarningBox: document.getElementById('unansweredWarningBox'),
      unansweredSummaryText: document.getElementById('unansweredSummaryText'),
      unansweredBadgesList: document.getElementById('unansweredBadgesList'),
      btnConfirmFinalSubmit: document.getElementById('btnConfirmFinalSubmit'),

      modalDeleteWorkbook: document.getElementById('modalDeleteWorkbook'),
      modalDeleteWbTitle: document.getElementById('modalDeleteWbTitle'),
      btnConfirmDeleteWorkbook: document.getElementById('btnConfirmDeleteWorkbook'),

      modalOcrConfirm: document.getElementById('modalOcrConfirm'),
      modalOcrSummaryText: document.getElementById('modalOcrSummaryText'),
      modalOcrDiffPreview: document.getElementById('modalOcrDiffPreview'),
      btnOcrConfirmSave: document.getElementById('btnOcrConfirmSave'),

      // 토스트
      toastContainer: document.getElementById('toastContainer')
    };
  },

  /**
   * 전역 이벤트 바인딩
   */
  bindEvents() {
    // 헤더 및 네비게이션
    this.elements.brandHomeLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchView('HOME');
    });
    this.elements.btnHeaderHome.addEventListener('click', () => this.switchView('HOME'));
    this.elements.btnHeaderNewWorkbook.addEventListener('click', () => this.openEditorForNew());
    this.elements.btnHomeCreateWorkbook.addEventListener('click', () => this.openEditorForNew());
    this.elements.btnEmptyCreate.addEventListener('click', () => this.openEditorForNew());
    this.elements.btnEmptySample.addEventListener('click', () => {
      StorageManager.initSampleDataIfEmpty();
      this.showToast('샘플 문제집을 생성했습니다.');
      this.renderHome();
    });

    // 문제집 편집기 이벤트
    this.elements.btnCancelEditor.addEventListener('click', () => this.switchView('HOME'));
    this.elements.btnApplyQuestionCount.addEventListener('click', () => this.handleUpdateQuestionCount());
    this.elements.btnApplyQuickAnswers.addEventListener('click', () => this.handleApplyQuickAnswers());
    this.elements.btnClearAllAnswers.addEventListener('click', () => this.handleClearAllEditorAnswers());
    this.elements.btnSaveWorkbook.addEventListener('click', () => this.handleSaveWorkbook());

    // OMR 답안 입력 이벤트
    this.elements.bubbleButtons.forEach((btn, index) => {
      btn.addEventListener('click', () => this.handleSelectAnswerChoice(index + 1));
    });
    this.elements.btnPrevQuestion.addEventListener('click', () => this.navigateQuestion(-1));
    this.elements.btnNextQuestion.addEventListener('click', () => this.navigateQuestion(1));
    this.elements.btnResetDraftAnswers.addEventListener('click', () => this.handleResetDraftAnswers());
    this.elements.btnOpenSubmitModal.addEventListener('click', () => this.openSubmitReviewModal());
    this.elements.btnConfirmFinalSubmit.addEventListener('click', () => this.handleFinalSubmit());

    // 채점 결과 이벤트
    this.elements.btnResultGoHome.addEventListener('click', () => this.switchView('HOME'));
    this.elements.btnResultRetake.addEventListener('click', () => this.handleRetakeExam());
    this.elements.btnResultRetakeBottom.addEventListener('click', () => this.handleRetakeExam());
    this.elements.btnResultEditWorkbook.addEventListener('click', () => {
      if (this.state.activeWorkbookId) {
        this.openEditorForEdit(this.state.activeWorkbookId);
      }
    });
    this.elements.btnResultEditAnswers.addEventListener('click', () => {
      if (this.state.activeWorkbookId) {
        // 기존 답안을 유지한 채로 풀이 화면으로 돌아감
        this.startSolving(this.state.activeWorkbookId, false);
      }
    });

    // 결과 필터 탭
    const filterButtons = document.querySelectorAll('.filter-tab-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.resultFilter = btn.dataset.filter;
        this.renderResultDetails();
      });
    });

    // 문제집 삭제 모달 확인 이벤트
    this.elements.btnConfirmDeleteWorkbook.addEventListener('click', () => {
      if (this.state.pendingDeleteWorkbookId) {
        StorageManager.deleteWorkbook(this.state.pendingDeleteWorkbookId);
        this.closeModals();
        this.showToast('문제집이 삭제되었습니다.');
        this.renderHome();
      }
    });

    // 모달 닫기 공통 핸들러
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => this.closeModals());
    });

    // 모달 배경 클릭 시 닫기
    [this.elements.modalSubmitReview, this.elements.modalDeleteWorkbook, this.elements.modalOcrConfirm].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeModals();
      });
    });

    // 키보드 단축키 핸들러 (OMR 마킹 시 1~5, 방향키)
    window.addEventListener('keydown', (e) => this.handleGlobalKeyDown(e));

    // OCR 뷰 이벤트 바인딩
    this.bindOcrEvents();
  },

  /**
   * 화면 전환 라우터
   */
  switchView(viewName) {
    this.state.currentView = viewName;

    // 모든 뷰 숨김
    this.elements.viewHome.classList.remove('active');
    this.elements.viewEditor.classList.remove('active');
    this.elements.viewSolver.classList.remove('active');
    this.elements.viewResult.classList.remove('active');
    this.elements.viewOcr.classList.remove('active');

    // 헤더 상태 조정
    this.elements.btnHeaderHome.style.display = viewName === 'HOME' ? 'none' : 'inline-flex';

    // 해당 뷰 활성화
    switch (viewName) {
      case 'HOME':
        this.elements.viewHome.classList.add('active');
        this.renderHome();
        break;
      case 'EDITOR':
        this.elements.viewEditor.classList.add('active');
        break;
      case 'SOLVER':
        this.elements.viewSolver.classList.add('active');
        break;
      case 'RESULT':
        this.elements.viewResult.classList.add('active');
        break;
      case 'OCR':
        this.elements.viewOcr.classList.add('active');
        break;
    }

    // 뷰 전환 시 최상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /**
   * 키보드 단축키 처리
   */
  handleGlobalKeyDown(e) {
    // 입력 필드(텍스트, 넘버)에 포커스되어 있을 때는 단축키 제외
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      return;
    }

    if (this.state.currentView === 'SOLVER') {
      const key = e.key;
      if (['1', '2', '3', '4', '5'].includes(key)) {
        e.preventDefault();
        this.handleSelectAnswerChoice(Number(key));
      } else if (key === 'ArrowLeft') {
        e.preventDefault();
        this.navigateQuestion(-1);
      } else if (key === 'ArrowRight' || key === ' ') {
        e.preventDefault();
        this.navigateQuestion(1);
      }
    }
  },

  /**
   * 토스트 알림 표시
   */
  showToast(message, duration = 2500) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    this.elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  closeModals() {
    this.elements.modalSubmitReview.classList.remove('show');
    this.elements.modalDeleteWorkbook.classList.remove('show');
    this.elements.modalOcrConfirm.classList.remove('show');
    this.state.pendingDeleteWorkbookId = null;
  },

  /* ==========================================================================
     A. 홈 화면 로직
     ========================================================================== */

  renderHome() {
    const workbooks = StorageManager.getWorkbooks();
    const grid = this.elements.workbookGrid;
    grid.innerHTML = '';

    if (workbooks.length === 0) {
      this.elements.homeEmptyState.style.display = 'block';
      return;
    }

    this.elements.homeEmptyState.style.display = 'none';

    workbooks.forEach(wb => {
      // 정답 등록 통계
      const totalQ = Number(wb.totalQuestions);
      const answerKey = wb.answerKey || {};
      const registeredCount = Object.values(answerKey).filter(v => v !== null && v !== '').length;
      
      // 최근 채점 결과 확인
      const latestSub = StorageManager.getLatestSubmissionByWorkbookId(wb.id);
      
      // 임시 답안 존재 여부
      const draft = StorageManager.getDraft(wb.id);
      const hasDraft = draft && Object.keys(draft.answers || {}).length > 0;

      const card = document.createElement('div');
      card.className = 'workbook-card';

      let scoreBadgeHtml = '';
      if (latestSub && latestSub.scoreResult) {
        const rate = latestSub.scoreResult.accuracyRate !== null 
          ? `${latestSub.scoreResult.accuracyRate}%` 
          : '채점불가';
        scoreBadgeHtml = `
          <div class="wb-meta-row" style="color: var(--primary); font-weight: 700;">
            <span>최근 채점 정답률</span>
            <span>${rate} (${latestSub.scoreResult.correctCount}/${latestSub.scoreResult.gradableCount}개)</span>
          </div>
        `;
      }

      card.innerHTML = `
        <div>
          <div class="wb-card-header">
            <span class="badge badge-subject">${this.escapeHtml(wb.subject)}</span>
            <div style="display: flex; gap: 0.35rem;">
              <button type="button" class="btn btn-icon btn-sm" title="문제집 정보 및 정답 수정" data-action="edit" data-id="${wb.id}">
                ✏️
              </button>
              <button type="button" class="btn btn-icon btn-sm" title="문제집 삭제" data-action="delete" data-id="${wb.id}" style="color: var(--danger);">
                🗑️
              </button>
            </div>
          </div>
          <h3 class="wb-card-title">${this.escapeHtml(wb.title)}</h3>
        </div>

        <div>
          <div class="wb-meta-info">
            <div class="wb-meta-row">
              <span>총 문제 수</span>
              <strong>${totalQ}문제</strong>
            </div>
            <div class="wb-meta-row">
              <span>정답 등록 현황</span>
              <span>
                <strong style="color: var(--primary);">${registeredCount}</strong> / ${totalQ}개
                ${registeredCount < totalQ ? '<span class="badge badge-warning" style="font-size: 0.7rem; margin-left: 4px;">일부 미등록</span>' : ''}
              </span>
            </div>
            ${scoreBadgeHtml}
            ${hasDraft ? `
              <div class="wb-meta-row" style="color: var(--warning); font-weight: 600;">
                <span>작성 중인 답안</span>
                <span>${Object.keys(draft.answers).length}문제 마킹됨 (임시저장)</span>
              </div>
            ` : ''}
          </div>

          <div class="wb-card-actions">
            <button class="btn btn-primary" data-action="solve" data-id="${wb.id}">
              ${hasDraft ? '✏️ 이어서 풀기' : '📝 풀이 시작'}
            </button>
            ${latestSub ? `
              <button class="btn btn-secondary" data-action="view-result" data-sub-id="${latestSub.id}">
                결과 보기
              </button>
            ` : ''}
            <button class="btn btn-secondary btn-sm" style="font-size:0.8rem;" data-action="ocr" data-id="${wb.id}" title="정답지 사진에서 정답 자동 추출">
              📷 OCR 정답
            </button>
          </div>
        </div>
      `;

      grid.appendChild(card);
    });

    // 카드 액션 이벤트 위임
    grid.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === 'solve') {
          this.startSolving(id);
        } else if (action === 'edit') {
          this.openEditorForEdit(id);
        } else if (action === 'delete') {
          this.openDeleteConfirmModal(id);
        } else if (action === 'view-result') {
          const subId = btn.dataset.subId;
          this.viewSubmissionResult(subId);
        } else if (action === 'ocr') {
          this.openOcrView(id);
        }
      });
    });
  },

  openDeleteConfirmModal(wbId) {
    const wb = StorageManager.getWorkbookById(wbId);
    if (!wb) return;

    this.state.pendingDeleteWorkbookId = wbId;
    this.elements.modalDeleteWbTitle.textContent = `"${wb.title}" 문제집을 삭제하시겠습니까?`;
    this.elements.modalDeleteWorkbook.classList.add('show');
  },

  /* ==========================================================================
     B. 문제집 등록/편집 화면 로직
     ========================================================================== */

  openEditorForNew() {
    this.state.editingWorkbookId = null;
    this.elements.editorTitle.textContent = '새 문제집 등록';
    this.elements.editWorkbookId.value = '';
    this.elements.wbTitleInput.value = '';
    this.elements.wbSubjectInput.value = '';
    this.elements.wbTotalCountInput.value = '20';
    this.elements.quickAnswerString.value = '';

    this.renderEditorMatrix(20, {});
    this.switchView('EDITOR');
    this.elements.wbTitleInput.focus();
  },

  openEditorForEdit(wbId) {
    const wb = StorageManager.getWorkbookById(wbId);
    if (!wb) {
      this.showToast('문제집을 찾을 수 없습니다.');
      return;
    }

    this.state.editingWorkbookId = wb.id;
    this.elements.editorTitle.textContent = '문제집 및 정답 수정';
    this.elements.editWorkbookId.value = wb.id;
    this.elements.wbTitleInput.value = wb.title;
    this.elements.wbSubjectInput.value = wb.subject;
    this.elements.wbTotalCountInput.value = wb.totalQuestions;
    this.elements.quickAnswerString.value = '';

    this.renderEditorMatrix(wb.totalQuestions, wb.answerKey || {});
    this.switchView('EDITOR');
  },

  handleUpdateQuestionCount() {
    let count = parseInt(this.elements.wbTotalCountInput.value, 10);
    if (isNaN(count) || count < 1) count = 1;
    if (count > 100) count = 100;
    this.elements.wbTotalCountInput.value = count;

    // 기존에 선택된 정답 수집
    const currentKey = this.collectEditorAnswerKey();
    this.renderEditorMatrix(count, currentKey);
    this.showToast(`문제 수를 ${count}개로 조정했습니다.`);
  },

  renderEditorMatrix(totalQuestions, answerKey = {}) {
    const container = this.elements.answerKeyMatrix;
    container.innerHTML = '';
    this.elements.totalAnsCount.textContent = totalQuestions;

    for (let q = 1; q <= totalQuestions; q++) {
      const selectedChoice = answerKey[q] !== undefined ? Number(answerKey[q]) : null;

      const item = document.createElement('div');
      item.className = 'ak-item';
      item.dataset.q = q;

      let optionsHtml = '';
      for (let choice = 1; choice <= 5; choice++) {
        const isSelected = selectedChoice === choice;
        const circleSymbol = ScoringEngine.formatChoiceNumber(choice);
        optionsHtml += `
          <button type="button" class="ak-btn ${isSelected ? 'selected' : ''}" data-q="${q}" data-choice="${choice}">
            ${circleSymbol}
          </button>
        `;
      }

      item.innerHTML = `
        <span class="ak-num">${q}번</span>
        <div class="ak-options">${optionsHtml}</div>
        <button type="button" class="ak-clear-btn" title="정답 미등록으로 초기화" data-clear-q="${q}">✕</button>
      `;

      container.appendChild(item);
    }

    // 버튼 클릭 이벤트 위임
    container.querySelectorAll('.ak-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const q = btn.dataset.q;
        const choice = Number(btn.dataset.choice);
        const parent = btn.closest('.ak-options');
        const siblings = parent.querySelectorAll('.ak-btn');

        if (btn.classList.contains('selected')) {
          // 다시 누르면 해제 (미등록 상태)
          btn.classList.remove('selected');
        } else {
          siblings.forEach(s => s.classList.remove('selected'));
          btn.classList.add('selected');
        }
        this.updateEditorAnswerStats();
      });
    });

    container.querySelectorAll('[data-clear-q]').forEach(btn => {
      btn.addEventListener('click', () => {
        const q = btn.dataset.clearQ;
        const item = container.querySelector(`.ak-item[data-q="${q}"]`);
        if (item) {
          item.querySelectorAll('.ak-btn').forEach(b => b.classList.remove('selected'));
          this.updateEditorAnswerStats();
        }
      });
    });

    this.updateEditorAnswerStats();
  },

  collectEditorAnswerKey() {
    const key = {};
    const items = this.elements.answerKeyMatrix.querySelectorAll('.ak-item');
    items.forEach(item => {
      const q = Number(item.dataset.q);
      const selected = item.querySelector('.ak-btn.selected');
      if (selected) {
        key[q] = Number(selected.dataset.choice);
      }
    });
    return key;
  },

  updateEditorAnswerStats() {
    const total = parseInt(this.elements.wbTotalCountInput.value, 10) || 0;
    const selected = this.elements.answerKeyMatrix.querySelectorAll('.ak-btn.selected').length;
    const unregistered = total - selected;

    this.elements.registeredAnsCount.textContent = selected;
    this.elements.totalAnsCount.textContent = total;

    if (unregistered > 0) {
      this.elements.unregisteredAnsCountBadge.style.display = 'inline-block';
      this.elements.unregisteredAnsCountBadge.textContent = `미등록 ${unregistered}개`;
      this.elements.unregisteredAnsCountBadge.className = 'badge badge-warning';
    } else {
      this.elements.unregisteredAnsCountBadge.style.display = 'inline-block';
      this.elements.unregisteredAnsCountBadge.textContent = '모든 문제 정답 등록됨';
      this.elements.unregisteredAnsCountBadge.className = 'badge badge-success';
    }
  },

  handleApplyQuickAnswers() {
    const input = this.elements.quickAnswerString.value.trim();
    if (!input) {
      this.showToast('정답 번호 문자열을 입력해주세요.');
      return;
    }

    // 1~5 숫자만 연속으로 추출
    const digits = input.replace(/[^1-5]/g, '').split('').map(Number);
    if (digits.length === 0) {
      this.showToast('유효한 1~5 번호가 발견되지 않았습니다.');
      return;
    }

    const items = this.elements.answerKeyMatrix.querySelectorAll('.ak-item');
    let filled = 0;

    items.forEach((item, index) => {
      if (index < digits.length) {
        const choice = digits[index];
        item.querySelectorAll('.ak-btn').forEach(btn => {
          if (Number(btn.dataset.choice) === choice) {
            btn.classList.add('selected');
          } else {
            btn.classList.remove('selected');
          }
        });
        filled++;
      }
    });

    this.updateEditorAnswerStats();
    this.showToast(`1번부터 ${filled}번 문제까지 정답을 일괄 입력했습니다.`);
  },

  handleClearAllEditorAnswers() {
    this.elements.answerKeyMatrix.querySelectorAll('.ak-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    this.updateEditorAnswerStats();
    this.showToast('모든 정답 설정을 비웠습니다.');
  },

  handleSaveWorkbook() {
    const title = this.elements.wbTitleInput.value.trim();
    const subject = this.elements.wbSubjectInput.value.trim();
    const totalCount = parseInt(this.elements.wbTotalCountInput.value, 10);

    if (!title) {
      alert('문제집 이름을 입력해주세요.');
      this.elements.wbTitleInput.focus();
      return;
    }

    if (!subject) {
      alert('과목명을 입력해주세요.');
      this.elements.wbSubjectInput.focus();
      return;
    }

    if (isNaN(totalCount) || totalCount < 1 || totalCount > 100) {
      alert('문제 수는 1부터 100 사이로 설정해주세요.');
      this.elements.wbTotalCountInput.focus();
      return;
    }

    const answerKey = this.collectEditorAnswerKey();

    const saved = StorageManager.saveWorkbook({
      id: this.state.editingWorkbookId,
      title,
      subject,
      totalQuestions: totalCount,
      answerKey
    });

    this.showToast(`"${saved.title}" 문제집이 저장되었습니다.`);
    this.switchView('HOME');
  },

  /* ==========================================================================
     C. 답안 입력 및 OMR 풀이 화면 로직
     ========================================================================== */

  startSolving(workbookId, resetIfDraft = false) {
    const wb = StorageManager.getWorkbookById(workbookId);
    if (!wb) {
      this.showToast('문제집을 찾을 수 없습니다.');
      return;
    }

    this.state.activeWorkbookId = wb.id;
    this.elements.solverExamTitle.textContent = wb.title;
    this.elements.solverSubjectBadge.textContent = wb.subject;

    // 답안 복원 여부 처리
    let answers = {};
    let initialQ = 1;

    if (!resetIfDraft) {
      const draft = StorageManager.getDraft(wb.id);
      if (draft && draft.answers) {
        answers = { ...draft.answers };
        initialQ = draft.currentQuestion || 1;
        this.showToast('이전에 저장된 답안을 복원했습니다.');
      }
    } else {
      StorageManager.clearDraft(wb.id);
    }

    this.state.userAnswers = answers;
    this.state.activeQuestion = initialQ > wb.totalQuestions ? 1 : initialQ;

    // OMR 시트 네비게이터 렌더링
    this.renderOmrSheetNav(wb.totalQuestions);

    // 단일 문제 뷰 표시
    this.renderSingleQuestion(this.state.activeQuestion);

    this.switchView('SOLVER');
  },

  renderOmrSheetNav(totalQuestions) {
    const navGrid = this.elements.omrNavGrid;
    navGrid.innerHTML = '';
    this.elements.omrTotalCount.textContent = totalQuestions;

    for (let q = 1; q <= totalQuestions; q++) {
      const cell = document.createElement('div');
      cell.className = 'omr-nav-cell';
      cell.dataset.q = q;

      const userAns = this.state.userAnswers[q];
      const isAnswered = userAns !== undefined && userAns !== null && userAns !== '';

      if (isAnswered) {
        cell.classList.add('answered');
      }
      if (q === this.state.activeQuestion) {
        cell.classList.add('current');
      }

      cell.innerHTML = `
        <span class="cell-qnum">${q}</span>
        <span class="cell-ans">${isAnswered ? ScoringEngine.formatChoiceNumber(userAns) : '-'}</span>
      `;

      cell.addEventListener('click', () => {
        this.goToQuestion(q);
      });

      navGrid.appendChild(cell);
    }

    this.updateOmrStats();
  },

  renderSingleQuestion(questionNo) {
    const wb = StorageManager.getWorkbookById(this.state.activeWorkbookId);
    if (!wb) return;

    this.state.activeQuestion = questionNo;
    const totalQ = wb.totalQuestions;

    this.elements.currentQBadge.textContent = `문제 ${questionNo} / ${totalQ}`;
    this.elements.currentQDisplay.textContent = questionNo;

    // 이전/다음 버튼 활성/비활성화 상태
    this.elements.btnPrevQuestion.disabled = questionNo <= 1;
    this.elements.btnNextQuestion.disabled = questionNo >= totalQ;

    // 현재 문제의 마킹 답안 상태 표시
    const currentAns = this.state.userAnswers[questionNo];
    this.elements.bubbleButtons.forEach((btn, index) => {
      const choice = index + 1;
      if (currentAns === choice) {
        btn.classList.add('marked');
      } else {
        btn.classList.remove('marked');
      }
    });

    // OMR 그리드 셀 현재 위치 하이라이트 동기화
    const navGrid = this.elements.omrNavGrid;
    navGrid.querySelectorAll('.omr-nav-cell').forEach(cell => {
      const q = Number(cell.dataset.q);
      if (q === questionNo) {
        cell.classList.add('current');
        // 부드럽게 스크롤 맞춤
        cell.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        cell.classList.remove('current');
      }
    });
  },

  handleSelectAnswerChoice(choice) {
    const q = this.state.activeQuestion;
    const current = this.state.userAnswers[q];

    if (current === choice) {
      // 이미 마킹된 답을 다시 누르면 취소(토글 해제)
      delete this.state.userAnswers[q];
    } else {
      this.state.userAnswers[q] = choice;
    }

    // UI 즉시 반영
    this.renderSingleQuestion(q);
    this.updateOmrCell(q);
    this.updateOmrStats();

    // 자동 저장 (localStorage)
    StorageManager.saveDraft(this.state.activeWorkbookId, this.state.userAnswers, q);
    this.flashAutosaveIndicator();
  },

  updateOmrCell(questionNo) {
    const cell = this.elements.omrNavGrid.querySelector(`.omr-nav-cell[data-q="${questionNo}"]`);
    if (!cell) return;

    const userAns = this.state.userAnswers[questionNo];
    const isAnswered = userAns !== undefined && userAns !== null && userAns !== '';

    if (isAnswered) {
      cell.classList.add('answered');
      cell.querySelector('.cell-ans').textContent = ScoringEngine.formatChoiceNumber(userAns);
    } else {
      cell.classList.remove('answered');
      cell.querySelector('.cell-ans').textContent = '-';
    }
  },

  updateOmrStats() {
    const wb = StorageManager.getWorkbookById(this.state.activeWorkbookId);
    if (!wb) return;

    const answeredCount = Object.keys(this.state.userAnswers).filter(q => {
      const ans = this.state.userAnswers[q];
      return ans !== null && ans !== undefined && ans !== '';
    }).length;

    this.elements.omrMarkedCount.textContent = answeredCount;
    this.elements.omrTotalCount.textContent = wb.totalQuestions;
  },

  flashAutosaveIndicator() {
    const ind = this.elements.solverAutosaveStatus;
    ind.style.opacity = '1';
    ind.innerHTML = '<span class="autosave-dot"></span> 자동 저장됨';
  },

  navigateQuestion(delta) {
    const wb = StorageManager.getWorkbookById(this.state.activeWorkbookId);
    if (!wb) return;

    const nextQ = this.state.activeQuestion + delta;
    if (nextQ >= 1 && nextQ <= wb.totalQuestions) {
      this.goToQuestion(nextQ);
    }
  },

  goToQuestion(q) {
    this.renderSingleQuestion(q);
    // 현재 문제 위치 임시 저장
    StorageManager.saveDraft(this.state.activeWorkbookId, this.state.userAnswers, q);
  },

  handleResetDraftAnswers() {
    if (confirm('현재까지 입력한 모든 답안을 초기화하시겠습니까?')) {
      this.state.userAnswers = {};
      StorageManager.clearDraft(this.state.activeWorkbookId);
      this.renderOmrSheetNav(StorageManager.getWorkbookById(this.state.activeWorkbookId).totalQuestions);
      this.renderSingleQuestion(1);
      this.showToast('답안이 초기화되었습니다.');
    }
  },

  openSubmitReviewModal() {
    const wb = StorageManager.getWorkbookById(this.state.activeWorkbookId);
    if (!wb) return;

    const totalQ = wb.totalQuestions;
    const answeredCount = Object.keys(this.state.userAnswers).filter(q => {
      const ans = this.state.userAnswers[q];
      return ans !== null && ans !== undefined && ans !== '';
    }).length;
    const unansweredCount = totalQ - answeredCount;

    this.elements.modalSubmitSummaryText.textContent = 
      `총 ${totalQ}문제 중 ${answeredCount}문제를 마킹했습니다.`;

    const warningBox = this.elements.unansweredWarningBox;
    const badgesList = this.elements.unansweredBadgesList;
    badgesList.innerHTML = '';

    if (unansweredCount > 0) {
      warningBox.style.display = 'block';
      this.elements.unansweredSummaryText.textContent = 
        `총 ${unansweredCount}문제가 아직 마킹되지 않았습니다. 번호를 클릭하면 해당 문제로 바로 이동합니다:`;

      for (let q = 1; q <= totalQ; q++) {
        const ans = this.state.userAnswers[q];
        if (ans === undefined || ans === null || ans === '') {
          const badge = document.createElement('button');
          badge.type = 'button';
          badge.className = 'btn btn-secondary btn-sm';
          badge.style.padding = '2px 8px';
          badge.textContent = `${q}번`;
          badge.addEventListener('click', () => {
            this.closeModals();
            this.goToQuestion(q);
          });
          badgesList.appendChild(badge);
        }
      }
    } else {
      warningBox.style.display = 'none';
    }

    this.elements.modalSubmitReview.classList.add('show');
  },

  handleFinalSubmit() {
    const wb = StorageManager.getWorkbookById(this.state.activeWorkbookId);
    if (!wb) return;

    this.closeModals();

    // 채점 엔진 실행
    const result = ScoringEngine.grade(wb, this.state.userAnswers);

    // 풀이 기록 저장
    const submission = StorageManager.saveSubmission({
      workbookId: wb.id,
      userAnswers: this.state.userAnswers,
      scoreResult: result
    });

    this.state.currentSubmissionId = submission.id;
    this.state.currentResult = result;

    this.showToast('채점이 완료되었습니다!');
    this.displayResultView(wb, result);
  },

  /* ==========================================================================
     D. 채점 결과 화면 로직
     ========================================================================== */

  viewSubmissionResult(submissionId) {
    const sub = StorageManager.getSubmissionById(submissionId);
    if (!sub) {
      this.showToast('풀이 기록을 찾을 수 없습니다.');
      return;
    }

    const wb = StorageManager.getWorkbookById(sub.workbookId);
    if (!wb) {
      this.showToast('관련 문제집을 찾을 수 없습니다.');
      return;
    }

    this.state.activeWorkbookId = wb.id;
    this.state.currentSubmissionId = sub.id;
    this.state.userAnswers = { ...sub.userAnswers };

    // 항상 최신 문제집 정답 기준으로 재채점하여 보여줌 (정답 변경 대응)
    const result = ScoringEngine.grade(wb, sub.userAnswers);
    this.state.currentResult = result;

    this.displayResultView(wb, result);
  },

  displayResultView(wb, result) {
    this.elements.resultExamTitle.textContent = `${wb.title} (${wb.subject})`;

    // 정답률 표시: 채점 가능한 문제가 0개일 때는 표시 불가 처리
    if (result.gradableCount === 0 || result.accuracyRate === null) {
      this.elements.resultAccuracyRate.textContent = '-';
      this.elements.resultGradableSummary.textContent = 
        `총 ${result.totalQuestions}문제 모두 정답이 등록되지 않아 채점할 수 없습니다.`;
    } else {
      this.elements.resultAccuracyRate.textContent = result.accuracyRate;
      this.elements.resultGradableSummary.textContent = 
        `채점 기준: 총 ${result.totalQuestions}문제 중 ${result.gradableCount}문제 채점 대상`;
    }

    // 메트릭 박스 숫자 반영
    this.elements.resultCorrectCount.textContent = result.correctCount;
    this.elements.resultIncorrectCount.textContent = result.incorrectCount;
    this.elements.resultUnansweredCount.textContent = result.totalUnansweredCount;
    this.elements.resultExcludedCount.textContent = result.excludedCount;

    // 필터 카운트 반영
    this.elements.filterCountAll.textContent = result.details.length;
    this.elements.filterCountIncorrect.textContent = ScoringEngine.filterDetails(result.details, 'INCORRECT_ONLY').length;
    this.elements.filterCountCorrect.textContent = ScoringEngine.filterDetails(result.details, 'CORRECT_ONLY').length;
    this.elements.filterCountUnanswered.textContent = ScoringEngine.filterDetails(result.details, 'UNANSWERED_ONLY').length;
    this.elements.filterCountExcluded.textContent = ScoringEngine.filterDetails(result.details, 'EXCLUDED_ONLY').length;

    // 기본 필터는 'ALL'로 초기화
    this.state.resultFilter = 'ALL';
    document.querySelectorAll('.filter-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === 'ALL');
    });

    this.renderResultDetails();
    this.switchView('RESULT');
  },

  renderResultDetails() {
    const container = this.elements.resultDetailsGrid;
    container.innerHTML = '';

    if (!this.state.currentResult) return;

    const filtered = ScoringEngine.filterDetails(this.state.currentResult.details, this.state.resultFilter);

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--slate-500); background: #fff; border-radius: 8px;">
          해당 필터 조건에 일치하는 문제가 없습니다.
        </div>
      `;
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement('div');
      let statusClass = '';
      let statusBadge = '';

      switch (item.status) {
        case 'CORRECT':
          statusClass = 'is-correct';
          statusBadge = '<span class="badge badge-success">✓ 정답</span>';
          break;
        case 'INCORRECT':
          statusClass = 'is-incorrect';
          statusBadge = '<span class="badge badge-danger">✗ 오답</span>';
          break;
        case 'UNANSWERED':
          statusClass = 'is-unanswered';
          statusBadge = '<span class="badge badge-slate">미응답</span>';
          break;
        case 'EXCLUDED':
          statusClass = 'is-excluded';
          statusBadge = '<span class="badge badge-warning">채점제외</span>';
          break;
      }

      const myAnsText = item.userAnswer ? ScoringEngine.formatChoiceNumber(item.userAnswer) : '미응답';
      const correctAnsText = item.correctAnswer ? ScoringEngine.formatChoiceNumber(item.correctAnswer) : '정답 미등록';

      card.className = `result-item-card ${statusClass}`;
      card.innerHTML = `
        <div class="res-q-num">${item.questionNo}번</div>

        <div class="res-compare-box">
          <div class="res-answer-col">
            <span class="res-label">내 답안</span>
            <span class="res-val" style="color: ${item.isCorrect ? 'var(--success)' : 'var(--slate-800)'}">${myAnsText}</span>
          </div>

          <span style="color: var(--slate-300);">vs</span>

          <div class="res-answer-col">
            <span class="res-label">정답</span>
            <span class="res-val" style="color: var(--primary);">${correctAnsText}</span>
          </div>
        </div>

        <div class="res-status-tag">
          ${statusBadge}
        </div>

        <div style="margin-left: 0.5rem;">
          <select class="form-select btn-sm" style="padding: 2px 4px; font-size: 0.8rem; width: auto;" data-modify-q="${item.questionNo}" title="결과 화면에서 답안 직접 수정">
            <option value="" ${!item.userAnswer ? 'selected' : ''}>미응답</option>
            <option value="1" ${item.userAnswer === 1 ? 'selected' : ''}>①</option>
            <option value="2" ${item.userAnswer === 2 ? 'selected' : ''}>②</option>
            <option value="3" ${item.userAnswer === 3 ? 'selected' : ''}>③</option>
            <option value="4" ${item.userAnswer === 4 ? 'selected' : ''}>④</option>
            <option value="5" ${item.userAnswer === 5 ? 'selected' : ''}>⑤</option>
          </select>
        </div>
      `;

      container.appendChild(card);
    });

    // 결과 화면에서 즉시 답안 수정 및 자동 재채점 바인딩
    container.querySelectorAll('[data-modify-q]').forEach(select => {
      select.addEventListener('change', (e) => {
        const q = Number(e.target.dataset.modifyQ);
        const val = e.target.value ? Number(e.target.value) : null;

        if (val) {
          this.state.userAnswers[q] = val;
        } else {
          delete this.state.userAnswers[q];
        }

        // 재채점 수행 및 저장
        this.regradeAndRefresh();
      });
    });
  },

  regradeAndRefresh() {
    const wb = StorageManager.getWorkbookById(this.state.activeWorkbookId);
    if (!wb) return;

    const newResult = ScoringEngine.grade(wb, this.state.userAnswers);
    this.state.currentResult = newResult;

    if (this.state.currentSubmissionId) {
      StorageManager.saveSubmission({
        id: this.state.currentSubmissionId,
        workbookId: wb.id,
        userAnswers: this.state.userAnswers,
        scoreResult: newResult
      });
    }

    this.showToast('수정된 답안으로 재채점되었습니다.');
    this.displayResultView(wb, newResult);
  },

  handleRetakeExam() {
    if (confirm('처음부터 새로 풀이하시겠습니까? (이전 임시 답안은 비워집니다)')) {
      this.startSolving(this.state.activeWorkbookId, true);
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /* ==========================================================================
     F. OCR 정답 추출기 컨트롤러
     ========================================================================== */

  /**
   * OCR 뷰 이벤트 바인딩 (별도 분리하여 bindEvents와 축소)
   */
  bindOcrEvents() {
    // 뷰 취소 버튼
    document.getElementById('btnOcrCancel').addEventListener('click', () => this.switchView('HOME'));

    // 파일 선택 버튼 (카메라 / 갤러리)
    const btnCamera  = document.getElementById('btnOcrCamera');
    const btnGallery = document.getElementById('btnOcrGallery');
    const inputCamera  = document.getElementById('ocrFileInputCamera');
    const inputGallery = document.getElementById('ocrFileInputGallery');
    const btnChangeImg = document.getElementById('btnOcrChangeImage');

    btnCamera.addEventListener('click',  () => inputCamera.click());
    btnGallery.addEventListener('click', () => inputGallery.click());
    btnChangeImg.addEventListener('click', () => inputGallery.click());

    inputCamera.addEventListener('change',  (e) => this._ocrHandleFileSelect(e));
    inputGallery.addEventListener('change', (e) => this._ocrHandleFileSelect(e));

    // 드래그 앤 드롭
    const uploadZone = document.getElementById('ocrUploadZone');
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) this._ocrSetImage(file);
    });

    // 인식 시작 버튼
    document.getElementById('btnOcrStartRecognize').addEventListener('click', () => this._ocrRunRecognition());

    // 다시 인식 / 다른 이미지
    document.getElementById('btnOcrRerun').addEventListener('click',  () => this._ocrRunRecognition());
    document.getElementById('btnOcrRetry').addEventListener('click',  () => this._ocrResetToUpload());

    // 저장 확인 모달 열기
    document.getElementById('btnOcrApplyConfirm').addEventListener('click', () => this._ocrOpenConfirmModal());

    // 모달 내 저장 버튼
    document.getElementById('btnOcrConfirmSave').addEventListener('click', () => this._ocrSaveAnswers());
  },

  /**
   * OCR 뷰를 열고 대상 문제집을 설정
   */
  openOcrView(workbookId) {
    const wb = StorageManager.getWorkbookById(workbookId);
    if (!wb) { this.showToast('문제집을 찾을 수 없습니다.'); return; }

    this.state.ocrWorkbookId = workbookId;
    this.state.ocrImageFile  = null;
    this.state.ocrExtractResult = null;
    this.state.ocrOcrConfidence = null;
    this.state.ocrPendingItems  = [];

    // 부제목에 문제집 이름 표시
    document.getElementById('ocrViewSubtitle').textContent =
      `"​${wb.title}​"의 정답을 이미지에서 자동 인식합니다.`;

    this._ocrResetToUpload();
    this.switchView('OCR');
  },

  /** 파일 선택 이벤트 처리 */
  _ocrHandleFileSelect(e) {
    const file = e.target.files[0];
    e.target.value = ''; // 동일 파일 재선택 가능하도록 초기화
    if (file && file.type.startsWith('image/')) this._ocrSetImage(file);
  },

  /** 이미지 파일 설정 및 미리보기 표시 */
  _ocrSetImage(file) {
    this.state.ocrImageFile = file;
    const url = URL.createObjectURL(file);
    const img = document.getElementById('ocrPreviewImg');
    img.src = url;
    img.onload = () => URL.revokeObjectURL(url); // 메모리 해제

    document.getElementById('ocrPreviewSection').style.display = 'block';
    document.getElementById('ocrPanelProgress').style.display  = 'none';
    document.getElementById('ocrPanelResult').style.display    = 'none';
    this._ocrSetStep(1);
  },

  /** 웅로드 화면으로 리셋 */
  _ocrResetToUpload() {
    this.state.ocrImageFile = null;
    this.state.ocrExtractResult = null;
    this.state.ocrPendingItems  = [];

    document.getElementById('ocrPanelUpload').style.display   = 'block';
    document.getElementById('ocrPreviewSection').style.display = 'none';
    document.getElementById('ocrPanelProgress').style.display  = 'none';
    document.getElementById('ocrPanelResult').style.display    = 'none';
    this._ocrSetStep(1);
  },

  /** 단계 표시기 업데이트 */
  _ocrSetStep(step) {
    [1, 2, 3, 4].forEach(n => {
      const el = document.getElementById(`ocrStep${n}`);
      el.classList.remove('active', 'done');
      if (n < step)  el.classList.add('done');
      if (n === step) el.classList.add('active');
    });
  },

  /** OCR 인식 실행 */
  async _ocrRunRecognition() {
    if (!this.state.ocrImageFile) {
      this.showToast('먼저 이미지를 선택해주세요.');
      return;
    }

    // 프로그레스 패널 표시
    document.getElementById('ocrPanelProgress').style.display = 'block';
    document.getElementById('ocrPanelResult').style.display   = 'none';
    document.getElementById('ocrPreviewSection').style.display = 'none';
    this._ocrSetStep(2);

    const progressLabel  = document.getElementById('ocrProgressLabel');
    const progressFill   = document.getElementById('ocrProgressBarFill');
    const progressPct    = document.getElementById('ocrProgressPct');

    const stageLabels = {
      'loading tesseract core': 'Tesseract 엔진 로딩 중...',
      'initializing tesseract': 'Tesseract 초기화 중...',
      'loading language traineddata': '한국어/영어 언어팩 로딩 중...',
      'initializing api': 'OCR API 초기화 중...',
      'recognizing text': '텍스트 인식 중...',
    };

    try {
      const { text, ocrConfidence } = await OcrEngine.recognize(
        this.state.ocrImageFile,
        ({ stage, progress }) => {
          const label = stageLabels[stage] || `작업 중: ${stage}`;
          progressLabel.textContent = label;
          const pct = Math.round(progress * 100);
          progressFill.style.width = `${pct}%`;
          progressPct.textContent  = `${pct}%`;
        }
      );

      this.state.ocrOcrConfidence = ocrConfidence;
      const extractResult = AnswerExtractor.extractFromText(text);
      this.state.ocrExtractResult = extractResult;

      this._ocrRenderResult(extractResult, ocrConfidence);

    } catch (err) {
      document.getElementById('ocrPanelProgress').style.display = 'none';
      document.getElementById('ocrPanelResult').style.display   = 'block';
      document.getElementById('ocrErrorBox').style.display      = 'block';
      document.getElementById('ocrErrorDetail').textContent     =
        err.message || '알 수 없는 오류가 발생했습니다.';
      document.getElementById('ocrItemsGrid').innerHTML = '';
      document.getElementById('ocrDiffPanel').style.display   = 'none';
      document.getElementById('ocrActionBar').style.display   = 'none';
      document.getElementById('ocrWarningBox').style.display  = 'none';
      document.getElementById('ocrNoResultBox').style.display = 'none';
      this._ocrSetStep(3);
    }
  },

  /** 추출 결과를 화면에 렌더링 */
  _ocrRenderResult(extractResult, ocrConfidence) {
    document.getElementById('ocrPanelProgress').style.display = 'none';
    document.getElementById('ocrPanelResult').style.display   = 'block';
    document.getElementById('ocrErrorBox').style.display      = 'none';
    this._ocrSetStep(3);

    const wb = StorageManager.getWorkbookById(this.state.ocrWorkbookId);
    const existingKey = (wb && wb.answerKey) ? { ...wb.answerKey } : {};

    // ── 메타 정보 표시 ──
    const metaEl = document.getElementById('ocrResultMeta');
    const formatLabel = { FORMAT_A: '번호+정답 쌍 형식', FORMAT_B: '연속 나열 형식', COMBINED: '복합 형식', NONE: '파싱 불가' };
    let metaHtml = `<strong>OCR 인식 형식:</strong> ${formatLabel[extractResult.detectedFormat] || extractResult.detectedFormat}`;
    if (ocrConfidence !== null) {
      // Tesseract가 실제로 제공한 수치만 표시
      metaHtml += `  |  <strong>OCR 신뢰도:</strong> ${Math.round(ocrConfidence)}%`;
    }
    if (extractResult.missingQuestions.length > 0) {
      metaHtml += `  |  <strong style="color:var(--warning)">누락 문항:</strong> ${extractResult.missingQuestions.join(', ')}번`;
    }
    metaEl.innerHTML = metaHtml;

    // ── 경고 배너 ──
    const warningBox  = document.getElementById('ocrWarningBox');
    const warningList = document.getElementById('ocrWarningList');
    const allWarnings = [...extractResult.warnings];
    if (extractResult.missingQuestions.length > 0) {
      allWarnings.push({ message: `다음 문항번호가 인식 범위 안에서 누락되었습니다: ${extractResult.missingQuestions.join(', ')}번` });
    }
    if (allWarnings.length > 0) {
      warningList.innerHTML = allWarnings.map(w => `<li>• ${this.escapeHtml(w.message)}</li>`).join('');
      warningBox.style.display = 'block';
    } else {
      warningBox.style.display = 'none';
    }

    // ── 인식 결과 없음 ──
    const noResultBox = document.getElementById('ocrNoResultBox');
    const itemsGrid   = document.getElementById('ocrItemsGrid');

    if (extractResult.items.length === 0) {
      noResultBox.style.display = 'block';
      itemsGrid.innerHTML = '';
      document.getElementById('ocrDiffPanel').style.display  = 'none';
      document.getElementById('ocrActionBar').style.display  = 'none';
      return;
    }
    noResultBox.style.display = 'none';

    // ── 문항별 카드 렌더링 ──
    // 녹는 문항: OCR 결과에 없지만 기존 정답이 있는 문항
    const ocrQNums = new Set(extractResult.items.map(i => i.q));
    const existingOnlyQNums = Object.keys(existingKey)
      .map(Number)
      .filter(q => !ocrQNums.has(q) && existingKey[q]);

    this.state.ocrPendingItems = extractResult.items.map(i => ({ ...i }));

    itemsGrid.innerHTML = '';

    // OCR로 추출된 항목
    for (const item of extractResult.items) {
      const card = this._ocrBuildItemCard(item, existingKey[item.q] || null);
      itemsGrid.appendChild(card);
    }

    // 기존 정답만 있고 OCR에 없는 문항 (existing-only, 수정 불가)
    for (const q of existingOnlyQNums.sort((a, b) => a - b)) {
      const card = this._ocrBuildExistingOnlyCard(q, existingKey[q]);
      itemsGrid.appendChild(card);
    }

    // ── Diff 패널 ──
    this._ocrRenderDiff(extractResult.items, existingKey);

    document.getElementById('ocrActionBar').style.display = 'flex';
  },

  /** 문항별 정답 카드 DOM 생성 */
  _ocrBuildItemCard(item, existingAnswer) {
    const conf = item.parseConfidence; // 'HIGH' | 'LOW' | 'UNCERTAIN'
    const statusClass = conf === 'HIGH' ? 'status-high' : conf === 'LOW' ? 'status-low' : 'status-uncertain';
    const badgeClass  = conf === 'HIGH' ? 'ocr-badge-high' : conf === 'LOW' ? 'ocr-badge-low' : 'ocr-badge-uncertain';
    const badgeText   = conf === 'HIGH' ? '인식 성공' : conf === 'LOW' ? '확인 필요' : '충돌·불확실';

    const card = document.createElement('div');
    card.className = `ocr-item-card ${statusClass}`;
    card.dataset.q = item.q;

    const existNote = existingAnswer
      ? `<span style="font-size:0.72rem; color:var(--slate-400);">(기존 ${existingAnswer})</span>`
      : '';

    card.innerHTML = `
      <div class="ocr-item-qnum">${item.q}번 ${existNote}</div>
      <select class="ocr-item-select" data-q="${item.q}">
        <option value="">[미인식]</option>
        <option value="1" ${item.answer === 1 ? 'selected' : ''}>① 1번</option>
        <option value="2" ${item.answer === 2 ? 'selected' : ''}>② 2번</option>
        <option value="3" ${item.answer === 3 ? 'selected' : ''}>③ 3번</option>
        <option value="4" ${item.answer === 4 ? 'selected' : ''}>④ 4번</option>
        <option value="5" ${item.answer === 5 ? 'selected' : ''}>⑤ 5번</option>
      </select>
      <span class="ocr-item-badge ${badgeClass}">${badgeText}</span>
    `;

    // 선택 변경 시 ocrPendingItems 동기화
    card.querySelector('select').addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10);
      const idx = this.state.ocrPendingItems.findIndex(p => p.q === item.q);
      if (idx !== -1) {
        this.state.ocrPendingItems[idx].answer = isNaN(val) ? null : val;
      }
      // Diff 패널 실시간 갱신
      const wb = StorageManager.getWorkbookById(this.state.ocrWorkbookId);
      if (wb) this._ocrRenderDiff(this.state.ocrPendingItems, wb.answerKey || {});
    });

    return card;
  },

  /** 기존 정답만 있고 OCR 결과에 없는 문항 카드 (읽기 전용) */
  _ocrBuildExistingOnlyCard(q, existingAnswer) {
    const card = document.createElement('div');
    card.className = 'ocr-item-card status-existing-only';
    const symbol = ['', '①', '②', '③', '④', '⑤'][existingAnswer] || existingAnswer;
    card.innerHTML = `
      <div class="ocr-item-qnum">${q}번</div>
      <div style="font-size:0.9rem; font-weight:700; color:var(--slate-600); padding:0.3rem 0;">${symbol} 기존 유지</div>
      <span class="ocr-item-badge ocr-badge-existing">기존 정답 유지</span>
    `;
    return card;
  },

  /** Diff 패널 렌더링 — 기존 answerKey와 OCR 항목을 비교 */
  _ocrRenderDiff(ocrItems, existingKey) {
    const diffPanel = document.getElementById('ocrDiffPanel');
    const diffList  = document.getElementById('ocrDiffList');
    diffList.innerHTML = '';

    // 확정된 정답 항목만 (answer !== null)
    const confirmedItems = ocrItems.filter(i => i.answer !== null);

    if (confirmedItems.length === 0) {
      diffList.innerHTML = '<li class="ocr-diff-empty">저장할 유효한 정답 항목이 없습니다.</li>';
      diffPanel.style.display = 'block';
      return;
    }

    const fmt = (n) => ['', '①', '②', '③', '④', '⑤'][n] || String(n);
    let changeCount = 0;

    for (const item of confirmedItems) {
      const old = existingKey[item.q] ? Number(existingKey[item.q]) : null;
      const neu = item.answer;

      let rowHtml = '';
      if (old === null) {
        // 신규 추가
        rowHtml = `<span class="ocr-diff-tag-add">추가</span> → <span class="ocr-diff-new">${fmt(neu)}</span>`;
        changeCount++;
      } else if (old !== neu) {
        // 수정
        rowHtml = `<span class="ocr-diff-tag-mod">수정</span> <span class="ocr-diff-old">${fmt(old)}</span> <span class="ocr-diff-arrow">→</span> <span class="ocr-diff-new">${fmt(neu)}</span>`;
        changeCount++;
      } else {
        // 유지
        rowHtml = `<span class="ocr-diff-tag-keep">유지</span> <span style="color:var(--slate-500);">${fmt(neu)}</span>`;
      }

      const li = document.createElement('li');
      li.className = 'ocr-diff-row';
      li.innerHTML = `<span class="ocr-diff-qnum">${item.q}번</span><div class="ocr-diff-change">${rowHtml}</div>`;
      diffList.appendChild(li);
    }

    if (diffList.children.length === 0) {
      diffList.innerHTML = '<li class="ocr-diff-empty">변경되는 항목이 없습니다.</li>';
    }

    diffPanel.style.display = 'block';
    return changeCount;
  },

  /** 저장 확인 모달 열기 */
  _ocrOpenConfirmModal() {
    const wb = StorageManager.getWorkbookById(this.state.ocrWorkbookId);
    if (!wb) return;

    const confirmedItems = this.state.ocrPendingItems.filter(i => i.answer !== null);
    if (confirmedItems.length === 0) {
      this.showToast('저장할 유효한 정답 항목이 없습니다.');
      return;
    }

    const existingKey = wb.answerKey || {};
    let addCount = 0, modCount = 0, keepCount = 0;

    for (const item of confirmedItems) {
      const old = existingKey[item.q] ? Number(existingKey[item.q]) : null;
      if (old === null)     addCount++;
      else if (old !== item.answer) modCount++;
      else                  keepCount++;
    }

    document.getElementById('modalOcrSummaryText').innerHTML =
      `"${this.escapeHtml(wb.title)}"에 정답 <strong>${confirmedItems.length}개</strong>를 적용합니다.`;

    document.getElementById('modalOcrDiffPreview').innerHTML = `
      상세 내역: 신규 추가 <strong>${addCount}개</strong>,
      수정 <strong>${modCount}개</strong>,
      기존 유지 <strong>${keepCount}개</strong><br>
      <span style="color:var(--slate-400); font-size:0.82rem;">OCR 결과에 없는 기존 정답은 변경되지 않습니다.</span>
    `;

    this.elements.modalOcrConfirm.classList.add('show');
  },

  /**
   * OCR 결과를 기존 answerKey에 저장
   * 요구사항 3, 4 준수:
   *   - OCR 결과에 없는 기존 정답은 자동 삭제하지 않는다.
   *   - 확정된 항목(answer !== null)만 추가·수정한다.
   */
  _ocrSaveAnswers() {
    const wb = StorageManager.getWorkbookById(this.state.ocrWorkbookId);
    if (!wb) return;

    const confirmedItems = this.state.ocrPendingItems.filter(i => i.answer !== null);
    if (confirmedItems.length === 0) {
      this.showToast('저장할 유효한 정답 항목이 없습니다.');
      this.closeModals();
      return;
    }

    // 기존 answerKey에 덩덞쓰기 (삭제 없이 추가·수정만)
    const newKey = { ...wb.answerKey };
    for (const item of confirmedItems) {
      newKey[item.q] = item.answer;
    }

    StorageManager.saveWorkbook({ ...wb, answerKey: newKey });
    this.closeModals();
    this.showToast(`정답 ${confirmedItems.length}개가 저장되었습니다.`);
    this.switchView('HOME');
  }
};

// DOM 로드 완료 시 애플리케이션 초기화
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
