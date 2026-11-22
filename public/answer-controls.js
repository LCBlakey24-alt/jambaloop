const guides = {
  choice: ['Multiple choice', 'Tap one answer on your phone to lock it in.'],
  boolean: ['True or false', 'Tap True if the statement is right, or False if it is wrong.'],
  estimate: ['Closest number', 'Drag the number slider, use +/−, or type a whole number. Tap Lock in number to submit. The smallest difference wins. Tied guesses all score.'],
  order: ['Put in order', 'Use the ↑ and ↓ buttons to move items into the order requested, then tap Lock in order. The whole sequence must be correct.'],
};

export const answerGuide = type => guides[type] ?? guides.choice;
export const helpTypes = Object.keys(guides);
const numbers = new Intl.NumberFormat();
export const formatNumber = (value, unit = '') => `${unit === 'year' ? value : numbers.format(value)}${unit && unit !== 'year' ? ' ' + unit : ''}`;

export function createDraft(question) {
  return question.type === 'estimate' ? Math.round((question.min + question.max) / 2)
    : question.type === 'order' ? question.options.map((_, index) => index) : undefined;
}

export function orderedItems(question, order, controls, escape) {
  return order.map((option, index) => `<li><span class="item-rank">${index + 1}</span><span>${escape(question.options[option])}</span>
    ${controls ? `<span class="order-actions">
      <button type="button" data-move="-1" data-item="${index}" aria-label="Move ${escape(question.options[option])} up" ${index === 0 ? 'disabled' : ''}>↑</button>
      <button type="button" data-move="1" data-item="${index}" aria-label="Move ${escape(question.options[option])} down" ${index === order.length - 1 ? 'disabled' : ''}>↓</button></span>` : ''}</li>`).join('');
}

export function specialAnswer(question, { draft, selection, revealed, host, disabled, closest }, escape) {
  const { type, correct, unit, min, max } = question;
  if (revealed && type === 'estimate') {
    return `<div class="special-result"><span>Correct number</span><strong>${formatNumber(correct, unit)}</strong>
      ${selection !== undefined ? `<p>Your guess was <b>${formatNumber(selection, unit)}</b> · ${formatNumber(Math.abs(selection - correct))} away</p>` : ''}
      ${closest ? `<p>${closest.count} ${closest.count === 1 ? 'guess' : 'guesses'} closest · ${formatNumber(closest.distance)} away</p>` : '<p>No guesses submitted.</p>'}</div>`;
  }
  if (revealed) return `<div class="order-result"><h3>Correct order</h3><ol class="order-list">${orderedItems(question, correct, false, escape)}</ol>
    ${Array.isArray(selection) ? `<details><summary>Your order</summary><ol class="order-list">${orderedItems(question, selection, false, escape)}</ol></details>` : ''}</div>`;

  if (host) return type === 'estimate'
    ? `<div class="special-result"><span>Guess range</span><strong>${formatNumber(min, unit)} – ${formatNumber(max, unit)}</strong></div>`
    : `<ol class="order-list unordered">${question.options.map(item => `<li>${escape(item)}</li>`).join('')}</ol>`;

  const active = selection === undefined && !disabled;
  if (type === 'estimate') {
    const value = selection ?? draft;
    if (!active) return `<div class="special-result"><span>${selection === undefined ? 'Number guessing' : 'Your number'}</span><strong>${formatNumber(value, unit)}</strong></div>`;
    return `<div class="answer-editor" data-editor="estimate">
      <div class="number-editor">
        <div class="number-field"><label>Your guess${unit && unit !== 'year' ? ' (' + escape(unit) + ')' : ''}<input type="number" inputmode="numeric" min="${min}" max="${max}" step="1" data-number value="${value}"></label>
        <small>${formatNumber(min, unit)} to ${formatNumber(max, unit)}</small></div>
        <div class="number-scroller"><button type="button" data-step="1" aria-label="Increase guess">+</button>
          <input aria-label="Scroll your guess" type="range" min="${min}" max="${max}" step="1" value="${value}" data-range>
          <button type="button" data-step="-1" aria-label="Decrease guess">−</button></div>
      </div><button type="button" class="button primary" data-action="submit-special">Lock in number</button></div>`;
  }
  return `<div class="answer-editor" data-editor="order"><ol class="order-list" data-order>${orderedItems(question, selection ?? draft, active, escape)}</ol>
    ${active ? '<button type="button" class="button primary" data-action="submit-special">Lock in order</button>' : ''}</div>`;
}

export function closestStep(question, value, step) {
  const next = Number.isSafeInteger(value) ? value + step : createDraft(question);
  return Math.min(question.max, Math.max(question.min, next));
}
