// js/radio-flotante.js
// Minirreproductor flotante universal y persistente para todas las páginas

(function () {
  const RADIO_STREAMS = {
    hq: 'https://radio.unencuentroconjesusperu.com/listen/senal2/radio.mp3',      // 128 kbps MP3
    mobile: 'https://radio.unencuentroconjesusperu.com/listen/senal2/movil.aac'  // 64 kbps AAC+
  };

  let audioPlayer = null;
  let isPlaying = false;

  // 1. Determinar la URL óptima según dispositivo o preferencia manual guardada
  function obtenerUrlOptima() {
    const pref = localStorage.getItem('radio_calidad_pref');
    if (pref === 'aac') return RADIO_STREAMS.mobile;
    if (pref === 'mp3') return RADIO_STREAMS.hq;

    // Detección automática para móviles o redes con ahorro de datos
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || window.innerWidth <= 768;
    const ahorroDatos = Boolean(navigator.connection && navigator.connection.saveData);
    const redLenta = Boolean(navigator.connection && (navigator.connection.effectiveType === '2g' || navigator.connection.effectiveType === '3g'));

    return (esMovil || ahorroDatos || redLenta) ? RADIO_STREAMS.mobile : RADIO_STREAMS.hq;
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

  // 3. Conexión de eventos y control de audio
  function conectarEventosRadio() {
    audioPlayer = document.getElementById('globalRadioAudio');
    const btnPlayPause = document.getElementById('btnPlayPauseRadio');
    const btnBubble = document.getElementById('btnRadioBubble');
    const btnMinimize = document.getElementById('btnMinimizeRadio');
    const widget = document.getElementById('floatingRadioWidget');
    const iconPlay = document.getElementById('iconPlayRadio');
    const iconPause = document.getElementById('iconPauseRadio');
    const statusTag = document.getElementById('radioStatusTag');
    const eqBars = document.getElementById('radioPillEq');
    const audioPrincipal = document.getElementById('audioRadio');

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
      if (!isPlaying) {
        // Pausar el reproductor principal si está sonando en la misma página
        if (audioPrincipal && !audioPrincipal.paused) {
          audioPrincipal.pause();
        }

        statusTag.textContent = 'Conectando...';
        audioPlayer.src = obtenerUrlOptima();
        audioPlayer.preload = 'none';

        audioPlayer.play().then(() => {
          setEstadoReproduciendo(true);
        }).catch((err) => {
          console.warn('Error al iniciar stream de radio:', err);
          setEstadoReproduciendo(false);
          statusTag.textContent = 'Reconectando...';
        });
      } else {
        audioPlayer.pause();
        audioPlayer.removeAttribute('src'); // Libera la conexión de red
        audioPlayer.load();
        setEstadoReproduciendo(false);
      }
    }

    if (btnPlayPause) btnPlayPause.addEventListener('click', toggleRadio);

    // Si el usuario le da play al reproductor principal de la página, pausar este flotante
    if (audioPrincipal) {
      audioPrincipal.addEventListener('play', () => {
        if (isPlaying && audioPlayer) {
          audioPlayer.pause();
          audioPlayer.removeAttribute('src');
          audioPlayer.load();
          setEstadoReproduciendo(false);
        }
      });
    }

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

    // Eventos de estado nativo
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