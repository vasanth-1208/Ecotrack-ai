'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function EducationPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Reading Article
  const [activeArticle, setActiveArticle] = useState<any | null>(null);

  // Modal State for Quiz Wizard
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const fetchEducationData = async () => {
    try {
      const artRes = await api.education.getArticles();
      setArticles(artRes.articles);

      const quizRes = await api.education.getQuizzes();
      setQuizzes(quizRes.quizzes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchEducationData();
      setLoading(false);
    };
    init();
  }, []);

  const handleReadArticle = async (article: any) => {
    setActiveArticle(article);
    try {
      const res = await api.education.readArticle(article.id);
      if (res.rewards) {
        alert(`📖 Article Read! Reward: +${res.rewards.pointsEarned} Points!`);
      }
      await fetchEducationData(); // refresh read status
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectOption = (idx: number) => {
    if (selectedOptionIdx !== null) return; // already answered
    setSelectedOptionIdx(idx);
    setShowExplanation(true);
    
    const isCorrect = idx === activeQuiz.questions[currentQuestionIdx].correctOptionIndex;
    if (isCorrect) {
      setQuizScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = async () => {
    const nextIdx = currentQuestionIdx + 1;
    setSelectedOptionIdx(null);
    setShowExplanation(false);

    if (nextIdx < activeQuiz.questions.length) {
      setCurrentQuestionIdx(nextIdx);
    } else {
      setQuizFinished(true);
      try {
        const res = await api.education.submitQuiz(activeQuiz.id, quizScore);
        if (res.passed && res.rewards) {
          alert(`🏆 Quiz Passed! Reward: +${res.rewards.pointsEarned} Points!`);
        } else if (!res.passed) {
          alert(`Quiz completed. Score: ${quizScore}/5. You need at least 3 correct answers to pass and earn rewards.`);
        }
        await fetchEducationData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const startQuiz = (quiz: any) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIdx(0);
    setSelectedOptionIdx(null);
    setShowExplanation(false);
    setQuizScore(0);
    setQuizFinished(false);
  };

  if (loading) {
    return (
      <div className="flex-1 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-semibold text-slate-600 dark:text-slate-400">Loading Educational Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Educational Learning Hub</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Read environmental guides, complete quizzes, understand UN SDGs, and unlock points.</p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Articles List */}
        <div className="lg:col-span-7 space-y-6">
          <h2 className="text-xl font-bold text-slate-850 dark:text-white">Sustainability Guides & Articles</h2>
          
          <div className="space-y-4">
            {articles.map((art) => (
              <div key={art.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-[10px] font-bold rounded uppercase">
                      {art.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">{art.readTimeMinutes} min read</span>
                  </div>
                  <h3 className="font-bold text-slate-850 dark:text-white text-base mt-2">{art.title}</h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{art.summary}</p>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  <span className="text-[10px] text-slate-400 font-semibold">SDGs: {art.sdgAlignments.join(', ')}</span>
                  <button
                    onClick={() => handleReadArticle(art)}
                    className="py-1.5 px-4 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-all"
                  >
                    {art.read ? 'Re-read Article' : 'Read Guide (+15 pts)'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Quizzes List */}
        <div className="lg:col-span-5 space-y-6">
          <h2 className="text-xl font-bold text-slate-850 dark:text-white">Interactive Quizzes</h2>

          <div className="space-y-4">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-850 dark:text-white text-base">{quiz.title}</h3>
                    <span className="text-xs font-bold text-amber-500 whitespace-nowrap">⭐ +{quiz.pointsReward} pts</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">{quiz.description}</p>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 flex justify-between items-center">
                  <span className="text-xs text-slate-400">
                    {quiz.completed ? `Passed (Score: ${quiz.score}/5)` : 'Not taken'}
                  </span>
                  
                  <button
                    onClick={() => startQuiz(quiz)}
                    className="py-1.5 px-4 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-all"
                  >
                    {quiz.completed ? 'Retake Quiz' : 'Start Quiz'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ARTICLE READER MODAL */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 flex flex-col h-[80vh] min-h-0">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">{activeArticle.category}</span>
                <h3 className="font-bold text-xl text-slate-850 dark:text-white mt-1">{activeArticle.title}</h3>
              </div>
              <button 
                onClick={() => setActiveArticle(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 text-sm leading-relaxed space-y-4 whitespace-pre-line text-slate-655 dark:text-slate-350">
              {activeArticle.content}
            </div>

            <button
              onClick={() => setActiveArticle(null)}
              className="w-full mt-6 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg transition-all"
            >
              Done Reading
            </button>
          </div>
        </div>
      )}

      {/* QUIZ MODAL WIZARD */}
      {activeQuiz && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
            
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-emerald-800 dark:text-emerald-400">{activeQuiz.title}</h3>
              <button 
                onClick={() => setActiveQuiz(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {!quizFinished ? (
              <div className="space-y-4">
                {/* Question progress */}
                <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                  <span>Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}</span>
                  <span>Score: {quizScore}</span>
                </div>

                <p className="font-bold text-sm text-slate-850 dark:text-white leading-normal">
                  {activeQuiz.questions[currentQuestionIdx].question}
                </p>

                {/* Options list */}
                <div className="space-y-2">
                  {activeQuiz.questions[currentQuestionIdx].options.map((opt: string, i: number) => {
                    const isCorrect = i === activeQuiz.questions[currentQuestionIdx].correctOptionIndex;
                    const isSelected = i === selectedOptionIdx;
                    
                    let btnStyle = 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/50';
                    
                    if (selectedOptionIdx !== null) {
                      if (isCorrect) {
                        btnStyle = 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 font-bold';
                      } else if (isSelected) {
                        btnStyle = 'border-red-600 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 font-bold';
                      } else {
                        btnStyle = 'border-slate-200 dark:border-slate-800 opacity-60';
                      }
                    }

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectOption(i)}
                        className={`w-full p-3 border rounded-xl text-left text-xs transition-all ${btnStyle}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {/* Question explanation feedback */}
                {showExplanation && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-xs leading-normal">
                    <p className="font-bold text-emerald-800 dark:text-emerald-450 uppercase text-[9px] mb-1">Coach Explanation</p>
                    <p className="text-slate-600 dark:text-slate-400">{activeQuiz.questions[currentQuestionIdx].explanation}</p>
                    
                    <button
                      onClick={handleNextQuestion}
                      className="w-full mt-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg transition-all"
                    >
                      {currentQuestionIdx + 1 === activeQuiz.questions.length ? 'Finish Quiz' : 'Next Question →'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-4 py-4">
                <span className="text-5xl block animate-bounce">🏁</span>
                <h3 className="font-bold text-xl text-slate-850 dark:text-white">Quiz Completed!</h3>
                <p className="text-sm text-slate-500 leading-normal">
                  You scored <span className="font-bold text-slate-800 dark:text-white">{quizScore} / 5</span>.
                </p>
                
                <p className="text-xs font-bold text-emerald-600">
                  {quizScore >= 3 
                    ? '🎉 Congratulations! You passed this quiz and earned stars.' 
                    : 'Try retaking the quiz to achieve a passing score of 3/5.'}
                </p>

                <button
                  onClick={() => setActiveQuiz(null)}
                  className="w-full mt-6 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg transition-all"
                >
                  Close Wizard
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
