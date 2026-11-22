export const maxQuizQuestions = 40;

function cleanText(value, max) {
  return typeof value === 'string' && value.trim().length <= max ? value.trim() : '';
}

export function validateQuiz(raw) {
  const title = cleanText(raw?.title, 80);
  if (!title) throw new Error('Enter a quiz title of up to 80 characters.');
  if (!Array.isArray(raw.questions) || raw.questions.length < 1 || raw.questions.length > maxQuizQuestions) {
    throw new Error('A quiz needs between 1 and 40 questions.');
  }
  const questions = raw.questions.map((question, index) => {
    const fail = message => { throw new Error(`Question ${index + 1}: ${message}`); };
    const prompt = cleanText(question?.prompt, 300);
    const type = question?.type;
    if (!prompt) fail('enter a prompt of up to 300 characters.');
    if (type === 'estimate') {
      const { min, max, correct } = question;
      if (![min, max, correct].every(n => Number.isSafeInteger(n) && Math.abs(n) <= 1000000000)
        || min >= max || correct < min || correct > max) fail('enter whole numbers with the answer inside the range.');
      return { type, prompt, min, max, correct, unit: cleanText(question.unit, 24) };
    }
    if (type === 'boolean') {
      if (![0, 1].includes(question.correct)) fail('select True or False.');
      return { type, prompt, correct: question.correct, options: ['True', 'False'] };
    }
    if (!['choice', 'order'].includes(type) || !Array.isArray(question.options) || question.options.length !== 4) {
      fail('enter four answers or four items.');
    }
    const options = question.options.map(value => cleanText(value, 120));
    if (options.some(value => !value) || new Set(options.map(value => value.toLowerCase())).size !== options.length) {
      fail('each answer or item must be distinct and 120 characters or fewer.');
    }
    if (type === 'order') return { type, prompt, options };
    if (![0, 1, 2, 3].includes(question.correct)) fail('select the correct answer.');
    return { type, prompt, options, correct: question.correct };
  });
  return { title, questions };
}

export function prepareCustomQuiz(quiz) {
  return quiz.questions.map(question => {
    const base = { ...question, category: 'custom' };
    if (['boolean', 'estimate'].includes(question.type)) return base;
    const indices = question.options.map((_, index) => index);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    if (question.type === 'order' && indices.every((item, index) => item === index)) indices.push(indices.shift());
    return {
      ...base,
      options: indices.map(index => question.options[index]),
      correct: question.type === 'order' ? question.options.map((_, index) => indices.indexOf(index)) : indices.indexOf(question.correct),
    };
  });
}
