interface QuestionResult {
  question: string;
  answer: number;
}

type QuestionGenerator = () => QuestionResult;

// Generate random math questions
export function generateQuestion(): QuestionResult {
  const operations: QuestionGenerator[] = [
    generateAddition,
    generateSubtraction,
    generateMultiplication,
    generateDivision,
    generateSquare,
    generateCube,
  ];

  const operation = operations[Math.floor(Math.random() * operations.length)];
  return operation();
}

function generateAddition(): QuestionResult {
  const a = Math.floor(Math.random() * 100) + 1;
  const b = Math.floor(Math.random() * 100) + 1;
  return {
    question: `${a} + ${b}`,
    answer: a + b,
  };
}

function generateSubtraction(): QuestionResult {
  const a = Math.floor(Math.random() * 100) + 1;
  const b = Math.floor(Math.random() * 100) + 1;
  const max = Math.max(a, b);
  const min = Math.min(a, b);
  return {
    question: `${max} - ${min}`,
    answer: max - min,
  };
}

function generateMultiplication(): QuestionResult {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  return {
    question: `${a} × ${b}`,
    answer: a * b,
  };
}

function generateDivision(): QuestionResult {
  const b = Math.floor(Math.random() * 12) + 1;
  const answer = Math.floor(Math.random() * 20) + 1;
  const a = b * answer;
  return {
    question: `${a} ÷ ${b}`,
    answer: answer,
  };
}

function generateSquare(): QuestionResult {
  const a = Math.floor(Math.random() * 15) + 1;
  return {
    question: `${a}²`,
    answer: a * a,
  };
}

function generateCube(): QuestionResult {
  const a = Math.floor(Math.random() * 10) + 1;
  return {
    question: `${a}³`,
    answer: a * a * a,
  };
}