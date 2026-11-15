/**
 * LALA Bridge — confiança: sinais para revisão humana
 *
 * Nada aqui bloqueia ninguém. Os sinais viram sinalizações (flags) que uma
 * pessoa da equipe revisa no painel admin.
 */

const Trust = {
  DEVICE_KEY: 'lala_bridge_device',

  /**
   * Identificador aleatório deste navegador (não identifica a pessoa). Serve
   * só para notar muitas contas criadas no mesmo dispositivo.
   */
  deviceId() {
    try {
      let id = localStorage.getItem(this.DEVICE_KEY);
      if (!id) {
        id = newId('dev');
        localStorage.setItem(this.DEVICE_KEY, id);
      }
      return id;
    } catch {
      return '';
    }
  },
};

window.Trust = Trust;
