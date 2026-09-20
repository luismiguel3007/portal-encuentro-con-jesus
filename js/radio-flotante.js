// js/radio-flotante.js
// Minirreproductor flotante universal y persistente para todas las páginas

(function () {
  let audioPlayer = null;
  let isPlaying = false;
  let radioStreamUrl = localStorage.getItem('radio_live_url') || '';

  // 1. Obtener la URL real de la radio desde Supabase
  async function obtenerUrlStream() {
    const supabaseClient = window.db || (typeof db !== 'undefined' ? db : null);
    if (!supabaseClient) return radioStreamUrl;

    try {
      const { data, error } = await supabaseClient
        .from('ajustes')
        .select('radio_url')
        .eq('id', 1)
        .single();

      if (!error && data && data.radio_url && data.radio_url.trim() !== '') {
        radioStreamUrl = data.radio_url.trim();
        localStorage.setItem('radio_live_url', radioStreamUrl);
      }
    } catch (e) {
      console.warn('No se pudo verificar la URL de radio en tiempo real:', e);
    }
    return radioStreamUrl;
  }

  // 2. Inyectar la interfaz flotante en el HTML
  function inyectarInterfazRadio() {
    // Si ya existe en la página o es el panel de admin, no duplicar
    if (document.getElementById('floatingRadioWidget') || document.body.classList.contains('admin-body')) {
      return;
    }

    const widget = document.createElement('div');
    widget.id = 'floatingRadioWidget';
    widget.className = 'radio-global-float';
    widget.innerHTML = `
      <audio id="globalRadioAudio" preload="none"></audio>
      
      <!-- Burbuja Compacta (cuando está minimizado) -->
      <button type="button" class="radio-bubble-btn" id="btnRadioBubble" title="Radio Encuentro en Vivo" aria-label="Abrir radio">
        <span class="bubble-icon">📻</span>
        <span class="bubble-dot"></span>
      </button>

      <!-- Panel Completo -->
      <div class="radio-pill-card" id="radioPillCard">
        <button type="button" class="btn-radio-toggle" id="btnPlayPauseRadio" aria-label="Reproducir o pausar radio">
          <svg id="iconPlayRadio" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <svg id="iconPauseRadio" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="display:none;">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        </button>

        <div class="radio-pill-meta">
          <div class="radio-pill-title">
            <span>Radio Encuentro</span>
            <span class="radio-live-tag" id="radioStatusTag">Pausado</span>
          </div>
          <!-- Animación de Barras -->
          <div class="radio-pill-eq" id="radioPillEq">
            <span class="eq-b"></span><span class="eq-b"></span>
            <span class="eq-b"></span><span class="eq-b"></span>
          </div>
        </div>

        <button type="button" class="btn-radio-minimize" id="btnMinimizeRadio" title="Minimizar">
          &minus;
        </button>
      </div>
    `;

    document.body.appendChild(widget);
    conectarEventosRadio();
  }

  // 3. Conexión de eventos y reproducción
  async function conectarEventosRadio() {
    audioPlayer = document.getElementById('globalRadioAudio');
    const btnPlayPause = document.getElementById('btnPlayPauseRadio');
    const btnBubble = document.getElementById('btnRadioBubble');
    const btnMinimize = document.getElementById('btnMinimizeRadio');
    const widget = document.getElementById('floatingRadioWidget');
    const iconPlay = document.getElementById('iconPlayRadio');
    const iconPause = document.getElementById('iconPauseRadio');
    const statusTag = document.getElementById('radioStatusTag');
    const eqBars = document.getElementById('radioPillEq');

    // Recuperar stream inicial
    await obtenerUrlStream();

    function setEstadoReproduciendo(activo) {
      isPlaying = activo;
      if (activo) {
        iconPlay.style.display = 'none';
        iconPause.style.display = 'block';
        statusTag.textContent = 'En Vivo';
        statusTag.classList.add('live');
        eqBars.classList.add('animating');
        widget.classList.add('is-playing');
      } else {
        iconPlay.style.display = 'block';
        iconPause.style.display = 'none';
        statusTag.textContent = 'Pausado';
        statusTag.classList.remove('live');
        eqBars.classList.remove('animating');
        widget.classList.remove('is-playing');
      }
    }

    async function toggleRadio() {
      if (!radioStreamUrl) {
        await obtenerUrlStream();
      }

      if (!radioStreamUrl) {
        statusTag.textContent = 'Sin señal';
        alert('No hay una señal de radio activa configurada en el panel administrativo.');
        return;
      }

      if (!isPlaying) {
        statusTag.textContent = 'Conectando...';
        audioPlayer.src = radioStreamUrl;

        audioPlayer.play().then(() => {
          setEstadoReproduciendo(true);
        }).catch((err) => {
          console.error('Error al reproducir audio:', err);
          setEstadoReproduciendo(false);
          statusTag.textContent = 'Reconectando...';
        });
      } else {
        audioPlayer.pause();
        audioPlayer.src = ''; // Libera el stream de red
        setEstadoReproduciendo(false);
      }
    }

    if (btnPlayPause) btnPlayPause.addEventListener('click', toggleRadio);

    // Alternar entre minimizado y expandido
    if (btnMinimize) {
      btnMinimize.addEventListener('click', () => {
        widget.classList.add('minimized');
      });
    }

    if (btnBubble) {
      btnBubble.addEventListener('click', () => {
        widget.classList.remove('minimized');
      });
    }

    // Sincronizar si se pausa por sistema o error
    audioPlayer.addEventListener('pause', () => setEstadoReproduciendo(false));
    audioPlayer.addEventListener('playing', () => setEstadoReproduciendo(true));
    audioPlayer.addEventListener('error', () => {
      setEstadoReproduciendo(false);
      statusTag.textContent = 'Señal pausada';
    });
  }

  // Inicializar al cargar el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inyectarInterfazRadio);
  } else {
    inyectarInterfazRadio();
  }
})();