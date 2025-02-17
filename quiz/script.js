const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Sound effect generators
function createSuccessSound() {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1);
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.3);
}

function createErrorSound() {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(220, audioContext.currentTime + 0.2);
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
  
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.2);
}

function createButtonClickSound() {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
  
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
  
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.1);
}

// Game statistics
let gameStats = {
  correctAnswers: [],
  incorrectAnswers: [],
  timePerQuestion: [],
  startTime: null
};

let currentQuestion;
let questions = [];
let selectedCategory;
let difficultyRate = Math.floor(Math.random() * 10000000);
let askedQuestions = [];
let correctAnswersCount = 0;
let currentQuestionIndex = 0;
const TOTAL_QUESTIONS = 10;

async function translateToArabic(jsonData) {
  try {
    const response = await fetch('/api/ai_completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        prompt: `Translate the strings of the question and answer values to Arabic using proper tashkiel and poetic Arabic and do not translate English names and respond with a JSON format.
        
        interface Question {
          category: string;
          correct_answer: string;
          difficulty: string;
          incorrect_answers: string[];
          question: string;
          type: string;
        }
        
        {
          "category": "معرفة عامة",
          "correct_answer": "جواب صحيح",
          "difficulty": "متوسط",
          "incorrect_answers": ["جواب خاطئ 1", "جواب خاطئ 2", "جواب خاطئ 3"],
          "question": "سؤال؟",
          "type": "متعدد"
        }
        `,
        data: JSON.stringify(jsonData)
      }),
    });

    const translatedData = await response.json();
    return translatedData;
  } catch (error) {
    console.error('Error translating to Arabic:', error);
    return null;
  }
}

function updateProgressBar() {
  const progressBar = document.querySelector('.progress-bar');
  const progress = ((currentQuestionIndex) / TOTAL_QUESTIONS) * 100;
  progressBar.style.width = `${progress}%`;
}

async function loadQuestions() {
  showLoadingScreen();
  hideAnswerButtons();
  document.getElementById('next-button').style.display = 'none';
  
  try {
    difficultyRate = Math.floor(Math.random() * 10000000);
    let apiURL = `https://opentdb.com/api.php?amount=10&category=${selectedCategory}&type=multiple`;

    if (askedQuestions.length > 0) {
      const askedQuestionsParam = askedQuestions.join('|');
      apiURL += `&avoid=${askedQuestionsParam}`;
    }

    const response = await fetch(apiURL);
    const data = await response.json();
    const translatedQuestions = [];

    for (const questionData of data.results) {
      const translatedQuestion = await translateToArabic(questionData);
      if (translatedQuestion) {
        translatedQuestions.push(translatedQuestion);
      }
    }

    questions = translatedQuestions;
    currentQuestionIndex = 0;
    hideLoadingScreen();
    showAnswerButtons();
    loadQuestion();
  } catch (error) {
    console.error('Error fetching questions:', error);
    document.getElementById('question-text').textContent = 'فشل في تحميل الأسئلة. يرجى المحاولة مرة أخرى.';
    hideLoadingScreen();
  }
}

function loadQuestion() {
  updateProgressBar();
  const questionElement = document.getElementById('question-text');
  const optionsContainer = document.getElementById('options');
  const resultElement = document.getElementById('result-message');
  const nextButton = document.getElementById('next-button');

  if (questions.length === 0) {
    showEndScreen();
    return;
  }

  currentQuestion = questions.shift();
  currentQuestionIndex++;
  gameStats.startTime = new Date(); // Reset timer for new question
  
  questionElement.textContent = decodeURIComponent(currentQuestion.question);
  // Set ARIA live region to announce new question
  questionElement.setAttribute('aria-live', 'polite');
  
  resultElement.textContent = '';
  resultElement.className = '';

  const answers = [...currentQuestion.incorrect_answers, currentQuestion.correct_answer];
  answers.sort(() => Math.random() - 0.5);

  optionsContainer.innerHTML = '';

  answers.forEach((answer, index) => {
    const button = document.createElement('button');
    button.classList.add('answer-btn', 'option');
    button.textContent = decodeURIComponent(answer);
    button.onclick = () => {
      createButtonClickSound();
      checkAnswer(answer);
    };
    // Accessibility: Add proper ARIA labels
    button.setAttribute('aria-label', `خيار ${index + 1}: ${decodeURIComponent(answer)}`);
    optionsContainer.appendChild(button);
  });
  
  showAnswerButtons();
  nextButton.style.display = 'none';
}

function checkAnswer(selectedAnswer) {
  const resultElement = document.getElementById('result-message');
  const nextButton = document.getElementById('next-button');
  const correct = selectedAnswer === decodeURIComponent(currentQuestion.correct_answer);
  
  if (correct) {
    createSuccessSound();
    resultElement.textContent = 'إجابة صحيحة! أحسنت!';
    correctAnswersCount++;
    gameStats.correctAnswers.push({
      question: currentQuestion.question,
      answer: selectedAnswer
    });
  } else {
    createErrorSound();
    resultElement.textContent = `إجابة خاطئة. الإجابة الصحيحة هي: ${decodeURIComponent(currentQuestion.correct_answer)}`;
    gameStats.incorrectAnswers.push({
      question: currentQuestion.question,
      userAnswer: selectedAnswer,
      correctAnswer: currentQuestion.correct_answer
    });
  }
  
  resultElement.className = correct ? 'correct' : 'incorrect';
  
  // Calculate time taken for this question
  const endTime = new Date();
  const timeTaken = (endTime - gameStats.startTime) / 1000; // in seconds
  gameStats.timePerQuestion.push(timeTaken);
  
  document.querySelectorAll('.answer-btn').forEach(btn => {
    btn.disabled = true;
  });
  hideAnswerButtons();

  askedQuestions.push(currentQuestion.question);
  nextButton.style.display = 'block';
  nextButton.focus(); // Accessibility: Move focus to next button
}

function showEndScreen() {
  const quizContainer = document.getElementById('quiz-container');
  const endScreen = document.getElementById('end-screen');
  const finalResult = document.getElementById('final-result');
  const statsContainer = document.getElementById('stats-container');

  quizContainer.style.display = 'none';
  endScreen.style.display = 'block';
  
  // Calculate statistics
  const totalQuestions = TOTAL_QUESTIONS;
  const correctCount = gameStats.correctAnswers.length;
  const incorrectCount = gameStats.incorrectAnswers.length;
  const averageTime = gameStats.timePerQuestion.reduce((a, b) => a + b, 0) / totalQuestions;
  
  let message = `لقد أجبت على ${correctCount} أسئلة صحيحة من أصل ${totalQuestions}.\n`;
  const percentage = (correctCount / totalQuestions) * 100;
  
  if (percentage === 100) {
    message += 'ممتاز! نتيجة مثالية! ';
  } else if (percentage >= 80) {
    message += 'أداء رائع! ';
  } else if (percentage >= 60) {
    message += 'أداء جيد! ';
  } else {
    message += 'حاول مرة أخرى لتحسين نتيجتك! ';
  }
  
  finalResult.textContent = message;
  
  // Detailed statistics
  statsContainer.innerHTML = `
    <div class="stats-box" role="region" aria-label="إحصائيات تفصيلية">
      <h3>إحصائيات تفصيلية</h3>
      <p>عدد الإجابات الصحيحة: ${correctCount}</p>
      <p>عدد الإجابات الخاطئة: ${incorrectCount}</p>
      <p>معدل الوقت لكل سؤال: ${averageTime.toFixed(2)} ثانية</p>
      <p>نسبة النجاح: ${percentage.toFixed(1)}%</p>
    </div>
  `;
  
  correctAnswersCount = 0;
  gameStats = {
    correctAnswers: [],
    incorrectAnswers: [],
    timePerQuestion: [],
    startTime: null
  };
}

function showLoadingScreen() {
  document.getElementById('loading-screen').style.display = 'flex';
}

function hideLoadingScreen() {
  document.getElementById('loading-screen').style.display = 'none';
}

function hideAnswerButtons() {
  const optionsContainer = document.getElementById('options');
  optionsContainer.style.display = 'none';
}

function showAnswerButtons() {
  const optionsContainer = document.getElementById('options');
  optionsContainer.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
  const categorySelection = document.getElementById('category-selection');
  const quizContainer = document.getElementById('quiz-container');
  const startButton = document.getElementById('start-button');
  const categoryDropdown = document.getElementById('category-dropdown');

  const categoryOptions = {
    "9": "معرفة عامة",
    "10": "الترفيه: الكتب",
    "11": "الترفيه: الأفلام",
    "12": "الترفيه: الموسيقى",
    "13": "الترفيه: المسرحيات والموسيقى",
    "14": "الترفيه: التلفزيون",
    "15": "الترفيه: ألعاب الفيديو",
    "16": "الترفيه: ألعاب اللوحة",
    "17": "العلوم والطبيعة",
    "18": "العلوم: أجهزة الكمبيوتر",
    "19": "العلوم: الرياضيات",
    "20": "الأساطير",
    "21": "الرياضة",
    "22": "الجغرافيا",
    "23": "التاريخ",
    "24": "السياسة",
    "25": "الفن",
    "26": "المشاهير",
    "27": "الحيوانات",
    "28": "المركبات",
    "29": "الترفيه: كاريكاتير",
    "30": "العلوم: الأدوات",
    "31": "الترفيه: الأنمي والمانجا اليابانية",
    "32": "الترفيه: الرسوم المتحركة"
  };

  categoryDropdown.innerHTML = Object.entries(categoryOptions)
    .map(([value, text]) => `<option value="${value}">${text}</option>`)
    .join('');

  startButton.addEventListener('click', () => {
    selectedCategory = categoryDropdown.value;
    categorySelection.style.display = 'none';
    quizContainer.style.display = 'block';
    loadQuestions();
  });

  document.getElementById('next-button').addEventListener('click', () => {
    loadQuestion();
  });

  document.getElementById('restart-button').addEventListener('click', () => {
    questions = [];
    askedQuestions = [];

    document.getElementById('end-screen').style.display = 'none';
    document.getElementById('category-selection').style.display = 'block';
  });
});