import React, { useState, useEffect } from 'react';
import './App.css';

// Иконки из Heroicons
const MicrophoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 7a4 4 0 1 1 8 0v6a4 4 0 1 1-8 0V7zm8 0a4 4 0 0 0-8 0v6a4 4 0 0 0 8 0V7z"/>
    <path d="M12 14c-3.314 0-6-2.686-6-6V7a6 6 0 1 1 12 0v1c0 3.314-2.686 6-6 6z"/>
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4v16m8-8H4"/>
  </svg>
);

const MinusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 12H4"/>
  </svg>
);

const analyzeFinanceText = (text) => {
  // Приводим текст к нижнему регистру для упрощения поиска
  const lowerText = text.toLowerCase();
  
  // Определяем тип операции (доход/расход)
  const incomeKeywords = ['получил', 'заработал', 'зарплата', 'доход'];
  const expenseKeywords = ['потратил', 'заплатил', 'купил', 'расход'];
  
  const type = incomeKeywords.some(word => lowerText.includes(word)) ? 'income' :
               expenseKeywords.some(word => lowerText.includes(word)) ? 'expense' : 
               null;
  
  // Ищем число в тексте
  const numberMatch = lowerText.match(/\d+/);
  const amount = numberMatch ? parseInt(numberMatch[0]) : null;
  
  // Ищем категорию после числа
  let category = null;
  if (amount !== null) {
    const afterNumber = lowerText.slice(lowerText.indexOf(amount.toString()) + amount.toString().length);
    // Ищем слова после "на" или "за"
    const categoryMatch = afterNumber.match(/(?:на|за)\s+([а-яё]+(?:\s+[а-яё]+)*)/);
    if (categoryMatch) {
      category = categoryMatch[1].trim();
    }
  }
  
  return {
    type,
    amount,
    category
  };
};

function App() {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [operations, setOperations] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Новые состояния для формы ручного ввода
  const [manualAmount, setManualAmount] = useState('');
  const [manualCategory, setManualCategory] = useState('');
  const [manualType, setManualType] = useState('expense');
  const [showManualForm, setShowManualForm] = useState(false);

  // Загрузка операций из LocalStorage при запуске
  useEffect(() => {
    const savedOperations = localStorage.getItem('financeOperations');
    if (savedOperations) {
      setOperations(JSON.parse(savedOperations));
    }
  }, []);

  // Сохранение операций в LocalStorage при их изменении
  useEffect(() => {
    localStorage.setItem('financeOperations', JSON.stringify(operations));
  }, [operations]);

  useEffect(() => {
    // Проверяем поддержку Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Ваш браузер не поддерживает распознавание речи. Попробуйте использовать Chrome.');
      return;
    }

    // Инициализируем распознавание речи
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();
    
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'ru-RU';

    recognitionInstance.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      
      setRecognizedText(transcript);
      const analysis = analyzeFinanceText(transcript);
      setAnalysisResult(analysis);

      // Если анализ успешен и содержит все необходимые данные, добавляем новую операцию
      if (analysis.type && analysis.amount) {
        const newOperation = {
          ...analysis,
          id: Date.now(), // Уникальный идентификатор для каждой операции
          date: new Date().toISOString() // Дата и время операции
        };
        setOperations(prevOperations => [...prevOperations, newOperation]);
      }
    };

    recognitionInstance.onerror = (event) => {
      console.error('Ошибка распознавания речи:', event.error);
      setIsListening(false);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  const getTotalAmount = (type) => {
    return getFilteredOperations()
      .filter(op => op.type === type)
      .reduce((sum, op) => sum + op.amount, 0);
  };

  const getFilteredOperations = () => {
    return operations.filter(operation => {
      const operationDate = new Date(operation.date);
      const filterDateObj = new Date(filterDate);

      switch (filterType) {
        case 'day':
          return operationDate.toDateString() === filterDateObj.toDateString();
        case 'month':
          return operationDate.getMonth() === filterDateObj.getMonth() &&
                 operationDate.getFullYear() === filterDateObj.getFullYear();
        default:
          return true;
      }
    });
  };

  const handleFilterChange = (type) => {
    setFilterType(type);
    if (type === 'all') {
      setFilterDate(new Date().toISOString().split('T')[0]);
    }
  };

  const handleDateChange = (event) => {
    setFilterDate(event.target.value);
  };

  const getFilteredOperationsCount = () => {
    return getFilteredOperations().length;
  };

  const getAnalysisDisplay = () => {
    if (!analysisResult || !analysisResult.type) return null;

    const typeText = analysisResult.type === 'income' ? 'Доход' : 'Расход';
    const amountText = analysisResult.amount ? `${analysisResult.amount} ₽` : 'Сумма не указана';
    const categoryText = analysisResult.category ? `Категория: ${analysisResult.category}` : 'Категория не указана';

    return (
      <div className={`analysis-result ${analysisResult.type}`}>
        <h3>{typeText}</h3>
        <p>{amountText}</p>
        <p>{categoryText}</p>
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualAmount || !manualCategory) return;

    const newOperation = {
      id: Date.now(),
      type: manualType,
      amount: parseFloat(manualAmount),
      category: manualCategory,
      date: new Date().toISOString()
    };

    setOperations(prevOperations => [...prevOperations, newOperation]);
    setManualAmount('');
    setManualCategory('');
    setShowManualForm(false);
  };

  const handleTranscriptChange = (e) => {
    const text = e.target.value;
    setRecognizedText(text);
  };

  const handleDone = () => {
    if (!recognizedText.trim()) return;
    
    setIsProcessing(true);
    const analysis = analyzeFinanceText(recognizedText);
    setAnalysisResult(analysis);

    if (analysis.type && analysis.amount) {
      const newOperation = {
        id: Date.now(),
        type: analysis.type,
        amount: analysis.amount,
        category: analysis.category || 'Без категории',
        date: new Date().toISOString()
      };
      setOperations(prevOperations => [...prevOperations, newOperation]);
      setRecognizedText('');
      setAnalysisResult(null);
    }
    setIsProcessing(false);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Finance Voice Tracker</h1>
        <div className="input-controls">
          <button 
            className={`record-button ${isListening ? 'recording' : ''}`}
            onClick={toggleListening}
            title={isListening ? 'Остановить запись' : 'Начать запись'}
          >
            <MicrophoneIcon />
            {isListening && (
              <div className="recording-indicator">
                <div className="recording-dot"></div>
                <span>Идет запись...</span>
              </div>
            )}
          </button>
        </div>

        <div className="transcript-container">
          <h2>Введите или продиктуйте операцию</h2>
          <textarea
            className="transcript-text"
            value={recognizedText}
            onChange={handleTranscriptChange}
            placeholder="Например: 'покушал в ресторане 5000' или 'получил зарплату 50000'"
            rows={3}
          />
          <button 
            className="done-button"
            onClick={handleDone}
            disabled={!recognizedText.trim() || isProcessing}
          >
            {isProcessing ? 'Обработка...' : 'Готово'}
          </button>
          {analysisResult && (
            <div className={`analysis-preview ${analysisResult.type}`}>
              <div className="analysis-type">
                {analysisResult.type === 'income' ? <PlusIcon /> : <MinusIcon />}
                <span>{analysisResult.type === 'income' ? 'Доход' : 'Расход'}</span>
              </div>
              <div className="analysis-amount">{analysisResult.amount} ₽</div>
              {analysisResult.category && (
                <div className="analysis-category">{analysisResult.category}</div>
              )}
            </div>
          )}
        </div>
        {getAnalysisDisplay()}
        <div className="operations-list">
          <div className="operations-header">
            <h2>История операций</h2>
            <div className="filter-controls">
              <div className="filter-buttons">
                <button 
                  className={`filter-button ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('all')}
                >
                  Все
                </button>
                <button 
                  className={`filter-button ${filterType === 'day' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('day')}
                >
                  По дням
                </button>
                <button 
                  className={`filter-button ${filterType === 'month' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('month')}
                >
                  По месяцам
                </button>
              </div>
              {filterType !== 'all' && (
                <input
                  type="date"
                  value={filterDate}
                  onChange={handleDateChange}
                  className="date-filter"
                />
              )}
            </div>
            <div className="operations-summary">
              <div className="summary-item income">
                <span>Доходы</span>
                <span>{getTotalAmount('income')} ₽</span>
              </div>
              <div className="summary-item expense">
                <span>Расходы</span>
                <span>{getTotalAmount('expense')} ₽</span>
              </div>
              <div className="summary-item balance">
                <span>Баланс</span>
                <span>{getTotalAmount('income') - getTotalAmount('expense')} ₽</span>
              </div>
            </div>
          </div>
          {getFilteredOperationsCount() === 0 ? (
            <div className="no-operations">
              {filterType === 'all' ? 'Пока нет операций. Запишите первую!' : 'Нет операций за выбранный период'}
            </div>
          ) : (
            getFilteredOperations().map(operation => (
              <div key={operation.id} className={`operation-item ${operation.type}`}>
                <div className="operation-date">{formatDate(operation.date)}</div>
                <div className="operation-type">
                  {operation.type === 'income' ? <PlusIcon /> : <MinusIcon />}
                </div>
                <div className="operation-amount">
                  {operation.type === 'income' ? '+' : '-'}{operation.amount} ₽
                </div>
                {operation.category && (
                  <div className="operation-category">{operation.category}</div>
                )}
              </div>
            ))
          )}
        </div>
      </header>
    </div>
  );
}

export default App; 