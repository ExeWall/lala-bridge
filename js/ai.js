/**
 * LALA Bridge — IA no navegador
 *
 * As chamadas de IA de verdade acontecem nas Edge Functions do Supabase (a
 * chave nunca vem para o navegador). Este módulo:
 *   - chama essas funções quando o backend é Supabase;
 *   - cai para regras simples locais (LocalAI) quando a IA não está
 *     disponível, para o fluxo nunca travar;
 *   - devolve sempre `source: 'ai' | 'local'`, para a tela dizer de onde
 *     veio a sugestão. Quem decide é sempre a pessoa: tudo vem editável.
 */

const LocalAI = {
  _norm(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  },

  CATEGORY_WORDS: [
    ['laptop', /\b(notebook|note|laptop|computador|pc|chromebook|macbook)\b/],
    ['phone', /\b(celular|smartphone|telefone|tablet|ipad|iphone)\b/],
    ['headphones', /\b(fone|fones|headset|microfone|audio)\b/],
    ['monitor', /\b(monitor|tela extra|segunda tela)\b/],
    ['peripherals', /\b(teclado|mouse|webcam|camera usb|impressora)\b/],
    ['books', /\b(livro|livros|apostila|apostilas|material de estudo)\b/],
  ],

  detectCategory(text) {
    const t = this._norm(text);
    const hit = this.CATEGORY_WORDS.find(([, re]) => re.test(t));
    return hit ? hit[0] : 'other';
  },

  /** RAM, armazenamento, sistema e câmera mencionados no texto. */
  parseSpecs(text) {
    const t = this._norm(text);
    const specs = {};
    const ram =
      t.match(/(\d{1,2})\s*gb\s*(de\s*)?(ram|memoria)/) ||
      t.match(/(ram|memoria)\s*(de\s*)?(\d{1,2})\s*gb/);
    if (ram) specs.ramGb = Number(ram[1] && /^\d+$/.test(ram[1]) ? ram[1] : ram[3]);
    const storage =
      t.match(/(\d{2,4})\s*(gb|tb)\s*(de\s*)?(ssd|hd|armazenamento|hdd)/) ||
      t.match(/(ssd|hd)\s*(de\s*)?(\d{2,4})\s*(gb|tb)/);
    if (storage) {
      const [num, unit] = /^\d+$/.test(storage[1])
        ? [storage[1], storage[2]]
        : [storage[3], storage[4]];
      specs.storageGb = Number(num) * (unit === 'tb' ? 1024 : 1);
    }
    const os = t.match(/\b(windows|linux|android|ios|macos|chrome ?os)\b/);
    if (os) specs.os = os[1].replace(/^\w/, (c) => c.toUpperCase());
    if (/\b(camera|webcam|videochamada|chamada de video|video ?chamada)\b/.test(t))
      specs.camera = true;
    return specs;
  },

  /** Para que a pessoa vai usar: o trecho depois de "pra"/"para". */
  intendedUse(text) {
    const m = String(text || '').match(/\b(?:pra|para)\s+([^.!?\n]{4,140})/i);
    if (!m) return '';
    const use = m[1].trim().replace(/[,;:]$/, '');
    return use.charAt(0).toUpperCase() + use.slice(1);
  },

  urgency(text) {
    const t = this._norm(text);
    if (/\b(sem pressa|quando puder|nao e urgente|nao tem pressa)\b/.test(t)) return 'low';
    if (
      /\b(urgente|urgencia|o quanto antes|logo|essa semana|esta semana|prazo|amanha|estagio|emprego|entrevista|prova|vestibular|enem|so tenho o celular|nao tenho (nenhum|computador|notebook))\b/.test(
        t
      )
    ) {
      return 'high';
    }
    return 'medium';
  },

  structureNeed(text) {
    const category = this.detectCategory(text);
    const requirements = this.parseSpecs(text);
    const t = this._norm(text);
    if (category === 'laptop' && !requirements.ramGb) {
      if (/\b(programa|python|java|codigo|desenvolv|design|edicao|video|dados|ia)\w*/.test(t))
        requirements.ramGb = 8;
    }
    const use = this.intendedUse(text);
    const catName = App.getCategory(category).name;
    const title = (
      use ? `${catName} para ${use.charAt(0).toLowerCase()}${use.slice(1)}` : catName
    ).slice(0, 80);
    const urgency = this.urgency(text);
    return {
      category,
      title,
      intendedUse: use,
      requirements,
      urgency,
      justification: I18n.t('ai.localJustification'),
    };
  },

  impactSummary({ laliderName, donationTitle, text }) {
    const quote = String(text || '')
      .trim()
      .slice(0, 200);
    return I18n.t('ai.localImpactSummary', {
      name: laliderName || I18n.t('common.unknown'),
      item: donationTitle || I18n.t('ai.theItem'),
      quote,
    });
  },
};

const AI = {
  get remote() {
    return LALA_CONFIG.BACKEND === 'supabase';
  },

  /**
   * Organiza um pedido escrito com as próprias palavras.
   * @returns {Promise<{ success, suggestion, source, message? }>}
   */
  async structureNeed(text) {
    if (String(text || '').trim().length < 5) {
      return { success: false, message: I18n.t('ai.textTooShort') };
    }
    if (this.remote) {
      const { data, errorKey } = await Remote.invoke('structure-need', { text });
      if (data?.suggestion) return { success: true, suggestion: data.suggestion, source: 'ai' };
      console.warn('IA indisponível, usando regras locais:', errorKey);
    }
    return { success: true, suggestion: LocalAI.structureNeed(text), source: 'local' };
  },

  /** Transcreve áudio gravado (só com backend e IA configurados). */
  async transcribe(blob) {
    if (!this.remote) return { success: false, message: I18n.t('ai.voiceNeedsServer') };
    const form = new FormData();
    form.append('audio', blob, 'audio.webm');
    form.append('language', I18n.locale.slice(0, 2));
    const { data, errorKey } = await Remote.invoke('transcribe', form);
    if (data?.text) return { success: true, text: data.text };
    return { success: false, message: I18n.t(errorKey || 'ai.unavailable') };
  },

  /** Reconhecimento de voz do próprio navegador (alternativa sem servidor). */
  browserSpeech() {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    return Rec ? Rec : null;
  },

  /** Analisa as fotos de uma doação (só com backend e IA configurados). */
  async analyzeDonation(images, title = '') {
    if (!this.remote) {
      return {
        success: false,
        message: I18n.t('ai.photoNeedsServer'),
        specs: LocalAI.parseSpecs(title),
      };
    }
    const { data, errorKey } = await Remote.invoke('analyze-donation', { images, title });
    if (data?.suggestion) return { success: true, suggestion: data.suggestion, source: 'ai' };
    return {
      success: false,
      message: I18n.t(errorKey || 'ai.unavailable'),
      specs: LocalAI.parseSpecs(title),
    };
  },

  /** Gera o embedding de um item novo (em segundo plano; falhas são ignoradas). */
  embed(kind, id) {
    if (!this.remote || !id) return Promise.resolve();
    return Remote.invoke('embed', { kind, id }).catch(() => {});
  },

  async impactSummary(update, context) {
    if (this.remote) {
      const { data } = await Remote.invoke('impact-summary', { updateId: update.id });
      if (data?.summary) return { summary: data.summary, source: 'ai' };
    }
    return { summary: LocalAI.impactSummary({ ...context, text: update.text }), source: 'local' };
  },
};

window.LocalAI = LocalAI;
window.AI = AI;
