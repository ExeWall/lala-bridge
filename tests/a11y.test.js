import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { loadApp } from './helpers/load-app.js';

const pages = readdirSync('.').filter((f) => f.endsWith('.html'));

function parse(file) {
  return new DOMParser().parseFromString(readFileSync(file, 'utf8'), 'text/html');
}

describe('estrutura acessível das páginas', () => {
  it.each(pages)('%s: idioma, título, <main> e link para pular ao conteúdo', (file) => {
    const doc = parse(file);
    expect(doc.documentElement.lang).toBe('pt-BR');
    expect(doc.title.trim()).not.toBe('');
    expect(doc.querySelectorAll('main#main')).toHaveLength(1);
    expect(doc.querySelector('a.skip-link[href="#main"]')).not.toBeNull();
  });

  it.each(pages)('%s: todo campo de formulário tem rótulo', (file) => {
    const doc = parse(file);
    const fields = [...doc.querySelectorAll('input, select, textarea')].filter(
      (el) => el.type !== 'hidden'
    );
    const unlabeled = fields.filter((el) => {
      if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return false;
      return !el.id || !doc.querySelector(`label[for="${el.id}"]`);
    });
    expect(unlabeled.map((el) => el.id || el.outerHTML.slice(0, 60))).toEqual([]);
  });

  it.each(pages)('%s: botões têm nome acessível', (file) => {
    const doc = parse(file);
    const nameless = [...doc.querySelectorAll('button')].filter(
      (b) => !b.textContent.trim() && !b.getAttribute('aria-label')
    );
    expect(nameless).toHaveLength(0);
  });
});

describe('modal', () => {
  it('é um diálogo rotulado, fecha com Esc e devolve o foco', async () => {
    const { App } = loadApp();
    document.body.innerHTML = '<button id="abrir">abrir</button>';
    const opener = document.getElementById('abrir');
    opener.focus();
    App.showModal('Título', '<input id="campo">', [{ label: 'OK', onClick: () => {} }]);

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')).textContent).toBe(
      'Título'
    );
    expect(document.activeElement.id).toBe('campo');

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.activeElement).toBe(opener);
  });
});

describe('toasts', () => {
  it('ficam numa região ao vivo e erros usam role=alert', () => {
    const { App } = loadApp();
    document.body.innerHTML = '';
    App.showToast('ok', 'success');
    App.showToast('falhou', 'error');
    expect(document.querySelector('.toast-container').getAttribute('aria-live')).toBe('polite');
    expect(document.querySelector('.toast--error').getAttribute('role')).toBe('alert');
  });
});
