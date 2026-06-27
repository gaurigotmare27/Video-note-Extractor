import React, { useState } from 'react';

export default function StudyZoneTab({ quiz = [], flashcards = [] }) {
  const [activeView, setActiveView] = useState('flashcards'); // 'flashcards' or 'quiz'
  
  // Flashcards state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const handleNextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => Math.min(prev + 1, flashcards.length - 1));
    }, 150);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => Math.max(prev - 1, 0));
    }, 150);
  };

  const handleOptionSelect = (idx) => {
    if (quizSubmitted) return;
    setSelectedOptionIndex(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOptionIndex === null || quizSubmitted) return;
    
    setQuizSubmitted(true);
    const isCorrect = selectedOptionIndex === quiz[currentQuestionIndex].answer_index;
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOptionIndex(null);
    setQuizSubmitted(false);
    
    if (currentQuestionIndex < quiz.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setQuizSubmitted(false);
    setScore(0);
    setQuizFinished(false);
  };

  return (
    <div>
      <div className="study-toggle-row">
        <button 
          className={`study-view-btn ${activeView === 'flashcards' ? 'active' : ''}`}
          onClick={() => setActiveView('flashcards')}
        >
          🎴 Flashcards
        </button>
        <button 
          className={`study-view-btn ${activeView === 'quiz' ? 'active' : ''}`}
          onClick={() => setActiveView('quiz')}
        >
          📝 Quiz Arena
        </button>
      </div>

      {activeView === 'flashcards' ? (
        /* FLASHCARDS VIEW */
        <div className="flashcard-deck">
          {flashcards.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '20px' }}>
              No study cards available.
            </div>
          ) : (
            <>
              <div 
                className={`flashcard-container ${isFlipped ? 'flipped' : ''}`}
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <div className="flashcard">
                  <div className="flashcard-front">
                    <span className="card-title">Concept Question</span>
                    <div className="card-content">{flashcards[currentCardIndex].front}</div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '20px' }}>
                      👆 Click to Reveal Answer
                    </span>
                  </div>
                  
                  <div className="flashcard-back">
                    <span className="card-title" style={{ color: 'var(--accent-teal)' }}>Explanation / Answer</span>
                    <div className="card-content">{flashcards[currentCardIndex].back}</div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '20px' }}>
                      👆 Click to Flip Back
                    </span>
                  </div>
                </div>
              </div>

              <div className="deck-nav">
                <button 
                  className="deck-nav-btn"
                  onClick={handlePrevCard}
                  disabled={currentCardIndex === 0}
                >
                  ◀
                </button>
                <span className="deck-counter">
                  {currentCardIndex + 1} / {flashcards.length}
                </span>
                <button 
                  className="deck-nav-btn"
                  onClick={handleNextCard}
                  disabled={currentCardIndex === flashcards.length - 1}
                >
                  ▶
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        /* QUIZ VIEW */
        <div className="quiz-container">
          {quiz.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '20px' }}>
              No quiz questions available.
            </div>
          ) : quizFinished ? (
            /* Quiz Completed Results Screen */
            <div className="quiz-results">
              <div className="quiz-score-circle">
                <span className="quiz-score-num">{score} / {quiz.length}</span>
                <span className="quiz-score-lbl">Correct Answers</span>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <h3>Quiz Complete!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '300px', marginTop: '8px' }}>
                  {score === quiz.length 
                    ? "Perfect! You've completely mastered this video content!" 
                    : score >= quiz.length / 2 
                      ? "Good job! You've grasped most of the core concepts." 
                      : "Keep practicing! Re-watch the segments and study the notes."
                  }
                </p>
              </div>

              <button className="btn-primary" onClick={handleRestartQuiz} style={{ marginTop: '10px' }}>
                🔄 Retake Quiz
              </button>
            </div>
          ) : (
            /* Active Quiz Question Screen */
            <>
              <div className="quiz-progress">
                Question {currentQuestionIndex + 1} of {quiz.length}
              </div>

              <div className="quiz-question">
                {quiz[currentQuestionIndex].question}
              </div>

              <div className="quiz-options">
                {quiz[currentQuestionIndex].options.map((option, idx) => {
                  let optionClass = '';
                  
                  if (quizSubmitted) {
                    if (idx === quiz[currentQuestionIndex].answer_index) {
                      optionClass = 'correct'; // Show correct answer in green
                    } else if (idx === selectedOptionIndex) {
                      optionClass = 'incorrect'; // Show selected incorrect in red
                    }
                  } else if (idx === selectedOptionIndex) {
                    optionClass = 'selected'; // Highlight selected option
                  }

                  return (
                    <button
                      key={idx}
                      className={`quiz-option ${optionClass}`}
                      onClick={() => handleOptionSelect(idx)}
                      disabled={quizSubmitted}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                {!quizSubmitted ? (
                  <button 
                    className="btn-primary" 
                    onClick={handleSubmitAnswer}
                    disabled={selectedOptionIndex === null}
                  >
                    Submit Answer
                  </button>
                ) : (
                  <button className="btn-primary" onClick={handleNextQuestion}>
                    {currentQuestionIndex === quiz.length - 1 ? 'Finish Quiz' : 'Next Question'}
                  </button>
                )}
              </div>

              {/* Answer Explanation Feedback */}
              {quizSubmitted && (
                <div className={`quiz-feedback ${selectedOptionIndex === quiz[currentQuestionIndex].answer_index ? 'success' : 'error'}`}>
                  <div className="quiz-feedback-title">
                    {selectedOptionIndex === quiz[currentQuestionIndex].answer_index 
                      ? '✓ Correct Answer!' 
                      : '✗ Incorrect Answer.'
                    }
                  </div>
                  <div>{quiz[currentQuestionIndex].explanation}</div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
