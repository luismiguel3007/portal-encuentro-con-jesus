// js/app.js
// Lógica Frontend para el Portal Web de la Asociación Cristiana Un Encuentro con Jesús

// Instancia global de Supabase
const supabaseClient = window.db || (typeof db !== 'undefined' ? db : null);

/* ==========================================================================
   INICIALIZACIÓN PRINCIPAL
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // Inicialización de componentes comunes
  initNavigation();
  initRadioAudio();
  initPdfWorker();

  // Detección y carga de vistas específicas
  if (document.getElementById('articlesGrid')) {
    loadArticles();
  }
  if (document.getElementById('carouselTrack')) {
    loadTeamCarousel();
  }
  if (document.getElementById('revistasGrid')) {
    loadRevistas();
  }
  if (document.getElementById('sedesGrid')) {
    loadSedes();
  }

  // Inicializar modales
  initArticleModal();
  initMagazineModal();

  // Sistema de edición visual en vivo y carga de ajustes dinámicos
  loadAjustes();
  setupVisualEditor();
});

/* ==========================================================================
   1. CONTROL DE NAVEGACIÓN Y MENÚ OFF-CANVAS
   ========================================================================== */
function initNavigation() {
  const menuToggle = document.getElementById('menuToggle');
  const sidebarClose = document.getElementById('sidebarClose');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const sidebarMenu = document.getElementById('sidebarMenu');

  if (!menuToggle || !sidebarMenu) return;

  function openSidebar() {
    sidebarMenu.classList.add('open');
    if (sidebarOverlay) sidebarOverlay.classList.add('open');
    menuToggle.classList.add('active');
    menuToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebarMenu.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('open');
    menuToggle.classList.remove('active');
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  menuToggle.addEventListener('click', () => {
    const isOpen = sidebarMenu.classList.contains('open');
    if (isOpen) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  if (sidebarClose) {
    sidebarClose.addEventListener('click', closeSidebar);
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
  }

  const sidebarLinks = sidebarMenu.querySelectorAll('a');
  sidebarLinks.forEach(link => {
    link.addEventListener('click', closeSidebar);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebarMenu.classList.contains('open')) {
      closeSidebar();
    }
  });
}

/* ==========================================================================
   2. REPRODUCTOR DE RADIO CONTINUA CON ANIMACIÓN DE SEÑAL
   ========================================================================== */
function initRadioAudio() {
  const audioRadio = document.getElementById('audioRadio');
  const radioCard = document.getElementById('radioCard');

  if (!audioRadio || !radioCard) return;

  audioRadio.addEventListener('play', () => {
    radioCard.classList.add('playing');
  });

  audioRadio.addEventListener('pause', () => {
    radioCard.classList.remove('playing');
  });

  audioRadio.addEventListener('ended', () => {
    radioCard.classList.remove('playing');
  });

  audioRadio.addEventListener('error', () => {
    radioCard.classList.remove('playing');
    console.warn('Transmisión de radio temporalmente no disponible o reconectando.');
  });
}

/* ==========================================================================
   3. FORMATEO DE FECHAS EN ESPAÑOL
   ========================================================================== */
function formatDateSpanish(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  } catch (err) {
    return dateString;
  }
}

/* ==========================================================================
   4. CARGA DE ARTÍCULOS Y DEVOCIONALES (index.html)
   ========================================================================== */
let globalArticles = [];

async function loadArticles() {
  const container = document.getElementById('articlesGrid');
  if (!container) return;

  if (!supabaseClient) {
    container.innerHTML = `
      <div class="empty-message" style="grid-column: 1 / -1;">
        No se pudo establecer conexión con la base de datos.
      </div>`;
    return;
  }

  try {
    const { data: articulos, error } = await supabaseClient
      .from('articulos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo artículos:', error);
      container.innerHTML = `
        <div class="empty-message" style="grid-column: 1 / -1;">
          Error al cargar los artículos. Por favor intenta nuevamente más tarde.
        </div>`;
      return;
    }

    if (!articulos || articulos.length === 0) {
      container.innerHTML = `
        <div class="empty-message" style="grid-column: 1 / -1;">
          Aún no se han publicado artículos ni devocionales.
        </div>`;
      return;
    }

    globalArticles = articulos;
    container.innerHTML = '';

    articulos.forEach((articulo, index) => {
      const fallbackImg = 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=800&q=80';
      const imgSrc = articulo.imagen_url || fallbackImg;
      const formattedDate = formatDateSpanish(articulo.created_at);

      const card = document.createElement('article');
      card.className = 'article-card';
      card.innerHTML = `
        <div class="article-image-wrap">
          <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(articulo.titulo)}" loading="lazy" onerror="this.src='${fallbackImg}'">
          <span class="article-badge-category">${escapeHtml(articulo.categoria || 'Devocional')}</span>
        </div>
        <div class="article-body">
          <div class="article-meta">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>${formattedDate}</span>
          </div>
          <h3 class="article-title">${escapeHtml(articulo.titulo)}</h3>
          <p class="article-summary">${escapeHtml(articulo.resumen || '')}</p>
          <button class="article-btn-read" data-index="${index}">
            Leer artículo completo &rarr;
          </button>
        </div>
      `;

      const readBtn = card.querySelector('.article-btn-read');
      readBtn.addEventListener('click', () => openArticleModal(index));

      container.appendChild(card);
    });
  } catch (err) {
    console.error('Error general cargando artículos:', err);
    container.innerHTML = `
      <div class="empty-message" style="grid-column: 1 / -1;">
        Ocurrió un error inesperado al conectar con el servidor.
      </div>`;
  }
}

/* ==========================================================================
   5. MODAL DE LECTURA COMPLETA DE ARTÍCULOS
   ========================================================================== */
function initArticleModal() {
  const modal = document.getElementById('articleModal');
  const closeBtn = document.getElementById('closeModalBtn');

  if (!modal || !closeBtn) return;

  closeBtn.addEventListener('click', closeArticleModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeArticleModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeArticleModal();
    }
  });
}

function openArticleModal(articleIndex) {
  const modal = document.getElementById('articleModal');
  const articulo = globalArticles[articleIndex];
  if (!modal || !articulo) return;

  const fallbackImg = 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=800&q=80';

  document.getElementById('modalArticleImg').src = articulo.imagen_url || fallbackImg;
  document.getElementById('modalArticleCategory').textContent = articulo.categoria || 'Devocional';
  document.getElementById('modalArticleTitle').textContent = articulo.titulo || '';
  document.getElementById('modalArticleDate').textContent = formatDateSpanish(articulo.created_at);
  document.getElementById('modalArticleContent').textContent = articulo.contenido || articulo.resumen || '';

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeArticleModal() {
  const modal = document.getElementById('articleModal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/* ==========================================================================
   6. CARRUSEL DE LIDERAZGO ("CUERPO PASTORAL & LIDERAZGO")
   ========================================================================== */
let leadersData = [];
let currentCarouselIndex = 0;
let carouselAutoplayTimer = null;

async function loadTeamCarousel() {
  const track = document.getElementById('carouselTrack');
  const dotsContainer = document.getElementById('carouselDots');
  const prevBtn = document.getElementById('carouselPrev');
  const nextBtn = document.getElementById('carouselNext');
  const container = document.getElementById('carouselContainer');

  if (!track || !dotsContainer) return;

  try {
    let leaders = [];

    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('lideres')
        .select('*')
        .order('orden', { ascending: true });

      if (!error && data && data.length > 0) {
        leaders = data;
      }
    }

    // Si aún no hay líderes registrados en la base de datos
    if (leaders.length === 0) {
      track.innerHTML = '<p style="text-align:center; color:#64748b; padding:2rem; width:100%;">Próximamente se presentará al cuerpo pastoral.</p>';
      dotsContainer.innerHTML = '';
      return;
    }

    leadersData = leaders;
    track.innerHTML = '';
    dotsContainer.innerHTML = '';

    // Renderizar tarjetas en la pista
    leadersData.forEach((leader, idx) => {
      const card = document.createElement('div');
      card.className = 'carousel-card';
      card.setAttribute('data-index', idx);
      card.setAttribute('data-name', leader.nombre);
      card.setAttribute('data-role', leader.cargo);

      const fallbackPortrait = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80';
      const fotoSrc = leader.foto_url || fallbackPortrait;

      card.innerHTML = `
        <img src="${escapeHtml(fotoSrc)}" alt="${escapeHtml(leader.nombre)}" loading="lazy" onerror="this.src='${fallbackPortrait}'">
        <div class="carousel-card-overlay">
          <div class="carousel-card-name">${escapeHtml(leader.nombre)}</div>
          <div class="carousel-card-role">${escapeHtml(leader.cargo)}</div>
        </div>
      `;

      card.addEventListener('click', () => {
        setCarouselActive(idx);
      });

      track.appendChild(card);

      // Renderizar punto/indicador
      const dot = document.createElement('button');
      dot.className = `carousel-dot ${idx === 0 ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Ver a ${leader.nombre}`);
      dot.addEventListener('click', () => {
        setCarouselActive(idx);
      });
      dotsContainer.appendChild(dot);
    });

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        navigateCarousel(-1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        navigateCarousel(1);
      });
    }

    // Navegación por teclado cuando la sección es visible
    document.addEventListener('keydown', (e) => {
      const leadershipSection = document.getElementById('liderazgo');
      if (!leadershipSection) return;
      const rect = leadershipSection.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom >= 0;
      if (!inView) return;

      if (e.key === 'ArrowLeft') {
        navigateCarousel(-1);
      } else if (e.key === 'ArrowRight') {
        navigateCarousel(1);
      }
    });

    // Soporte táctil móvil (Swipe)
    let touchStartX = 0;
    let touchEndX = 0;

    if (container) {
      container.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        stopAutoplay();
      }, { passive: true });

      container.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
        startAutoplay();
      }, { passive: true });

      container.addEventListener('mouseenter', stopAutoplay);
      container.addEventListener('mouseleave', startAutoplay);
    }

    function handleSwipe() {
      const threshold = 40;
      if (touchEndX < touchStartX - threshold) {
        navigateCarousel(1);
      } else if (touchEndX > touchStartX + threshold) {
        navigateCarousel(-1);
      }
    }

    currentCarouselIndex = 0;
    updateCarouselVisuals();
    startAutoplay();

  } catch (err) {
    console.error('Error inicializando el carrusel de pastores:', err);
    track.innerHTML = `
      <div class="empty-message">
        No se pudo cargar el cuerpo pastoral en este momento.
      </div>`;
  }
}

function navigateCarousel(direction) {
  if (leadersData.length === 0) return;
  currentCarouselIndex = (currentCarouselIndex + direction + leadersData.length) % leadersData.length;
  updateCarouselVisuals();
}

function setCarouselActive(index) {
  if (index < 0 || index >= leadersData.length) return;
  currentCarouselIndex = index;
  updateCarouselVisuals();
}

function updateCarouselVisuals() {
  const cards = document.querySelectorAll('.carousel-card');
  const dots = document.querySelectorAll('.carousel-dot');
  const nameDisplay = document.getElementById('activeMemberName');
  const roleDisplay = document.getElementById('activeMemberRole');
  const infoBox = document.getElementById('activeMemberContainer');

  if (cards.length === 0) return;

  const total = cards.length;

  cards.forEach((card, i) => {
    let diff = (i - currentCarouselIndex) % total;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;

    card.classList.remove('active', 'prev-card', 'next-card', 'far-prev', 'far-next', 'hidden');

    if (diff === 0) {
      card.classList.add('active');
    } else if (diff === -1) {
      card.classList.add('prev-card');
    } else if (diff === 1) {
      card.classList.add('next-card');
    } else if (diff === -2) {
      card.classList.add('far-prev');
    } else if (diff === 2) {
      card.classList.add('far-next');
    } else {
      card.classList.add('hidden');
    }
  });

  dots.forEach((dot, idx) => {
    dot.classList.toggle('active', idx === currentCarouselIndex);
  });

  const activeLeader = leadersData[currentCarouselIndex];
  if (activeLeader && nameDisplay && roleDisplay && infoBox) {
    infoBox.style.opacity = '0.3';
    setTimeout(() => {
      nameDisplay.textContent = activeLeader.nombre;
      roleDisplay.textContent = activeLeader.cargo;
      infoBox.style.opacity = '1';
    }, 150);
  }
}

function startAutoplay() {
  stopAutoplay();
  carouselAutoplayTimer = setInterval(() => {
    navigateCarousel(1);
  }, 5000);
}

function stopAutoplay() {
  if (carouselAutoplayTimer) {
    clearInterval(carouselAutoplayTimer);
    carouselAutoplayTimer = null;
  }
}

/* ==========================================================================
   7. CATÁLOGO DE REVISTAS Y VISOR DE DOBLE PÁGINA CON ANIMACIÓN 3D
   ========================================================================== */
let pdfDoc = null;
let currentSpreadIndex = 1; // Página izquierda actual
let isRendering = false;

function initPdfWorker() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
}

async function loadRevistas() {
  const container = document.getElementById('revistasGrid');
  if (!container) return;

  if (!supabaseClient) {
    container.innerHTML = `<div class="empty-message" style="grid-column: 1 / -1;">No se pudo conectar a la base de datos.</div>`;
    return;
  }

  try {
    const { data: revistas, error } = await supabaseClient
      .from('revistas')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) throw error;
    if (!revistas || revistas.length === 0) {
      container.innerHTML = `<div class="empty-message" style="grid-column: 1 / -1;">No hay revistas publicadas aún.</div>`;
      return;
    }

    container.innerHTML = revistas.map(rev => {
      const fallbackCover = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=700&q=80';
      const portadaSrc = rev.portada_url || fallbackCover;
      const formattedDate = formatDateSpanish(rev.fecha || rev.created_at);

      return `
        <div class="revista-card">
          <div class="revista-cover">
            <img src="${escapeHtml(portadaSrc)}" alt="${escapeHtml(rev.edicion)}" loading="lazy">
          </div>
          <div class="revista-content">
            <h3 class="revista-edition">${escapeHtml(rev.edicion)}</h3>
            <div class="revista-date">📅 Publicado: ${formattedDate}</div>
            <div class="revista-actions">
              <button type="button" class="btn-revista-read btn-open-pdf-viewer" data-url="${escapeHtml(rev.pdf_url || '')}" data-title="${escapeHtml(rev.edicion)}">
                📖 Leer en Línea
              </button>
              <a href="${escapeHtml(rev.pdf_url || '#')}" download target="_blank" rel="noopener noreferrer" class="btn-revista-download">
                📥 PDF
              </a>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-open-pdf-viewer').forEach(btn => {
      btn.addEventListener('click', () => {
        abrirVisorRevista(btn.dataset.url, btn.dataset.title);
      });
    });

  } catch (err) {
    console.error('Error cargando revistas:', err);
  }
}

function initMagazineModal() {
  const modal = document.getElementById('magazineModal');
  const btnClose = document.getElementById('closeMagazineBtn');
  const btnPrev = document.getElementById('magBtnPrev');
  const btnNext = document.getElementById('magBtnNext');
  const btnFullscreen = document.getElementById('btnToggleFullscreen');

  if (btnPrev) btnPrev.addEventListener('click', () => cambiarPagina(-2));
  if (btnNext) btnNext.addEventListener('click', () => cambiarPagina(2));

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      modal.style.display = 'none';
      pdfDoc = null;
    });
  }

  // Soporte de Pantalla Completa
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
      const viewer = document.getElementById('magazineViewerBox');
      if (!document.fullscreenElement) {
        if (viewer.requestFullscreen) viewer.requestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    });

    document.addEventListener('fullscreenchange', () => {
      const fsText = document.getElementById('fsText');
      if (fsText) {
        fsText.textContent = document.fullscreenElement ? 'Salir Pantalla' : 'Pantalla Completa';
      }
      // Re-renderizar para ajustar la resolución de la pantalla completa
      renderSpread();
    });
  }

  // Navegación por teclado (← / → / Esc)
  window.addEventListener('keydown', (e) => {
    if (modal && modal.style.display === 'flex') {
      if (e.key === 'ArrowLeft') cambiarPagina(-2);
      if (e.key === 'ArrowRight') cambiarPagina(2);
      if (e.key === 'Escape' && !document.fullscreenElement) btnClose.click();
    }
  });
}

function abrirVisorRevista(pdfUrl, titulo) {
  const modal = document.getElementById('magazineModal');
  const titleEl = document.getElementById('magViewerTitle');
  const downloadLink = document.getElementById('magDownloadDirect');

  if (!modal || !window.pdfjsLib) {
    if (pdfUrl) window.open(pdfUrl, '_blank');
    return;
  }

  modal.style.display = 'flex';
  if (titleEl) titleEl.textContent = titulo;
  if (downloadLink) downloadLink.href = pdfUrl;

  currentSpreadIndex = 1;

  window.pdfjsLib.getDocument(pdfUrl).promise.then(pdf => {
    pdfDoc = pdf;
    renderSpread();
  }).catch(err => {
    alert('No se pudo abrir la revista: ' + err.message);
    modal.style.display = 'none';
  });
}

async function renderSpread() {
  if (!pdfDoc || isRendering) return;
  isRendering = true;

  const canvasLeft = document.getElementById('canvasLeft');
  const canvasRight = document.getElementById('canvasRight');
  const counter = document.getElementById('magPageCounter');
  const btnPrev = document.getElementById('magBtnPrev');
  const btnNext = document.getElementById('magBtnNext');
  const spine = document.querySelector('.book-spine');

  const totalPages = pdfDoc.numPages;

  // Si estamos en la página 1 (Portada solitaria)
  if (currentSpreadIndex === 1) {
    canvasLeft.style.display = 'none';
    if (spine) spine.style.display = 'none';
    await renderSingleCanvas(currentSpreadIndex, canvasRight);
    if (counter) counter.textContent = `Portada (1 / ${totalPages})`;
  } else {
    // Modo pliego doble abierto
    canvasLeft.style.display = 'block';
    if (spine) spine.style.display = 'block';

    const pageL = currentSpreadIndex;
    const pageR = currentSpreadIndex + 1;

    await renderSingleCanvas(pageL, canvasLeft);

    if (pageR <= totalPages) {
      canvasRight.style.display = 'block';
      await renderSingleCanvas(pageR, canvasRight);
      if (counter) counter.textContent = `${pageL}-${pageR} / ${totalPages}`;
    } else {
      // Última página sola (contraportada)
      canvasRight.style.display = 'none';
      if (counter) counter.textContent = `${pageL} / ${totalPages}`;
    }
  }

  if (btnPrev) btnPrev.disabled = (currentSpreadIndex <= 1);
  if (btnNext) btnNext.disabled = (currentSpreadIndex + 1 >= totalPages);

  isRendering = false;
}

async function renderSingleCanvas(pageNumber, canvas) {
  try {
    const page = await pdfDoc.getPage(pageNumber);
    const ctx = canvas.getContext('2d');
    
    // Altura óptima en relación a la pantalla actual
    const targetHeight = window.innerHeight * (document.fullscreenElement ? 0.88 : 0.78);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = targetHeight / unscaledViewport.height;
    const viewport = page.getViewport({ scale: scale > 0 ? scale : 1 });

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
  } catch (e) {
    console.warn(`Error renderizando página ${pageNumber}:`, e);
  }
}

function cambiarPagina(delta) {
  if (!pdfDoc || isRendering) return;

  const totalPages = pdfDoc.numPages;
  let targetIndex = currentSpreadIndex;

  if (delta > 0) {
    targetIndex = (currentSpreadIndex === 1) ? 2 : currentSpreadIndex + 2;
    if (targetIndex > totalPages) return;
  } else {
    targetIndex = (currentSpreadIndex <= 2) ? 1 : currentSpreadIndex - 2;
    if (targetIndex < 1) return;
  }

  // Activar animación 3D de vuelta de hoja
  const flipLayer = document.getElementById('pageFlipLayer');
  if (flipLayer) {
    const animClass = delta > 0 ? 'anim-flip-forward' : 'anim-flip-backward';
    flipLayer.classList.remove('anim-flip-forward', 'anim-flip-backward');
    void flipLayer.offsetWidth; // Reiniciar animación
    flipLayer.classList.add(animClass);

    setTimeout(() => {
      currentSpreadIndex = targetIndex;
      renderSpread().then(() => {
        flipLayer.classList.remove(animClass);
      });
    }, 280);
  } else {
    currentSpreadIndex = targetIndex;
    renderSpread();
  }
}

/* ==========================================================================
   8. DIRECTORIO DE SEDES (sedes.html)
   ========================================================================== */
async function loadSedes() {
  const container = document.getElementById('sedesGrid');
  if (!container) return;

  if (!supabaseClient) {
    container.innerHTML = `
      <div class="empty-message" style="grid-column: 1 / -1;">
        No se pudo establecer conexión con Supabase.
      </div>`;
    return;
  }

  try {
    const { data: sedes, error } = await supabaseClient
      .from('sedes')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error obteniendo sedes:', error);
      container.innerHTML = `
        <div class="empty-message" style="grid-column: 1 / -1;">
          Error al cargar el directorio de congregaciones.
        </div>`;
      return;
    }

    if (!sedes || sedes.length === 0) {
      container.innerHTML = `
        <div class="empty-message" style="grid-column: 1 / -1;">
          Actualmente no hay congregaciones registradas en el directorio.
        </div>`;
      return;
    }

    container.innerHTML = '';

    sedes.forEach(sede => {
      const cleanPhone = (sede.telefono || '').replace(/[^0-9+]/g, '');
      const waLink = cleanPhone ? `https://wa.me/${cleanPhone.replace('+', '')}` : '#';

      const card = document.createElement('div');
      card.className = 'sede-card';
      card.innerHTML = `
        <h3 class="sede-name">${escapeHtml(sede.nombre)}</h3>

        <div class="sede-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <div>
            <strong>Dirección:</strong><br>
            ${escapeHtml(sede.direccion || 'Consultar con administración')}
          </div>
        </div>

        <div class="sede-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <div>
            <strong>Cultos y Horarios:</strong><br>
            ${escapeHtml(sede.horarios || 'Reuniones periódicas')}
          </div>
        </div>

        <div class="sede-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          <div>
            <strong>Teléfono:</strong><br>
            ${escapeHtml(sede.telefono || 'Sin teléfono asignado')}
          </div>
        </div>

        <div class="sede-actions">
          ${cleanPhone ? `
            <a href="${escapeHtml(waLink)}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp" title="Escribir por WhatsApp">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.8 14.17c-.24.68-1.2 1.25-1.8 1.32-.47.06-1.07.09-3.23-.8-2.31-.95-3.8-3.29-3.92-3.45-.11-.16-.95-1.27-.95-2.42 0-1.15.6-1.72.82-1.95.21-.24.47-.3.62-.3.16 0 .32.01.46.01.15 0 .35-.06.55.42.21.49.71 1.74.78 1.87.06.13.1.28.02.44-.08.16-.12.26-.24.4-.12.14-.26.31-.37.42-.12.12-.24.25-.1.5.14.24.62 1.02 1.32 1.65.91.81 1.67 1.06 1.91 1.18.24.12.38.1.52-.06.14-.16.6-1.03.76-1.39.16-.36.32-.3.54-.22.22.08 1.41.67 1.65.79.24.12.4.18.46.28.06.1.06.59-.18 1.27z"/>
              </svg>
              WhatsApp
            </a>
            <a href="tel:${escapeHtml(cleanPhone)}" class="btn-call" title="Llamar directamente">
              Llamar
            </a>
          ` : ''}
        </div>
      `;

      container.appendChild(card);
    });
  } catch (err) {
    console.error('Error general cargando sedes:', err);
    container.innerHTML = `
      <div class="empty-message" style="grid-column: 1 / -1;">
        Ocurrió un error inesperado al conectar con el servidor.
      </div>`;
  }
}

/* ==========================================================================
   9. UTILIDAD DE SANITIZACIÓN HTML
   ========================================================================== */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ==========================================================================
   10. SISTEMA DE EDICIÓN VISUAL TOTAL, IMAGEN DE FONDO Y REDES SOCIALES
   ========================================================================== */
let ajustesData = null;
let isEditingActive = false;

function formatYoutubeEmbed(url) {
  if (!url) return '';
  if (url.includes('/embed/')) return url;
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1].split('?')[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  if (url.includes('watch?v=')) {
    const id = url.split('watch?v=')[1].split('&')[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  if (url.includes('/live/')) {
    const id = url.split('/live/')[1].split('?')[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  return url;
}

async function loadAjustes() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient.from('ajustes').select('*').eq('id', 1).single();
    if (error) throw error;
    if (!data) return;

    ajustesData = data;

    // 1. Cargar imagen de fondo del Hero
    if (data.hero_bg_url) {
      const heroSec = document.getElementById('heroEditorialSection');
      if (heroSec) heroSec.style.backgroundImage = `url("${data.hero_bg_url}")`;
    }

    // 2. Cargar todos los textos personalizados guardados
    if (data.textos_custom && typeof data.textos_custom === 'object') {
      Object.keys(data.textos_custom).forEach(key => {
        const el = document.querySelector(`[data-editable="${key}"]`);
        if (el && data.textos_custom[key]) {
          el.innerHTML = data.textos_custom[key];
        }
      });
    }

    // Fallback de retrocompatibilidad
    const elVersiculo = document.getElementById('editableVersiculo');
    const elTitulo = document.getElementById('editableHeroTitle');
    const elDesc = document.getElementById('editableHeroDesc');
    if (elVersiculo && data.versiculo && !data.textos_custom?.topbar_verse) elVersiculo.textContent = data.versiculo;
    if (elTitulo && data.hero_titulo && !data.textos_custom?.hero_titulo) elTitulo.innerHTML = data.hero_titulo;
    if (elDesc && data.hero_descripcion && !data.textos_custom?.hero_desc) elDesc.textContent = data.hero_descripcion;

    // 3. Cargar transmisiones
    const iframeVideo = document.getElementById('liveVideoIframe');
    const audioRadio = document.getElementById('audioRadio');
    const sourceRadio = document.getElementById('liveRadioSource');

    if (iframeVideo && data.youtube_url) iframeVideo.src = formatYoutubeEmbed(data.youtube_url);
    if (audioRadio && sourceRadio && data.radio_url) {
      sourceRadio.src = data.radio_url;
      audioRadio.load();
    }

    // 4. Cargar enlaces de redes sociales
    aplicarRedSocial('linkFbTop', 'linkFbFooter', data.facebook_url);
    aplicarRedSocial('linkTkTop', 'linkTkFooter', data.tiktok_url);
    aplicarRedSocial('linkIgTop', 'linkIgFooter', data.instagram_url);
    aplicarRedSocial('linkYtTop', 'linkYtFooter', data.youtube_canal);

  } catch (err) {
    console.error('Error cargando ajustes:', err);
  }
}

function aplicarRedSocial(topId, footerId, url) {
  const elTop = document.getElementById(topId);
  const elFooter = document.getElementById(footerId);
  const visible = Boolean(url && url.trim().length > 3);

  if (elTop) {
    elTop.href = url || '#';
    elTop.style.display = visible ? 'inline-flex' : 'none';
  }
  if (elFooter) {
    elFooter.href = url || '#';
    elFooter.style.display = visible ? 'inline-block' : 'none';
  }
}

async function setupVisualEditor() {
  if (!supabaseClient) return;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    const topAdminLink = document.getElementById('topbarAdminLink');
    const navAdminBtn = document.getElementById('navAdminBtn');
    const navAdminBtnText = document.getElementById('navAdminBtnText');
    const sidebarAdminBtn = document.getElementById('sidebarAdminBtn');

    if (topAdminLink) {
      topAdminLink.href = 'admin.html';
      topAdminLink.innerHTML = '⚙️ Panel Admin &rarr;';
    }
    if (navAdminBtn) navAdminBtn.href = 'admin.html';
    if (navAdminBtnText) navAdminBtnText.textContent = 'Panel Admin';
    if (sidebarAdminBtn) sidebarAdminBtn.href = 'admin.html';
  } else {
    return;
  }

  const visualBar = document.getElementById('adminVisualBar');
  const btnToggleEdit = document.getElementById('btnToggleEdit');
  const btnSaveVisualTexts = document.getElementById('btnSaveVisualTexts');
  const btnChangeHeroBg = document.getElementById('btnChangeHeroBg');
  const inputHeroBgFile = document.getElementById('inputHeroBgFile');

  // Modales
  const btnOpenSocialModal = document.getElementById('btnOpenSocialModal');
  const modalSocials = document.getElementById('modalSocials');
  const btnCloseSocialModal = document.getElementById('btnCloseSocialModal');
  const btnSaveSocials = document.getElementById('btnSaveSocials');

  const btnOpenStreamModal = document.getElementById('btnOpenStreamModal');
  const modalStreams = document.getElementById('modalStreams');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnSaveStreams = document.getElementById('btnSaveStreams');

  if (visualBar) visualBar.style.display = 'flex';

  // 1. ALTERNAR EDICIÓN DE TODOS LOS ELEMENTOS CON data-editable
  if (btnToggleEdit) {
    btnToggleEdit.addEventListener('click', () => {
      isEditingActive = !isEditingActive;
      const editableElements = document.querySelectorAll('[data-editable]');

      editableElements.forEach(el => {
        el.contentEditable = isEditingActive ? 'true' : 'false';
      });

      btnToggleEdit.textContent = isEditingActive ? '🔒 Desactivar Edición' : '✏️ Habilitar Edición de Textos';
      btnToggleEdit.style.backgroundColor = isEditingActive ? '#b91c1c' : '#1e3e62';
      btnSaveVisualTexts.disabled = !isEditingActive;
    });
  }

  // 2. GUARDAR TODOS LOS TEXTOS EN SUPABASE
  if (btnSaveVisualTexts) {
    btnSaveVisualTexts.addEventListener('click', async () => {
      btnSaveVisualTexts.disabled = true;
      btnSaveVisualTexts.textContent = 'Guardando...';

      const editableElements = document.querySelectorAll('[data-editable]');
      const paqueteTextos = {};

      editableElements.forEach(el => {
        const key = el.getAttribute('data-editable');
        if (key) {
          paqueteTextos[key] = el.innerHTML.trim();
        }
      });

      try {
        const { error } = await supabaseClient.from('ajustes').upsert({
          id: 1,
          versiculo: paqueteTextos.topbar_verse || '',
          hero_titulo: paqueteTextos.hero_titulo || '',
          hero_descripcion: paqueteTextos.hero_desc || '',
          textos_custom: paqueteTextos
        });

        if (error) throw error;
        alert('✓ ¡Todos los textos de la página fueron guardados con éxito!');
      } catch (err) {
        alert('Error al guardar textos: ' + err.message);
      } finally {
        btnSaveVisualTexts.disabled = false;
        btnSaveVisualTexts.textContent = '💾 Guardar Textos';
      }
    });
  }

  // 3. CAMBIAR IMAGEN DE FONDO DE LA PORTADA
  if (btnChangeHeroBg && inputHeroBgFile) {
    btnChangeHeroBg.addEventListener('click', () => {
      inputHeroBgFile.click();
    });

    inputHeroBgFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      btnChangeHeroBg.disabled = true;
      btnChangeHeroBg.textContent = 'Subiendo imagen...';

      try {
        const ext = file.name.split('.').pop();
        const ruta = `portadas/fondo_hero_${Date.now()}.${ext}`;

        const { error: upErr } = await supabaseClient.storage
          .from('Archivos-iglesia')
          .upload(ruta, file);

        if (upErr) throw upErr;

        const { data: urlData } = supabaseClient.storage
          .from('Archivos-iglesia')
          .getPublicUrl(ruta);

        const nuevaImgUrl = urlData.publicUrl;

        // Guardar la URL en la tabla ajustes
        const { error: dbErr } = await supabaseClient.from('ajustes').upsert({
          id: 1,
          hero_bg_url: nuevaImgUrl
        });

        if (dbErr) throw dbErr;

        const heroSec = document.getElementById('heroEditorialSection');
        if (heroSec) heroSec.style.backgroundImage = `url("${nuevaImgUrl}")`;

        alert('✓ ¡Imagen de portada actualizada exitosamente!');
      } catch (err) {
        alert('Error al subir imagen de portada: ' + err.message);
      } finally {
        btnChangeHeroBg.disabled = false;
        btnChangeHeroBg.textContent = '🖼️ Cambiar Fondo Portada';
      }
    });
  }

  // 4. MODAL REDES SOCIALES
  if (btnOpenSocialModal && modalSocials) {
    btnOpenSocialModal.addEventListener('click', () => {
      if (ajustesData) {
        document.getElementById('inputFbUrl').value = ajustesData.facebook_url || '';
        document.getElementById('inputTkUrl').value = ajustesData.tiktok_url || '';
        document.getElementById('inputIgUrl').value = ajustesData.instagram_url || '';
        document.getElementById('inputYtCanal').value = ajustesData.youtube_canal || '';
      }
      modalSocials.style.display = 'flex';
    });
  }

  if (btnCloseSocialModal && modalSocials) {
    btnCloseSocialModal.addEventListener('click', () => modalSocials.style.display = 'none');
  }

  if (btnSaveSocials) {
    btnSaveSocials.addEventListener('click', async () => {
      btnSaveSocials.disabled = true;
      btnSaveSocials.textContent = 'Guardando...';

      const fb = document.getElementById('inputFbUrl').value.trim();
      const tk = document.getElementById('inputTkUrl').value.trim();
      const ig = document.getElementById('inputIgUrl').value.trim();
      const yt = document.getElementById('inputYtCanal').value.trim();

      try {
        const { error } = await supabaseClient.from('ajustes').upsert({
          id: 1,
          facebook_url: fb,
          tiktok_url: tk,
          instagram_url: ig,
          youtube_canal: yt
        });

        if (error) throw error;

        alert('✓ Redes sociales actualizadas.');
        modalSocials.style.display = 'none';
        loadAjustes();
      } catch (err) {
        alert('Error al guardar redes: ' + err.message);
      } finally {
        btnSaveSocials.disabled = false;
        btnSaveSocials.textContent = 'Guardar Enlaces de Redes';
      }
    });
  }

  // 5. MODAL TRANSMISIONES
  if (btnOpenStreamModal && modalStreams) {
    btnOpenStreamModal.addEventListener('click', () => {
      if (ajustesData) {
        document.getElementById('inputYoutubeUrl').value = ajustesData.youtube_url || '';
        document.getElementById('inputRadioUrl').value = ajustesData.radio_url || '';
      }
      modalStreams.style.display = 'flex';
    });
  }

  if (btnCloseModal && modalStreams) {
    btnCloseModal.addEventListener('click', () => modalStreams.style.display = 'none');
  }

  if (btnSaveStreams) {
    btnSaveStreams.addEventListener('click', async () => {
      btnSaveStreams.disabled = true;
      btnSaveStreams.textContent = 'Guardando...';

      const nuevaYoutube = document.getElementById('inputYoutubeUrl').value.trim();
      const nuevaRadio = document.getElementById('inputRadioUrl').value.trim();

      try {
        const { error } = await supabaseClient.from('ajustes').upsert({
          id: 1,
          youtube_url: nuevaYoutube,
          radio_url: nuevaRadio
        });

        if (error) throw error;

        alert('✓ Transmisiones actualizadas.');
        modalStreams.style.display = 'none';
        loadAjustes();
      } catch (err) {
        alert('Error al guardar: ' + err.message);
      } finally {
        btnSaveStreams.disabled = false;
        btnSaveStreams.textContent = 'Guardar Señales';
      }
    });
  }
}