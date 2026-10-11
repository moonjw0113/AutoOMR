/**
 * AutoOMR - 자동 채점 엔진 (Scoring Engine)
 * 답안 입력 방식(수동 마킹, 스캔, OCR, 카메라 판독 등)과 무관하게
 * 문제집의 정답과 사용자 답안을 비교/분석하는 독립된 비즈니스 로직
 */

const ScoringEngine = {
  /**
   * 문제집 정답과 사용자 답안을 비교하여 종합 채점 결과 반환
   * @param {Object} workbook - 문제집 객체 ({ totalQuestions, answerKey: { [q]: 1~5 } })
   * @param {Object} userAnswers - 사용자 답안 객체 ({ [q]: 1~5 })
   * @returns {Object} 채점 결과 통계 및 문제별 상세 분석
   */
  grade(workbook, userAnswers = {}) {
    if (!workbook) {
      throw new Error('채점할 문제집 정보가 유효하지 않습니다.');
    }

    const totalQuestions = Number(workbook.totalQuestions) || 0;
    const answerKey = workbook.answerKey || {};
    
    let gradableCount = 0;          // 정답이 등록되어 채점 가능한 문제 수
    let correctCount = 0;           // 정답 수
    let incorrectCount = 0;         // 오답 수 (채점 대상 중 틀린 것 - 미응답 포함/구분)
    let totalUnansweredCount = 0;   // 전체 문제 중 답안을 기재하지 않은 수
    let gradableUnansweredCount = 0;// 채점 가능 문제 중 미응답 수
    let excludedCount = 0;          // 정답 미등록으로 채점 제외된 문제 수

    const details = [];

    for (let q = 1; q <= totalQuestions; q++) {
      const correctAns = answerKey[q] !== undefined && answerKey[q] !== null && answerKey[q] !== '' 
        ? Number(answerKey[q]) 
        : null;
      
      const userAns = userAnswers[q] !== undefined && userAnswers[q] !== null && userAnswers[q] !== ''
        ? Number(userAnswers[q])
        : null;

      const isGradable = correctAns !== null && correctAns >= 1 && correctAns <= 5;
      const isAnswered = userAns !== null && userAns >= 1 && userAns <= 5;

      if (!isAnswered) {
        totalUnansweredCount++;
      }

      let status = 'UNANSWERED'; // 기본값

      if (!isGradable) {
        // 정답이 등록되지 않은 문제는 채점 대상에서 제외 (오답 처리 X)
        status = 'EXCLUDED';
        excludedCount++;
      } else {
        gradableCount++;

        if (!isAnswered) {
          // 채점 대상이지만 사용자가 답을 안 적은 경우
          status = 'UNANSWERED';
          gradableUnansweredCount++;
          incorrectCount++; // 채점 대상에서 미응답은 득점 실패(오답 영역)
        } else if (userAns === correctAns) {
          status = 'CORRECT';
          correctCount++;
        } else {
          status = 'INCORRECT';
          incorrectCount++;
        }
      }

      details.push({
        questionNo: q,
        userAnswer: userAns,
        correctAnswer: correctAns,
        isGradable: isGradable,
        isAnswered: isAnswered,
        isCorrect: isGradable && isAnswered && userAns === correctAns,
        status: status // 'CORRECT' | 'INCORRECT' | 'UNANSWERED' | 'EXCLUDED'
      });
    }

    // 정답률 계산: 채점 가능한 문제를 기준으로 계산 (소수점 1자리)
    // 채점 가능한 문제가 0개라면 정답률 null 처리
    const accuracyRate = gradableCount > 0 
      ? Number(((correctCount / gradableCount) * 100).toFixed(1))
      : null;

    return {
      totalQuestions,
      gradableCount,
      correctCount,
      incorrectCount,
      totalUnansweredCount,
      gradableUnansweredCount,
      excludedCount,
      accuracyRate, // null 또는 0.0 ~ 100.0
      details
    };
  },

  /**
   * 특정 상태의 문제만 필터링 (오답만 보기, 정답만 보기 등)
   */
  filterDetails(details, filterType = 'ALL') {
    if (!Array.isArray(details)) return [];

    switch (filterType) {
      case 'INCORRECT_ONLY': // 오답 (미응답 포함 실점 문제)
        return details.filter(d => d.isGradable && !d.isCorrect);
      case 'WRONG_MARKED_ONLY': // 사용자가 마킹했으나 틀린 문제
        return details.filter(d => d.status === 'INCORRECT');
      case 'CORRECT_ONLY': // 맞춘 문제만
        return details.filter(d => d.status === 'CORRECT');
      case 'UNANSWERED_ONLY': // 미응답 문제만
        return details.filter(d => !d.isAnswered);
      case 'EXCLUDED_ONLY': // 정답 미등록 문제만
        return details.filter(d => d.status === 'EXCLUDED');
      case 'ALL':
      default:
        return details;
    }
  },

  /**
   * 보기 번호에 따른 원형 번호 문자열 (①~⑤) 변환 헬퍼
   */
  formatChoiceNumber(num) {
    const circleNumbers = {
      1: '①',
      2: '②',
      3: '③',
      4: '④',
      5: '⑤'
    };
    return circleNumbers[num] || (num ? String(num) : '-');
  }
};
