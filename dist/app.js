'use strict';

const STORAGE_KEY = 'delo.tasks.v1';
const form = document.querySelector('#task-form');
const input = document.querySelector('#task-input');
const list = document.querySelector('#task-list');
const status = document.querySelector('#status');
let filter = 'all';
let tasks = [];
let storageFailed = false;

function announce(message) { status.textContent = message; }

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return;
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved) || !saved.every(task => task && typeof task.id === 'string' && typeof task.text === 'string' && task.text.trim().length > 0 && task.text.length <= 300 && typeof task.completed === 'boolean') || new Set(saved.map(task => task.id)).size !== saved.length) {
      throw new Error('Invalid task data');
    }
    tasks = saved;
  } catch {
    storageFailed = true;
    announce('Не удалось прочитать сохранённые задачи. Обновите страницу или проверьте доступ к хранилищу браузера.');
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    storageFailed = false;
    return true;
  } catch {
    storageFailed = true;
    announce('Задачи изменены, но не сохранены. Возможно, хранилище браузера заполнено или недоступно.');
    return false;
  }
}

function render() {
  const completed = tasks.filter(task => task.completed).length;
  const visible = tasks.filter(task => filter === 'all' || (filter === 'completed' ? task.completed : !task.completed));
  list.replaceChildren();
  for (const task of visible) {
    const row = document.createElement('li');
    row.className = `task-row${task.completed ? ' completed' : ''}`;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-toggle';
    checkbox.id = `task-${task.id}`;
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => {
      const index = visible.findIndex(item => item.id === task.id);
      task.completed = checkbox.checked;
      const saved = saveTasks();
      render();
      const controls = list.querySelectorAll('.task-toggle');
      const replacement = document.getElementById(`task-${task.id}`) || controls[Math.min(index, controls.length - 1)];
      (replacement || input).focus();
      if (saved) announce(task.completed ? 'Задача выполнена. Ещё один шаг!' : 'Задача снова в работе.');
    });
    const label = document.createElement('label');
    label.className = 'task-label';
    label.htmlFor = checkbox.id;
    label.textContent = task.text;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete-button';
    remove.setAttribute('aria-label', `Удалить задачу: ${task.text}`);
    remove.title = 'Удалить задачу';
    remove.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    remove.addEventListener('click', () => {
      const index = visible.findIndex(item => item.id === task.id);
      tasks = tasks.filter(item => item.id !== task.id);
      const saved = saveTasks();
      render();
      const buttons = list.querySelectorAll('.delete-button');
      (buttons[Math.min(index, buttons.length - 1)] || input).focus();
      if (saved) announce('Задача удалена.');
    });
    row.append(checkbox, label, remove);
    list.append(row);
  }
  document.querySelector('#total-count').textContent = tasks.length;
  document.querySelector('#all-count').textContent = tasks.length;
  document.querySelector('#active-count').textContent = tasks.length - completed;
  document.querySelector('#completed-count').textContent = completed;
  document.querySelector('#empty-state').hidden = visible.length > 0;
  const messages = !tasks.length
    ? ['Чистый лист. Отличное начало.', 'Добавьте первую задачу — пусть планы станут делами.']
    : filter === 'active'
      ? ['Все дела сделаны. Можно выдохнуть.', 'Добавьте новую задачу или насладитесь паузой.']
      : ['Здесь будут ваши маленькие победы.', 'Отметьте выполненную задачу — она появится здесь.'];
  document.querySelector('#empty-title').textContent = messages[0];
  document.querySelector('#empty-description').textContent = messages[1];
  const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  document.querySelector('#progress-label').textContent = tasks.length ? `Выполнено ${completed} из ${tasks.length}` : 'Всё готово для ваших планов';
  document.querySelector('#progress-percent').textContent = `${percent}%`;
  document.querySelector('#progress-fill').style.width = `${percent}%`;
  document.querySelector('#progress').setAttribute('aria-valuenow', percent);
  document.querySelector('#save-label').textContent = storageFailed ? 'Не удалось сохранить' : 'Сохраняются автоматически';
  for (const button of document.querySelectorAll('[data-filter]')) button.setAttribute('aria-pressed', button.dataset.filter === filter);
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) {
    announce('Введите текст задачи. Одних пробелов недостаточно.');
    input.focus();
    return;
  }
  const id = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
  tasks.push({ id, text, completed: false });
  const saved = saveTasks();
  input.value = '';
  filter = 'all';
  render();
  input.focus();
  if (saved) announce('Задача добавлена и сохранена.');
});

for (const button of document.querySelectorAll('[data-filter]')) button.addEventListener('click', () => {
  filter = button.dataset.filter;
  render();
});

window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY || event.key === null) {
    tasks = [];
    storageFailed = false;
    loadTasks();
    render();
    if (!storageFailed) announce('Список обновлён из другой вкладки.');
  }
});

const date = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
document.querySelector('#date-label').textContent = date.toLocaleUpperCase('ru-RU');
loadTasks();
render();
