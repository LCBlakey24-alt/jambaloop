import { answerGuide, helpTypes } from './answer-controls.js';
import { maxQuizQuestions, validateQuiz } from './custom-quiz.js';

const storageKey = 'quiz-club-library';
const maxLibrary = 30;
const newId = () => [...crypto.getRandomValues(new Uint8Array(12))].map(value => value.toString(16).padStart(2, '0')).join('');
const blank = type => ({ type, prompt: '', options: ['', '', '', ''], correct: type === 'estimate' ? '' : 0, min: 0, max: 100, unit: '' });

export function savedQuizzes() {
  try {
    const library = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(library) ? library : [];
  } catch {
    return [];
  }
}

function save(record) {
  const library = savedQuizzes();
  const index = library.findIndex(quiz => quiz.id === record.id);
  if (index < 0 && library.length >= maxLibrary) throw new Error('Your library holds up to 30 quizzes. Export and remove one to make room.');
  if (index < 0) library.unshift(record);
  else library[index] = record;
  localStorage.setItem(storageKey, JSON.stringify(library));
}

export function openLibrary(container, escape, onPlay) {
  let draft;
  let notice = '';
  const options = (items, selected) => items.map(([id, label]) => `<option value="${id}" ${id === selected ? 'selected' : ''}>${label}</option>`).join('');

  function fields(question, index) {
    const input = (key, label, type = 'text', extra = '') => `<label>${label}<input type="${type}" data-field="${key}" value="${escape(question[key] ?? '')}" ${extra}></label>`;
    let detail;
    if (question.type === 'estimate') {
      detail = `<div class="form-row">${input('correct', 'Correct number', 'number', 'step="1" required')}${input('unit', 'Unit (optional)', 'text', 'maxlength="24"')}${input('min', 'Lowest guess', 'number', 'step="1" required')}${input('max', 'Highest guess', 'number', 'step="1" required')}</div>`;
    } else if (question.type === 'boolean') {
      detail = `<label>Correct answer<select data-field="correct">${options([[0, 'True'], [1, 'False']], question.correct)}</select></label>`;
    } else {
      const ordered = question.type === 'order';
      detail = `${ordered ? '<p>Enter items in the correct order. Quiz Club shuffles them for players.</p>' : ''}
        <div class="form-row">${question.options.map((entry, option) => `<label>${ordered ? 'Item ' + (option + 1) : 'Answer ' + 'ABCD'[option]}<input data-option="${option}" maxlength="120" value="${escape(entry)}" required></label>`).join('')}</div>
        ${ordered ? '' : `<label>Correct answer<select data-field="correct">${options([...('ABCD')].map((letter, position) => [position, 'Answer ' + letter]), question.correct)}</select></label>`}`;
    }
    return `<fieldset class="editor-question" data-question="${index}"><legend>Question ${index + 1}</legend>
      <label>Answer type<select data-field="type">${options(helpTypes.map(type => [type, answerGuide(type)[0]]), question.type)}</select></label>
      <label>Question prompt<textarea data-field="prompt" maxlength="300" rows="2" required>${escape(question.prompt)}</textarea></label>${detail}
      <div class="editor-tools"><button type="button" class="button outline small" data-editor-action="up" ${index === 0 ? 'disabled' : ''}>Move up</button>
      <button type="button" class="button outline small" data-editor-action="down" ${index + 1 === draft.questions.length ? 'disabled' : ''}>Move down</button>
      <button type="button" class="button outline small" data-editor-action="remove-question" ${draft.questions.length === 1 ? 'disabled' : ''}>Remove question</button></div></fieldset>`;
  }

  function render() {
    container.innerHTML = `<div class="eyebrow">CUSTOM QUIZZES</div><h2 id="dialog-title">${draft ? 'Quiz editor' : 'My quizzes'}</h2>
      <p role="status">${escape(notice)}</p><p class="error" role="alert"></p>${draft
        ? `<form class="quiz-author"><label>Quiz title<input maxlength="80" data-field="title" value="${escape(draft.title)}" required></label>
          ${draft.questions.map(fields).join('')}<div class="editor-tools">
          <button type="button" class="button outline" data-editor-action="add" ${draft.questions.length >= maxQuizQuestions ? 'disabled' : ''}>Add question</button>
          <button class="button primary" type="submit">Save quiz</button>
          <button type="button" class="button outline" data-editor-action="back">Back to library</button></div></form>`
        : `<p>Quizzes are saved in this browser. Export a quiz to bring it to another phone or computer.</p><div class="editor-tools">
          <button class="button primary" data-editor-action="new">New quiz</button>
          <label class="button outline file-button">Import JSON<input type="file" accept="application/json,.json" data-import></label></div>
          <div class="saved-quizzes">${savedQuizzes().map(quiz => `<section data-quiz="${escape(quiz.id)}"><h3>${escape(quiz.title)}</h3>
          <p>${quiz.questions.length} ${quiz.questions.length === 1 ? 'question' : 'questions'}</p><div class="editor-tools">
            <button class="button primary small" data-editor-action="play">Use quiz</button>
            <button class="button outline small" data-editor-action="edit">Edit</button>
            <button class="button outline small" data-editor-action="export">Export</button>
            <button class="button outline small" data-editor-action="remove">Delete</button>
          </div></section>`).join('')}</div>`}`;
    notice = '';
  }

  function error(message) {
    container.querySelector('.error').textContent = message;
  }

  function updateField(event) {
    const field = event.target;
    if (!draft || (!field.hasAttribute('data-field') && !field.hasAttribute('data-option'))) return;
    if (field.dataset.field === 'title') {
      draft.title = field.value;
      return;
    }
    const row = Number(field.closest('[data-question]').dataset.question);
    const question = draft.questions[row];
    if (field.hasAttribute('data-option')) question.options[Number(field.dataset.option)] = field.value;
    else if (field.dataset.field !== 'type') {
      const key = field.dataset.field;
      question[key] = ['min', 'max', 'correct'].includes(key) && field.value !== '' ? Number(field.value) : field.value;
    }
  }

  container.addEventListener('input', updateField);
  container.addEventListener('change', async event => {
    const field = event.target;
    if (field.dataset.field === 'type' && draft) {
      const row = Number(field.closest('[data-question]').dataset.question);
      draft.questions[row] = { ...blank(field.value), prompt: draft.questions[row].prompt };
      render();
      container.querySelector(`[data-question="${row}"] [data-field="type"]`).focus();
    } else if (field.hasAttribute('data-import') && field.files.length) {
      try {
        if (field.files[0].size > 131072) throw new Error('Choose a Quiz Club JSON export under 128 KB.');
        const quiz = validateQuiz(JSON.parse(await field.files[0].text()));
        save({ ...quiz, id: newId() });
        notice = 'Quiz imported.';
        render();
      } catch (err) {
        error(err instanceof SyntaxError ? 'That file is not a valid Quiz Club JSON quiz.' : err.message);
        field.value = '';
      }
    } else updateField(event);
  });

  container.addEventListener('submit', event => {
    event.preventDefault();
    try {
      save({ ...validateQuiz(draft), id: draft.id });
      draft = undefined;
      notice = 'Quiz saved.';
      render();
    } catch (err) { error(err.message); }
  });

  container.addEventListener('click', event => {
    const button = event.target.closest('[data-editor-action]');
    if (!button) return;
    const action = button.dataset.editorAction;
    const card = button.closest('[data-quiz]');
    const quiz = card && savedQuizzes().find(entry => entry.id === card.dataset.quiz);
    const row = Number(button.closest('[data-question]')?.dataset.question);
    if (action === 'remove' && quiz) {
      if (confirm('Delete “' + quiz.title + '” from this browser?')) {
        localStorage.setItem(storageKey, JSON.stringify(savedQuizzes().filter(entry => entry.id !== quiz.id)));
        notice = 'Quiz deleted.';
        render();
      }
      return;
    }
    if (action === 'play' && quiz) return onPlay(quiz.id);
    if (action === 'export' && quiz) {
      const file = new Blob([JSON.stringify(validateQuiz(quiz), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${quiz.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'quiz-club'}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    if (action === 'new') draft = { id: newId(), title: '', questions: [blank('choice')] };
    else if (action === 'edit' && quiz) draft = structuredClone(quiz);
    else if (action === 'back') draft = undefined;
    else if (action === 'add') draft.questions.push(blank('choice'));
    else if (action === 'remove-question') draft.questions.splice(row, 1);
    else if (action === 'up' || action === 'down') {
      const destination = row + (action === 'up' ? -1 : 1);
      [draft.questions[row], draft.questions[destination]] = [draft.questions[destination], draft.questions[row]];
    }
    render();
    if (action === 'add') container.querySelector('[data-question]:last-of-type [data-field="prompt"]')?.focus();
  });

  render();
}
