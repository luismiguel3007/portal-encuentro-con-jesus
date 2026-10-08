
/*
 * Radio La Voz del Encuentro — RadioPlayer adaptado para AzuraCast
 * Basado en el proyecto joeyboli/RadioPlayer (AGPL-3.0).
 * Conservar los avisos originales y la licencia AGPL-3.0.
 *
 * Audio: señal MP3 de 64 kbps (Señal 2).
 * Metadatos: API pública de AzuraCast.
 * DETENER: cierra la conexión.
 * ESCUCHAR: vuelve a la emisión en directo.
 * Reconexión: automática ante fallos y pausas inesperadas.
 */

let CONFIG = {
    STREAM_URL: 'https://radio.unencuentroconjesusperu.com/listen/senal2/movil.mp3',
    API_URL: 'https://radio.unencuentroconjesusperu.com/api/nowplaying/2',

    STATION_NAME: 'RADIO LA VOZ DEL ENCUENTRO',
    STATION_LOGO: '../icon-192.png',
    BRAND_NAME: 'RADIO LA VOZ DEL ENCUENTRO',
    PRIMARY_COLOR: '#e5a823',
    ACCENT_COLOR: '#e5a823',
    DYNAMIC_THEME: false,

    FALLBACK_ARTIST: 'Radio La Voz del Encuentro',
    FALLBACK_TRACK: 'TRANSMISIÓN EN VIVO',
    FALLBACK_BITRATE: '64',
    FALLBACK_FORMAT: 'MP3',
    FALLBACK_ARTWORK: '../icon-512.png',

    LABEL_PLAY: 'ESCUCHAR',
    LABEL_STOP: 'DETENER',
    DEFAULT_VOLUME: 0.8,

    META_INTERVAL_MS: 15_000,
    PROGRESS_INTERVAL_MS: 1_000,
    FETCH_TIMEOUT_MS: 8_000,
    HISTORY_COMPACT_COUNT: 3,
    COLOR_BRIGHTNESS_THRESHOLD: 125,

    IMG_PROXY: '',
    CONNECT_TIMEOUT_MS: 18_000,
    STALL_TIMEOUT_MS: 15_000,
    RECONNECT_DELAYS_MS: [
        1_500, 3_000, 6_000, 12_000, 20_000, 30_000
    ]
};

const PlayerState = Object.freeze({
    IDLE: 'IDLE',
    CONNECTING: 'CONNECTING',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    ERROR: 'ERROR'
});

const state = {
    player: PlayerState.IDLE,
    track: { duration: 0, elapsed: 0, syncedAt: 0 },
    history: [],
    streamLoaded: false,
    desiredPlaying: false,
    retryCount: 0,
    nowPlaying: null
};

const $ = id => document.getElementById(id);

const DOM = {
    playIcon: $('play-icon'),
    playText: $('play-text'),
    visualizer: $('visualizer'),
    mainArtwork: $('main-artwork'),
    masterBtn: $('master-play-btn'),
    metaLoader: $('metadata-loader'),
    trackName: $('track-name'),
    artistName: $('artist-name'),
    artBitrate: $('art-bitrate'),
    artFormat: $('art-format'),
    artYear: $('art-year'),
    progressShadow: $('progress-shadow'),
    progressText: $('progress-text'),
    lyricsToggle: $('btn-lyrics-toggle'),
    lyricsBody: $('lyrics-body'),
    historyList: $('history-list'),
    fullHistoryList: $('full-history-list'),
    historyPanel: $('history-panel'),
    lyricsPanel: $('lyrics-panel'),
    blurBg: $('blur-bg'),
    dynamicBg: $('dynamic-bg'),
    radioLogo: $('radio-logo'),
    logoContainer: $('radio-logo-container'),
    brandName: $('brand-name')
};

const audio = new Audio();
audio.preload = 'none';
audio.volume = CONFIG.DEFAULT_VOLUME;

let progressIntervalId = null;
let metadataIntervalId = null;
let metadataInFlight = false;
let watchdogTimer = null;
let reconnectTimer = null;
let playbackVersion = 0;
let connectedAt = 0;

// Seguimiento de la salud de la reproducción.
// Solo vigilamos el reloj si el navegador ha confirmado
// previamente que avanza.

let lastAudioTime = null;
let lastAudioAdvanceAt = Date.now();
let audioClockConfirmed = false;
let lastForegroundAt = Date.now();

const setText = (element, value) => {
    if (element) {
        element.textContent = String(value ?? '');
    }
};

const formatTime = seconds => {
    const whole = Math.max(
        0,
        Math.floor(Number(seconds) || 0)
    );

    return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
};

// ==================================================
// IMÁGENES Y PORTADAS
// ==================================================

function safeImageUrl(
    value,
    fallback = CONFIG.FALLBACK_ARTWORK
) {
    const source =
        typeof value === 'string' && value.trim()
            ? value.trim()
            : fallback;

    try {
        const url = new URL(source, document.baseURI);

        if (
            url.protocol !== 'https:' &&
            !(
                url.protocol === 'http:' &&
                location.protocol === 'http:'
            )
        ) {
            throw new Error('Protocolo de imagen no permitido');
        }

        return url.href;

    } catch {
        try {
            return new URL(fallback, document.baseURI).href;
        } catch {
            return '';
        }
    }
}

function artworkUrl(source, width, height) {
    const clean = safeImageUrl(source);

    if (!CONFIG.IMG_PROXY || !clean) {
        return clean;
    }

    const params = new URLSearchParams({
        url: clean,
        w: String(width),
        h: String(height),
        fit: 'cover',
        output: 'webp'
    });

    return `${CONFIG.IMG_PROXY}?${params.toString()}`;
}

function setImage(
    element,
    value,
    width = 600,
    height = 600
) {
    if (!element) return;

    const image = artworkUrl(value, width, height);
    const fallback = safeImageUrl(CONFIG.FALLBACK_ARTWORK);

    if (element.src === image) return;

    element.onerror = () => {
        element.onerror = null;

        if (image !== fallback) {
            element.src = fallback;
        }
    };

    element.src = image;
}

// ==================================================
// CONSULTAS A LA API
// ==================================================

async function fetchWithTimeout(
    url,
    timeoutMs = CONFIG.FETCH_TIMEOUT_MS
) {
    const controller = new AbortController();

    const timer = setTimeout(
        () => controller.abort(),
        timeoutMs
    );

    try {
        return await fetch(url, {
            signal: controller.signal,
            cache: 'no-store'
        });
    } finally {
        clearTimeout(timer);
    }
}

// ==================================================
// PROGRESO DE LA CANCIÓN
// ==================================================

function startProgressLoop() {
    stopProgressLoop();

    progressIntervalId = setInterval(
        updateProgress,
        CONFIG.PROGRESS_INTERVAL_MS
    );

    updateProgress();
}

function stopProgressLoop() {
    if (progressIntervalId !== null) {
        clearInterval(progressIntervalId);
    }

    progressIntervalId = null;
}

function updateProgress() {
    const { duration, elapsed, syncedAt } = state.track;

    if (!duration || duration <= 0) {
        if (DOM.progressShadow) {
            DOM.progressShadow.style.width = '0%';
        }

        setText(DOM.progressText, 'EN VIVO 24/7');
        return;
    }

    const current = Math.min(
        duration,
        Math.max(
            0,
            elapsed + (Date.now() - syncedAt) / 1000
        )
    );

    if (DOM.progressShadow) {
        DOM.progressShadow.style.width =
            `${(current / duration) * 100}%`;
    }

    setText(
        DOM.progressText,
        `${formatTime(current)} / ${formatTime(duration)}`
    );
}

// ==================================================
// HISTORIAL DE REPRODUCCIONES
// ==================================================

function buildHistoryItem(item, index, mode) {
    const wrap = document.createElement('div');
    const img = document.createElement('img');

    setImage(
        img,
        item.artwork,
        mode === 'compact' ? 80 : 180,
        mode === 'compact' ? 80 : 180
    );

    img.alt = item.song || 'Portada';
    img.loading = 'lazy';

    if (mode === 'compact') {
        wrap.className =
            'flex items-center gap-4 p-3 bg-white/5 border border-white/5 rounded-sm group hover:bg-white/10 transition-all';

        img.className =
            'w-10 h-10 object-cover rounded-sm border border-white/10';

        const inner = document.createElement('div');
        inner.className = 'min-w-0 flex-1';

        const song = document.createElement('span');
        song.className =
            'font-bold text-zinc-200 block truncate uppercase text-[12px]';

        setText(song, item.song);

        const artist = document.createElement('span');
        artist.className =
            'mono text-[10px] text-zinc-500 uppercase block truncate';

        setText(artist, item.artist);

        inner.append(song, artist);
        wrap.append(img, inner);

    } else {
        wrap.className =
            'flex gap-6 items-start border-b border-white/5 pb-8 group last:border-0';

        img.className =
            'w-20 h-20 object-cover border border-zinc-800 shrink-0';

        const num = document.createElement('div');
        num.className =
            'mono text-[12px] text-zinc-800 pt-1 shrink-0';

        setText(num, String(index).padStart(2, '0'));

        const info = document.createElement('div');
        info.className = 'min-w-0 flex-1';

        const time = document.createElement('p');
        time.className =
            'text-zinc-600 mono text-[10px] uppercase tracking-tighter mb-1';

        setText(time, item.relative_time);

        const title = document.createElement('h4');
        title.className =
            'font-bold text-base text-zinc-200 uppercase leading-tight line-clamp-3';

        setText(title, item.song);

        const artist = document.createElement('p');
        artist.className =
            'mono text-[11px] text-zinc-500 uppercase line-clamp-2 mt-1';

        setText(artist, item.artist);

        info.append(time, title, artist);
        wrap.append(num, img, info);
    }

    return wrap;
}

function renderCompactHistory() {
    if (!DOM.historyList) return;

    DOM.historyList.replaceChildren(
        ...state.history
            .slice(0, CONFIG.HISTORY_COMPACT_COUNT)
            .map((x, i) => buildHistoryItem(x, i + 1, 'compact'))
    );
}

function renderFullHistory() {
    if (!DOM.fullHistoryList) return;

    DOM.fullHistoryList.replaceChildren(
        ...state.history.map(
            (x, i) => buildHistoryItem(x, i + 1, 'full')
        )
    );
}

function historyTime(unixSeconds) {
    if (
        !Number.isFinite(Number(unixSeconds)) ||
        Number(unixSeconds) <= 0
    ) {
        return 'RECIENTE';
    }

    return new Date(
        Number(unixSeconds) * 1000
    ).toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ==================================================
// ADAPTADOR AZURACAST
// ==================================================

function normalizeAzuraCast(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Respuesta de API no válida');
    }

    const now = payload.now_playing || {};
    const song = now.song || {};

    const isLive = payload.live?.is_live === true;
    const liveName = payload.live?.streamer_name;

    const fallbackTitle = CONFIG.FALLBACK_TRACK;

    const title =
        isLive && liveName
            ? `EN VIVO: ${liveName}`
            : (song.title || song.text || fallbackTitle);

    const artist = isLive
        ? (liveName || 'CULTO EN DIRECTO')
        : (song.artist || CONFIG.FALLBACK_ARTIST);

    const duration = Number(now.duration);
    const elapsed = Number(now.elapsed);

    return {
        song: String(title),
        artist: String(artist),
        artwork: song.art || CONFIG.FALLBACK_ARTWORK,

        bitrate: CONFIG.FALLBACK_BITRATE,
        format: CONFIG.FALLBACK_FORMAT,
        year: '----',

        duration:
            Number.isFinite(duration) && duration > 0
                ? duration
                : 0,

        elapsed:
            Number.isFinite(elapsed) && elapsed >= 0
                ? elapsed
                : 0,

        history: Array.isArray(payload.song_history)
            ? payload.song_history.map(entry => ({
                song: String(
                    entry?.song?.title ||
                    entry?.song?.text ||
                    'Sin título'
                ),
                artist: String(
                    entry?.song?.artist ||
                    CONFIG.FALLBACK_ARTIST
                ),
                artwork:
                    entry?.song?.art ||
                    CONFIG.FALLBACK_ARTWORK,

                relative_time: historyTime(entry?.played_at)
            }))
            : []
    };
}

async function fetchMetadata() {
    if (metadataInFlight) return;

    metadataInFlight = true;
    DOM.metaLoader?.classList.remove('hidden');

    try {
        const response = await fetchWithTimeout(CONFIG.API_URL);

        if (!response.ok) {
            throw new Error(`API HTTP ${response.status}`);
        }

        const data = normalizeAzuraCast(
            await response.json()
        );

        state.nowPlaying = {
            title: data.song,
            artist: data.artist,
            artwork: data.artwork
        };

        setText(DOM.trackName, data.song);
        setText(DOM.artistName, data.artist);
        setText(DOM.artBitrate, `${data.bitrate}K`);
        setText(DOM.artFormat, data.format);
        setText(DOM.artYear, data.year);

        setImage(DOM.mainArtwork, data.artwork);

        if (DOM.dynamicBg) {
            DOM.dynamicBg.style.backgroundImage =
                `url("${artworkUrl(data.artwork, 600, 600)}")`;
        }

        state.track = {
            duration: data.duration,
            elapsed: data.elapsed,
            syncedAt: Date.now()
        };

        startProgressLoop();

        DOM.lyricsToggle?.classList.add('hidden');

        state.history = data.history;

        renderCompactHistory();
        updateMediaSession();

    } catch (error) {
        // Una falla en la API nunca debe detener el audio.
        console.warn(
            '[Radio] No se pudo actualizar la información:',
            error
        );

        if (!state.nowPlaying) {
            setText(DOM.trackName, CONFIG.FALLBACK_TRACK);
            setText(DOM.artistName, CONFIG.FALLBACK_ARTIST);
            setText(DOM.artBitrate, `${CONFIG.FALLBACK_BITRATE}K`);
            setText(DOM.artFormat, CONFIG.FALLBACK_FORMAT);
            setText(DOM.artYear, '----');
        }

    } finally {
        metadataInFlight = false;
        DOM.metaLoader?.classList.add('hidden');
    }
}

// ==================================================
// ESTADOS DEL REPRODUCTOR
// ==================================================

function setPlayerState(next) {
    state.player = next;

    const playing = next === PlayerState.PLAYING;

    if (DOM.playIcon) {
        DOM.playIcon.innerHTML = playing
            ? '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'
            : '<path d="M8 5v14l11-7z"/>';
    }

    const label = playing
        ? CONFIG.LABEL_STOP
        : next === PlayerState.CONNECTING
            ? (
                state.retryCount > 0
                    ? 'RECONECTANDO...'
                    : 'CONECTANDO...'
            )
            : CONFIG.LABEL_PLAY;

    setText(DOM.playText, label);

    DOM.visualizer?.classList.toggle('playing', playing);

    DOM.masterBtn?.setAttribute(
        'aria-label',
        playing ? 'Detener radio' : label
    );

    if ('mediaSession' in navigator) {
        try {
            navigator.mediaSession.playbackState =
                playing ? 'playing' : 'paused';
        } catch {
            // Navegador sin soporte.
        }
    }
}

// ==================================================
// CONTROLES MULTIMEDIA DEL CELULAR
// ==================================================

function updateMediaSession() {
    if (
        !('mediaSession' in navigator) ||
        typeof MediaMetadata === 'undefined'
    ) {
        return;
    }

    try {
        const item = state.nowPlaying || {};

        navigator.mediaSession.metadata = new MediaMetadata({
            title: item.title || CONFIG.STATION_NAME,
            artist: item.artist || CONFIG.FALLBACK_ARTIST,
            album: 'Radio La Voz del Encuentro',
            artwork: [{
                src: safeImageUrl(
                    item.artwork || CONFIG.FALLBACK_ARTWORK
                ),
                sizes: '512x512'
            }]
        });

    } catch (error) {
        console.debug(
            '[Radio] Media Session no disponible:',
            error
        );
    }
}

function installMediaSession() {
    if (!('mediaSession' in navigator)) return;

    for (const [action, callback] of [
        [
            'play',
            () => {
                if (!state.desiredPlaying) {
                    startPlayback();
                } else if (
                    audio.paused ||
                    state.player !== PlayerState.PLAYING
                ) {
                    connectToLive();
                }
            }
        ],
        ['pause', () => stopPlayback()],
        ['stop', () => stopPlayback()]
    ]) {
        try {
            navigator.mediaSession.setActionHandler(
                action,
                callback
            );
        } catch {
            // Acción no disponible.
        }
    }
}

// ==================================================
// TEMPORIZADORES DE RECUPERACIÓN
// ==================================================

function clearWatchdog() {
    if (watchdogTimer !== null) {
        clearTimeout(watchdogTimer);
    }

    watchdogTimer = null;
}

function clearReconnect() {
    if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
    }

    reconnectTimer = null;
}

function armWatchdog(timeout, reason) {
    clearWatchdog();

    if (!state.desiredPlaying) return;

    const version = playbackVersion;

    watchdogTimer = setTimeout(() => {
        if (
            state.desiredPlaying &&
            version === playbackVersion &&
            reconnectTimer === null
        ) {
            scheduleReconnect(reason);
        }
    }, timeout);
}

// ==================================================
// CONTROL DE AUDIO EN DIRECTO
// ==================================================

function releaseAudio() {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();

    state.streamLoaded = false;
}

function scheduleReconnect(reason) {
    if (
        !state.desiredPlaying ||
        reconnectTimer !== null
    ) {
        return;
    }

    if (
        connectedAt &&
        Date.now() - connectedAt > 30_000
    ) {
        state.retryCount = 0;
    }

    clearWatchdog();
    playbackVersion += 1;

    // Marcar CONNECTING antes de liberar el audio.
    // Así evitamos detectar nuestra propia pausa
    // como una interrupción inesperada.

    setPlayerState(PlayerState.CONNECTING);
    releaseAudio();

    const delayList = CONFIG.RECONNECT_DELAYS_MS;

    const wait = delayList[
        Math.min(
            state.retryCount,
            delayList.length - 1
        )
    ];

    state.retryCount += 1;

    console.warn(
        `[Radio] ${reason}. Próximo intento en ${wait / 1000}s (${state.retryCount}).`
    );

    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;

        if (state.desiredPlaying) {
            connectToLive();
        }
    }, wait);
}

function connectToLive() {
    if (!state.desiredPlaying) return;

    clearReconnect();
    clearWatchdog();

    const version = ++playbackVersion;

    setPlayerState(PlayerState.CONNECTING);
    releaseAudio();

    // Reiniciar supervisión para la conexión nueva.
    lastAudioTime = null;
    audioClockConfirmed = false;
    lastAudioAdvanceAt = Date.now();

    // Utilizamos únicamente el MP3 de 64 kbps.
    audio.src = CONFIG.STREAM_URL;
    state.streamLoaded = true;
    audio.preload = 'none';

    armWatchdog(
        CONFIG.CONNECT_TIMEOUT_MS,
        'La conexión tardó demasiado'
    );

    try {
        const result = audio.play();

        if (
            result &&
            typeof result.catch === 'function'
        ) {
            result.catch(error => {
                if (
                    !state.desiredPlaying ||
                    version !== playbackVersion
                ) {
                    return;
                }

                if (error?.name === 'NotAllowedError') {
                    console.warn(
                        '[Radio] Se requiere interacción del usuario para reproducir.'
                    );

                    stopPlayback();
                    return;
                }

                if (error?.name === 'AbortError') {
                    return;
                }

                scheduleReconnect(
                    `No se pudo reproducir: ${error?.message || 'error desconocido'}`
                );
            });
        }

    } catch (error) {
        if (version === playbackVersion) {
            scheduleReconnect(
                `Fallo al iniciar: ${error.message}`
            );
        }
    }
}

function startPlayback() {
    if (state.desiredPlaying) return;

    state.desiredPlaying = true;
    state.retryCount = 0;
    connectedAt = 0;

    connectToLive();
}

function stopPlayback() {
    // Cancelar intención de reproducir ANTES
    // de llamar a audio.pause().
    state.desiredPlaying = false;
    playbackVersion += 1;

    state.retryCount = 0;
    connectedAt = 0;

    clearReconnect();
    clearWatchdog();

    releaseAudio();
    setPlayerState(PlayerState.PAUSED);
}

function togglePlayback() {
    if (state.desiredPlaying) {
        stopPlayback();
    } else {
        startPlayback();
    }
}

// ==================================================
// EVENTOS DE AUDIO
// ==================================================

audio.addEventListener('playing', () => {
    if (!state.desiredPlaying) return;

    clearWatchdog();

    connectedAt = Date.now();

    lastAudioTime = null;
    audioClockConfirmed = false;
    lastAudioAdvanceAt = Date.now();

    setPlayerState(PlayerState.PLAYING);
    updateMediaSession();
});

audio.addEventListener('waiting', () => {
    if (
        state.desiredPlaying &&
        reconnectTimer === null
    ) {
        armWatchdog(
            CONFIG.STALL_TIMEOUT_MS,
            'La señal dejó de entregar audio'
        );
    }
});

audio.addEventListener('stalled', () => {
    if (
        state.desiredPlaying &&
        reconnectTimer === null
    ) {
        armWatchdog(
            CONFIG.STALL_TIMEOUT_MS,
            'La red dejó de enviar datos'
        );
    }
});

audio.addEventListener('timeupdate', () => {
    if (
        !state.desiredPlaying ||
        state.player !== PlayerState.PLAYING
    ) {
        return;
    }

    const now = audio.currentTime;

    if (!Number.isFinite(now)) return;

    // Algunos streams en directo no ofrecen
    // un reloj fiable. Solo lo vigilaremos
    // cuando hayamos detectado avance real.

    if (
        lastAudioTime !== null &&
        Math.abs(now - lastAudioTime) > 0.15
    ) {
        lastAudioAdvanceAt = Date.now();
        audioClockConfirmed = true;

        if (watchdogTimer !== null) {
            clearWatchdog();
        }
    }

    lastAudioTime = now;
});

audio.addEventListener('error', () => {
    if (state.desiredPlaying) {
        scheduleReconnect(
            `Error de audio (${audio.error?.code || 'desconocido'})`
        );
    }
});

audio.addEventListener('ended', () => {
    if (state.desiredPlaying) {
        scheduleReconnect(
            'El servidor cerró el audio'
        );
    }
});

// ==================================================
// DETECCIÓN DE PAUSAS INESPERADAS
// ==================================================

audio.addEventListener('pause', () => {
    // No reconectamos si el oyente pulsó DETENER.
    // Tampoco reconectamos durante una limpieza
    // o reconexión que nosotros iniciamos.

    if (
        state.desiredPlaying &&
        state.player === PlayerState.PLAYING &&
        audio.paused &&
        reconnectTimer === null
    ) {
        scheduleReconnect(
            'El navegador pausó la señal inesperadamente'
        );
    }
});

// ==================================================
// VIGILANCIA DE REPRODUCCIÓN 24/7
// ==================================================

// Los navegadores pueden limitar la ejecución
// de temporizadores en segundo plano.
// Por ello, también revisamos la reproducción
// cuando el usuario vuelve a la pestaña.

setInterval(() => {
    if (
        !state.desiredPlaying ||
        state.player !== PlayerState.PLAYING ||
        reconnectTimer !== null
    ) {
        return;
    }

    // Si el elemento audio dejó de reproducir.
    if (
        audio.paused ||
        audio.ended ||
        audio.error
    ) {
        scheduleReconnect(
            'Se detectó una reproducción detenida'
        );

        return;
    }

    // Detectar un reloj congelado.
    // Solo se activa si anteriormente avanzaba
    // y la pestaña está visible.

    if (
        document.visibilityState === 'visible' &&
        audioClockConfirmed &&
        Date.now() - Math.max(
            lastAudioAdvanceAt,
            lastForegroundAt
        ) > 45_000
    ) {
        scheduleReconnect(
            'La reproducción dejó de avanzar'
        );
    }

}, 5_000);

// ==================================================
// RECUPERACIÓN AL REGRESAR A LA PESTAÑA
// ==================================================

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') {
        return;
    }

    lastForegroundAt = Date.now();
    lastAudioAdvanceAt = Date.now();

    if (
        state.desiredPlaying &&
        state.player === PlayerState.PLAYING &&
        audio.paused &&
        reconnectTimer === null
    ) {
        scheduleReconnect(
            'Recuperando el audio al regresar a la pestaña'
        );
    }
});

// ==================================================
// EVENTOS DE CONECTIVIDAD
// ==================================================

window.addEventListener('online', () => {
    if (
        state.desiredPlaying &&
        state.player !== PlayerState.PLAYING
    ) {
        connectToLive();
    }
});

window.addEventListener('pagehide', () => {
    stopPlayback();
});

// ==================================================
// PANELES DEL REPRODUCTOR
// ==================================================

function openPanel(panel) {
    if (!panel) return;

    panel.classList.add('open');
    DOM.blurBg?.classList.add('open');
}

function openHistory() {
    renderFullHistory();
    openPanel(DOM.historyPanel);
}

function openLyrics() {
    openPanel(DOM.lyricsPanel);
}

function closeAllPanels() {
    DOM.historyPanel?.classList.remove('open');
    DOM.lyricsPanel?.classList.remove('open');
    DOM.blurBg?.classList.remove('open');
}

// ==================================================
// PERSONALIZACIÓN VISUAL
// ==================================================

function applyLogo() {
    if (!DOM.radioLogo || !DOM.logoContainer) {
        return;
    }

    if (CONFIG.STATION_LOGO) {
        DOM.radioLogo.src = safeImageUrl(
            CONFIG.STATION_LOGO,
            CONFIG.FALLBACK_ARTWORK
        );

        DOM.logoContainer.classList.remove('hidden');
    } else {
        DOM.logoContainer.classList.add('hidden');
    }
}

function applyBrand() {
    setText(DOM.brandName, CONFIG.BRAND_NAME);
}

function applyColors() {
    document.documentElement.style.setProperty(
        '--primary',
        CONFIG.PRIMARY_COLOR
    );

    document.documentElement.style.setProperty(
        '--accent',
        CONFIG.ACCENT_COLOR
    );

    if (DOM.masterBtn?.parentElement) {
        DOM.masterBtn.parentElement.style.backgroundColor =
            CONFIG.PRIMARY_COLOR;
    }

    if (DOM.progressShadow) {
        DOM.progressShadow.style.backgroundColor =
            CONFIG.ACCENT_COLOR;
    }

    if (DOM.masterBtn) {
        DOM.masterBtn.style.color = '#0b192c';
    }
}

function applyStationName() {
    setText(
        $('main-station-name'),
        CONFIG.STATION_NAME
    );

    setText(
        $('main-station-name-mobile'),
        CONFIG.STATION_NAME
    );
}

// ==================================================
// INICIALIZACIÓN
// ==================================================

function initRadioPlayer() {
    applyLogo();
    applyBrand();
    applyColors();
    applyStationName();

    setImage(
        DOM.mainArtwork,
        CONFIG.FALLBACK_ARTWORK
    );

    setPlayerState(PlayerState.IDLE);
    updateProgress();
    installMediaSession();

    fetchMetadata();

    metadataIntervalId = setInterval(
        fetchMetadata,
        CONFIG.META_INTERVAL_MS
    );
}

if (document.readyState === 'complete') {
    initRadioPlayer();
} else {
    window.addEventListener(
        'load',
        initRadioPlayer,
        { once: true }
    );
}

// ==================================================
// FUNCIONES DEL HTML ORIGINAL
// ==================================================

window.togglePlayback = togglePlayback;
window.openHistory = openHistory;
window.openLyrics = openLyrics;
window.closeAllPanels = closeAllPanels;

// ==================================================
// API DE PERSONALIZACIÓN
// ==================================================

window.RadioPlayer = {
    configure: changes => {
        if (
            !changes ||
            typeof changes !== 'object'
        ) {
            return;
        }

        const streamChanged =
            typeof changes.STREAM_URL === 'string' &&
            changes.STREAM_URL !== CONFIG.STREAM_URL;

        const apiChanged =
            typeof changes.API_URL === 'string' &&
            changes.API_URL !== CONFIG.API_URL;

        Object.assign(CONFIG, changes);

        applyStationName();
        applyBrand();
        applyLogo();
        applyColors();

        audio.volume = Math.max(
            0,
            Math.min(
                1,
                Number(CONFIG.DEFAULT_VOLUME) || 0
            )
        );

        setPlayerState(state.player);

        if (
            streamChanged &&
            state.desiredPlaying
        ) {
            connectToLive();
        }

        if (apiChanged) {
            fetchMetadata();
        }
    },

    getState: () => ({
        ...state,
        track: { ...state.track },
        history: [...state.history]
    }),

    getAudio: () => audio,

    play: startPlayback,
    stop: stopPlayback,
    refreshMetadata: fetchMetadata
};
