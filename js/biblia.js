// js/biblia.js
// Lector Bíblico RVR1960 con Consulta en Vivo de Promesas Diarias por Coordenadas

document.addEventListener('DOMContentLoaded', () => {
  initMenuMovil();
  initVersiculoDelDiaDirecto();
  initLectorBiblia();
});

/* 1. Menú Móvil */
function initMenuMovil() {
  const toggle = document.getElementById('menuToggle');
  const close = document.getElementById('sidebarClose');
  const overlay = document.getElementById('sidebarOverlay');
  const sidebar = document.getElementById('sidebarMenu');
  if (!toggle || !sidebar) return;

  const open = () => { sidebar.classList.add('open'); overlay.classList.add('open'); };
  const hide = () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); };
  toggle.addEventListener('click', open);
  if (close) close.addEventListener('click', hide);
  if (overlay) overlay.addEventListener('click', hide);
}

/* 2. Coordenadas Bíblicas por Temas (b: ID Libro, c: Capítulo, v: Versículo) */
const COORDENADAS_PROMESAS = {
  animo: [
    { b: 23, c: 41, v: 10, r: "Isaías 41:10" },
    { b: 6,  c: 1,  v: 9,  r: "Josué 1:9" },
    { b: 50, c: 4,  v: 13, r: "Filipenses 4:13" },
    { b: 45, c: 8,  v: 28, r: "Romanos 8:28" },
    { b: 23, c: 40, v: 29, r: "Isaías 40:29" },
    { b: 19, c: 34, v: 18, r: "Salmos 34:18" },
    { b: 40, c: 11, v: 28, r: "Mateo 11:28" },
    { b: 19, c: 42, v: 11, r: "Salmos 42:11" },
    { b: 47, c: 12, v: 9,  r: "2 Corintios 12:9" },
    { b: 48, c: 6,  v: 9,  r: "Gálatas 6:9" }
  ],
  no_temas: [
    { b: 19, c: 23, v: 4,  r: "Salmos 23:4" },
    { b: 19, c: 27, v: 1,  r: "Salmos 27:1" },
    { b: 55, c: 1,  v: 7,  r: "2 Timoteo 1:7" },
    { b: 19, c: 56, v: 3,  r: "Salmos 56:3" },
    { b: 19, c: 91, v: 5,  r: "Salmos 91:5" },
    { b: 19, c: 118, v: 6, r: "Salmos 118:6" },
    { b: 23, c: 43, v: 1,  r: "Isaías 43:1" },
    { b: 19, c: 46, v: 2,  r: "Salmos 46:2" },
    { b: 41, c: 5,  v: 36, r: "Marcos 5:36" },
    { b: 62, c: 4,  v: 18, r: "1 Juan 4:18" }
  ],
  fe: [
    { b: 58, c: 11, v: 1,  r: "Hebreos 11:1" },
    { b: 58, c: 11, v: 6,  r: "Hebreos 11:6" },
    { b: 47, c: 5,  v: 7,  r: "2 Corintios 5:7" },
    { b: 45, c: 10, v: 17, r: "Romanos 10:17" },
    { b: 41, c: 9,  v: 23, r: "Marcos 9:23" },
    { b: 48, c: 2,  v: 20, r: "Gálatas 2:20" },
    { b: 40, c: 21, v: 22, r: "Mateo 21:22" },
    { b: 45, c: 1,  v: 17, r: "Romanos 1:17" },
    { b: 49, c: 2,  v: 8,  r: "Efesios 2:8" },
    { b: 59, c: 1,  v: 6,  r: "Santiago 1:6" }
  ],
  fortaleza: [
    { b: 19, c: 46, v: 1,  r: "Salmos 46:1" },
    { b: 23, c: 40, v: 31, r: "Isaías 40:31" },
    { b: 49, c: 6,  v: 10, r: "Efesios 6:10" },
    { b: 19, c: 28, v: 7,  r: "Salmos 28:7" },
    { b: 19, c: 18, v: 2,  r: "Salmos 18:2" },
    { b: 19, c: 73, v: 26, r: "Salmos 73:26" },
    { b: 23, c: 12, v: 2,  r: "Isaías 12:2" },
    { b: 35, c: 3,  v: 19, r: "Habacuc 3:19" },
    { b: 19, c: 138, v: 3, r: "Salmos 138:3" },
    { b: 47, c: 4,  v: 16, r: "2 Corintios 4:16" }
  ],
  paz: [
    { b: 43, c: 14, v: 27, r: "Juan 14:27" },
    { b: 50, c: 4,  v: 7,  r: "Filipenses 4:7" },
    { b: 19, c: 4,  v: 8,  r: "Salmos 4:8" },
    { b: 23, c: 26, v: 3,  r: "Isaías 26:3" },
    { b: 43, c: 16, v: 33, r: "Juan 16:33" },
    { b: 45, c: 5,  v: 1,  r: "Romanos 5:1" },
    { b: 19, c: 29, v: 11, r: "Salmos 29:11" },
    { b: 19, c: 119, v: 165, r: "Salmos 119:165" },
    { b: 51, c: 3,  v: 15, r: "Colosenses 3:15" },
    { b: 53, c: 3,  v: 16, r: "2 Tesalonicenses 3:16" }
  ],
  esperanza: [
    { b: 24, c: 29, v: 11, r: "Jeremías 29:11" },
    { b: 45, c: 15, v: 13, r: "Romanos 15:13" },
    { b: 25, c: 3,  v: 22, r: "Lamentaciones 3:22" },
    { b: 19, c: 71, v: 5,  r: "Salmos 71:5" },
    { b: 58, c: 6,  v: 19, r: "Hebreos 6:19" },
    { b: 45, c: 5,  v: 5,  r: "Romanos 5:5" },
    { b: 19, c: 130, v: 5, r: "Salmos 130:5" },
    { b: 60, c: 1,  v: 3,  r: "1 Pedro 1:3" },
    { b: 19, c: 39, v: 7,  r: "Salmos 39:7" },
    { b: 56, c: 2,  v: 13, r: "Tito 2:13" }
  ]
};

function initVersiculoDelDiaDirecto() {
  const elFecha = document.getElementById('vdFecha');
  const elTexto = document.getElementById('vdTexto');
  const elRef = document.getElementById('vdReferencia');
  const pills = document.querySelectorAll('.theme-pill');
  const btnCopiar = document.getElementById('btnCopiarVersiculo');
  const btnWa = document.getElementById('btnCompartirWa');

  const hoy = new Date();
  if (elFecha) {
    elFecha.textContent = hoy.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  // Cálculo del día ordinal del año (1 al 365/366)
  const inicioAno = new Date(hoy.getFullYear(), 0, 0);
  const diff = hoy - inicioAno;
  const diaDelAno = Math.floor(diff / (1000 * 60 * 60 * 24));

  async function cargarPromesaDeLaBiblia(tema) {
    const lista = COORDENADAS_PROMESAS[tema] || COORDENADAS_PROMESAS.animo;
    
    // Algoritmo determinista: cambia cada 24 horas y rota sin repetirse
    const indice = (diaDelAno + hoy.getFullYear()) % lista.length;
    const coord = lista[indice];

    elTexto.innerHTML = `<span style="opacity: 0.6;">Consultando versículo desde la Biblia...</span>`;
    elRef.textContent = `— ${coord.r}`;

    try {
      // Petición directa a la API de Bolls Life RVR1960
      const res = await fetch(`https://bolls.life/get-chapter/RV1960/${coord.b}/${coord.c}/`);
      if (!res.ok) throw new Error();
      const capitulo = await res.json();
      
      const versiculoObj = capitulo.find(v => v.verse === coord.v);
      if (versiculoObj) {
        const textoLimpio = versiculoObj.text.replace(/<[^>]*>?/gm, '').trim();
        elTexto.textContent = `“${textoLimpio}”`;
      } else {
        elTexto.textContent = `“Cercano está Jehová a todos los que le invocan.”`;
      }
    } catch (e) {
      elTexto.textContent = `“Jehová es mi fortaleza y mi escudo; en él confió mi corazón, y fui ayudado.”`;
    }
  }

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      cargarPromesaDeLaBiblia(pill.dataset.theme);
    });
  });

  cargarPromesaDeLaBiblia('animo');

  if (btnCopiar) {
    btnCopiar.addEventListener('click', () => {
      navigator.clipboard.writeText(`${elTexto.textContent}\n${elRef.textContent}`);
      btnCopiar.textContent = '✓ ¡Copiado!';
      setTimeout(() => btnCopiar.textContent = '📋 Copiar Versículo', 2000);
    });
  }

  if (btnWa) {
    btnWa.addEventListener('click', () => {
      const msg = encodeURIComponent(`*Versículo del Día*\n\n${elTexto.textContent}\n*${elRef.textContent}*\n\nLee la Biblia en: https://luismiguel3007.github.io/portal-encuentro-con-jesus/biblia.html`);
      window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
    });
  }
}

/* 3. Lector Bíblico RVR1960 con Filtro Versículo / Capítulo */
const LIBROS_BIBLIA = [
  { id: 1, nombre: "Génesis", caps: 50, test: "antiguo" },
  { id: 2, nombre: "Éxodo", caps: 40, test: "antiguo" },
  { id: 3, nombre: "Levítico", caps: 27, test: "antiguo" },
  { id: 4, nombre: "Números", caps: 36, test: "antiguo" },
  { id: 5, nombre: "Deuteronomio", caps: 34, test: "antiguo" },
  { id: 6, nombre: "Josué", caps: 24, test: "antiguo" },
  { id: 7, nombre: "Jueces", caps: 21, test: "antiguo" },
  { id: 8, nombre: "Rut", caps: 4, test: "antiguo" },
  { id: 9, nombre: "1 Samuel", caps: 31, test: "antiguo" },
  { id: 10, nombre: "2 Samuel", caps: 24, test: "antiguo" },
  { id: 11, nombre: "1 Reyes", caps: 22, test: "antiguo" },
  { id: 12, nombre: "2 Reyes", caps: 25, test: "antiguo" },
  { id: 13, nombre: "1 Crónicas", caps: 29, test: "antiguo" },
  { id: 14, nombre: "2 Crónicas", caps: 36, test: "antiguo" },
  { id: 15, nombre: "Esdras", caps: 10, test: "antiguo" },
  { id: 16, nombre: "Nehemías", caps: 13, test: "antiguo" },
  { id: 17, nombre: "Ester", caps: 10, test: "antiguo" },
  { id: 18, nombre: "Job", caps: 42, test: "antiguo" },
  { id: 19, nombre: "Salmos", caps: 150, test: "antiguo" },
  { id: 20, nombre: "Proverbios", caps: 31, test: "antiguo" },
  { id: 21, nombre: "Eclesiastés", caps: 12, test: "antiguo" },
  { id: 22, nombre: "Cantares", caps: 8, test: "antiguo" },
  { id: 23, nombre: "Isaías", caps: 66, test: "antiguo" },
  { id: 24, nombre: "Jeremías", caps: 52, test: "antiguo" },
  { id: 25, nombre: "Lamentaciones", caps: 5, test: "antiguo" },
  { id: 26, nombre: "Ezequiel", caps: 48, test: "antiguo" },
  { id: 27, nombre: "Daniel", caps: 12, test: "antiguo" },
  { id: 28, nombre: "Oseas", caps: 14, test: "antiguo" },
  { id: 29, nombre: "Joel", caps: 3, test: "antiguo" },
  { id: 30, nombre: "Amós", caps: 9, test: "antiguo" },
  { id: 31, nombre: "Abdías", caps: 1, test: "antiguo" },
  { id: 32, nombre: "Jonás", caps: 4, test: "antiguo" },
  { id: 33, nombre: "Miqueas", caps: 7, test: "antiguo" },
  { id: 34, nombre: "Nahúm", caps: 3, test: "antiguo" },
  { id: 35, nombre: "Habacuc", caps: 3, test: "antiguo" },
  { id: 36, nombre: "Sofonías", caps: 3, test: "antiguo" },
  { id: 37, nombre: "Hageo", caps: 2, test: "antiguo" },
  { id: 38, nombre: "Zacarías", caps: 14, test: "antiguo" },
  { id: 39, nombre: "Malaquías", caps: 4, test: "antiguo" },
  { id: 40, nombre: "Mateo", caps: 28, test: "nuevo" },
  { id: 41, nombre: "Marcos", caps: 16, test: "nuevo" },
  { id: 42, nombre: "Lucas", caps: 24, test: "nuevo" },
  { id: 43, nombre: "Juan", caps: 21, test: "nuevo" },
  { id: 44, nombre: "Hechos", caps: 28, test: "nuevo" },
  { id: 45, nombre: "Romanos", caps: 16, test: "nuevo" },
  { id: 46, nombre: "1 Corintios", caps: 16, test: "nuevo" },
  { id: 47, nombre: "2 Corintios", caps: 13, test: "nuevo" },
  { id: 48, nombre: "Gálatas", caps: 6, test: "nuevo" },
  { id: 49, nombre: "Efesios", caps: 6, test: "nuevo" },
  { id: 50, nombre: "Filipenses", caps: 4, test: "nuevo" },
  { id: 51, nombre: "Colosenses", caps: 4, test: "nuevo" },
  { id: 52, nombre: "1 Tesalonicenses", caps: 5, test: "nuevo" },
  { id: 53, nombre: "2 Tesalonicenses", caps: 3, test: "nuevo" },
  { id: 54, nombre: "1 Timoteo", caps: 6, test: "nuevo" },
  { id: 55, nombre: "2 Timoteo", caps: 4, test: "nuevo" },
  { id: 56, nombre: "Tito", caps: 3, test: "nuevo" },
  { id: 57, nombre: "Filemón", caps: 1, test: "nuevo" },
  { id: 58, nombre: "Hebreos", caps: 13, test: "nuevo" },
  { id: 59, nombre: "Santiago", caps: 5, test: "nuevo" },
  { id: 60, nombre: "1 Pedro", caps: 5, test: "nuevo" },
  { id: 61, nombre: "2 Pedro", caps: 3, test: "nuevo" },
  { id: 62, nombre: "1 Juan", caps: 5, test: "nuevo" },
  { id: 63, nombre: "2 Juan", caps: 1, test: "nuevo" },
  { id: 64, nombre: "3 Juan", caps: 1, test: "nuevo" },
  { id: 65, nombre: "Judas", caps: 1, test: "nuevo" },
  { id: 66, nombre: "Apocalipsis", caps: 22, test: "nuevo" }
];

function initLectorBiblia() {
  const selTest = document.getElementById('selTestamento');
  const selLib = document.getElementById('selLibro');
  const selCap = document.getElementById('selCapitulo');
  const selVer = document.getElementById('selVersiculo');
  const txtTitulo = document.getElementById('txtLibroCap');
  const contVersiculos = document.getElementById('contenedorVersiculos');
  const btnPrev = document.getElementById('btnCapAnterior');
  const btnNext = document.getElementById('btnCapSiguiente');

  if (!selTest || !selLib || !selCap || !selVer) return;

  let libroSeleccionado = LIBROS_BIBLIA[39]; // Mateo por defecto
  let capSeleccionado = 1;
  let verSeleccionado = 0; // 0 = Todo el capítulo
  let versiculosCache = [];

  function actualizarSelectLibros() {
    const test = selTest.value;
    const filtrados = LIBROS_BIBLIA.filter(l => l.test === test);
    selLib.innerHTML = filtrados.map(l => `<option value="${l.id}">${l.nombre}</option>`).join('');
    
    if (!filtrados.some(l => l.id === libroSeleccionado.id)) {
      libroSeleccionado = filtrados[0];
    }
    selLib.value = libroSeleccionado.id;
    actualizarSelectCapitulos();
  }

  function actualizarSelectCapitulos() {
    selCap.innerHTML = Array.from({ length: libroSeleccionado.caps }, (_, i) => `<option value="${i + 1}">Capítulo ${i + 1}</option>`).join('');
    if (capSeleccionado > libroSeleccionado.caps) capSeleccionado = 1;
    selCap.value = capSeleccionado;
    cargarTextoCapitulo();
  }

  function poblarSelectVersiculos() {
    selVer.innerHTML = '<option value="0">📖 Capítulo Completo</option>' +
      versiculosCache.map(v => `<option value="${v.verse}">Versículo ${v.verse}</option>`).join('');
    selVer.value = verSeleccionado;
  }

  async function cargarTextoCapitulo() {
    contVersiculos.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <span>Consultando Escrituras...</span>
      </div>`;

    try {
      let res = await fetch(`https://bolls.life/get-chapter/RV1960/${libroSeleccionado.id}/${capSeleccionado}/`);
      let data = res.ok ? await res.json() : null;

      if (!data || !Array.isArray(data) || data.length === 0) {
        res = await fetch(`https://bolls.life/get-chapter/RVR1960/${libroSeleccionado.id}/${capSeleccionado}/`);
        if (res.ok) data = await res.json();
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        contVersiculos.innerHTML = '<p class="text-muted">No se encontraron versículos en este capítulo.</p>';
        return;
      }

      versiculosCache = data;
      poblarSelectVersiculos();
      renderizarVista();

    } catch (e) {
      contVersiculos.innerHTML = `
        <p style="color: #991b1b; padding: 1rem; background: #fee2e2; border-radius: 8px;">
          No se pudo conectar con el servicio bíblico. Revisa tu conexión a internet.
        </p>`;
    }
  }

  function renderizarVista() {
    if (verSeleccionado === 0) {
      // Modo Capítulo Completo
      txtTitulo.textContent = `${libroSeleccionado.nombre} ${capSeleccionado}`;
      btnPrev.textContent = '← Capítulo Anterior';
      btnNext.textContent = 'Capítulo Siguiente →';

      contVersiculos.innerHTML = versiculosCache.map(v => `
        <span class="v-box" data-verse="${v.verse}" title="Haz clic para aislar este versículo">
          <sup class="v-num">${v.verse}</sup>${v.text.replace(/<[^>]*>?/gm, '')} 
        </span>
      `).join(' ');

      contVersiculos.querySelectorAll('.v-box').forEach(el => {
        el.addEventListener('click', () => {
          verSeleccionado = parseInt(el.getAttribute('data-verse'), 10);
          selVer.value = verSeleccionado;
          renderizarVista();
        });
      });

    } else {
      // Modo Versículo Aislado
      const vObj = versiculosCache.find(x => x.verse === verSeleccionado) || versiculosCache[0];
      txtTitulo.textContent = `${libroSeleccionado.nombre} ${capSeleccionado}:${vObj.verse}`;
      btnPrev.textContent = '← Versículo Anterior';
      btnNext.textContent = 'Versículo Siguiente →';

      const textoLimpio = vObj.text.replace(/<[^>]*>?/gm, '').trim();

      contVersiculos.innerHTML = `
        <div class="verse-focus-card">
          <p class="verse-focus-text">“${textoLimpio}”</p>
          <div class="verse-focus-meta">
            <span class="badge-cat-sm" style="background:#0b192c; color:#e5a823; font-weight:bold;">
              ${libroSeleccionado.nombre} ${capSeleccionado}:${vObj.verse}
            </span>
            <button type="button" class="btn-secondary btn-sm" id="btnCopiarFocus">📋 Copiar</button>
            <button type="button" class="btn-secondary btn-sm" id="btnVerCapCompleto">📖 Ver Capítulo Completo</button>
          </div>
        </div>
      `;

      document.getElementById('btnCopiarFocus')?.addEventListener('click', () => {
        navigator.clipboard.writeText(`"${textoLimpio}" — ${libroSeleccionado.nombre} ${capSeleccionado}:${vObj.verse} (RVR1960)`);
        alert('✓ Versículo copiado al portapapeles.');
      });

      document.getElementById('btnVerCapCompleto')?.addEventListener('click', () => {
        verSeleccionado = 0;
        selVer.value = 0;
        renderizarVista();
      });
    }

    contVersiculos.scrollTop = 0;
  }

  selTest.addEventListener('change', actualizarSelectLibros);

  selLib.addEventListener('change', () => {
    libroSeleccionado = LIBROS_BIBLIA.find(l => l.id === parseInt(selLib.value, 10));
    capSeleccionado = 1;
    verSeleccionado = 0;
    actualizarSelectCapitulos();
  });

  selCap.addEventListener('change', () => {
    capSeleccionado = parseInt(selCap.value, 10);
    verSeleccionado = 0;
    cargarTextoCapitulo();
  });

  selVer.addEventListener('change', () => {
    verSeleccionado = parseInt(selVer.value, 10);
    renderizarVista();
  });

  btnPrev.addEventListener('click', () => {
    if (verSeleccionado === 0) {
      if (capSeleccionado > 1) {
        capSeleccionado--;
        selCap.value = capSeleccionado;
        cargarTextoCapitulo();
      }
    } else {
      if (verSeleccionado > 1) {
        verSeleccionado--;
        selVer.value = verSeleccionado;
        renderizarVista();
      } else if (capSeleccionado > 1) {
        capSeleccionado--;
        selCap.value = capSeleccionado;
        cargarTextoCapitulo().then(() => {
          verSeleccionado = versiculosCache.length;
          selVer.value = verSeleccionado;
          renderizarVista();
        });
      }
    }
  });

  btnNext.addEventListener('click', () => {
    if (verSeleccionado === 0) {
      if (capSeleccionado < libroSeleccionado.caps) {
        capSeleccionado++;
        selCap.value = capSeleccionado;
        cargarTextoCapitulo();
      }
    } else {
      if (verSeleccionado < versiculosCache.length) {
        verSeleccionado++;
        selVer.value = verSeleccionado;
        renderizarVista();
      } else if (capSeleccionado < libroSeleccionado.caps) {
        capSeleccionado++;
        selCap.value = capSeleccionado;
        verSeleccionado = 1;
        cargarTextoCapitulo();
      }
    }
  });

  actualizarSelectLibros();
}