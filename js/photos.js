/**
 * LALA Bridge — fotos: compressão no navegador antes de guardar/enviar
 *
 * Reduz o lado maior para no máximo `maxSize` px e salva em JPEG. Isso
 * economiza dados móveis de quem envia e espaço de quem guarda.
 */

const Photos = {
  MAX_PHOTOS: 3,
  /** Modo local: fotos pequenas, guardadas no navegador como data URL. */
  LOCAL_OPTIONS: { maxSize: 640, quality: 0.7, output: 'dataURL' },
  /** Modo Supabase: fotos maiores, enviadas ao Storage como arquivo. */
  REMOTE_OPTIONS: { maxSize: 1280, quality: 0.8, output: 'blob' },

  async _loadImage(file) {
    if (typeof createImageBitmap === 'function') return createImageBitmap(file);
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  },

  /**
   * @param {File|Blob} file
   * @returns {Promise<string|Blob>} data URL ou Blob JPEG
   */
  async compress(file, { maxSize = 1280, quality = 0.8, output = 'blob' } = {}) {
    if (!file || !/^image\//.test(file.type)) throw new Error(I18n.t('photos.invalidType'));
    const img = await this._loadImage(file);
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    if (output === 'dataURL') return canvas.toDataURL('image/jpeg', quality);
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  },
};

window.Photos = Photos;
