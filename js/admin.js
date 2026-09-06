// js/admin.js

document.addEventListener('DOMContentLoaded', async () => {
  // 1. VERIFICAR AUTENTICACIÓN
  const sessionStatus = document.getElementById('sessionStatus');
  const btnLogout = document.getElementById('btnLogout');

  try {
    const { data: { session }, error } = await db.auth.getSession();
    if (error || !session) {
      if (sessionStatus) {
        sessionStatus.textContent = 'Sin sesión activa';
        sessionStatus.style.backgroundColor = '#fef3c7';
        sessionStatus.style.color = '#92400e';
      }
    } else {
      if (sessionStatus) {
        sessionStatus.textContent = `Conectado: ${session.user.email}`;
        sessionStatus.style.backgroundColor = '#dcfce7';
        sessionStatus.style.color = '#15803d';
      }
    }
  } catch (err) {
    console.error('Error al comprobar sesión:', err);
  }

  // 2. CERRAR SESIÓN
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await db.auth.signOut();
      window.location.href = 'login.html';
    });
  }

  // 3. CAMBIO DE PESTAÑAS (TABS)
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const panel = document.getElementById(targetId);
      if (panel) panel.classList.add('active');

      // Cargar lista correspondiente al entrar a la pestaña
      if (targetId === 'tab-articulos') cargarArticulos();
      if (targetId === 'tab-revistas') cargarRevistas();
      if (targetId === 'tab-sedes') cargarSedes();
      if (targetId === 'tab-lideres') cargarLideres();
    });
  });

  // 4. SUBIDA DE ARCHIVOS A SUPABASE STORAGE
  async function subirArchivo(archivo, carpeta) {
    const ext = archivo.name.split('.').pop();
    const cleanName = `${carpeta}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { error: uploadErr } = await db.storage
      .from('Archivos-iglesia')
      .upload(cleanName, archivo);

    if (uploadErr) throw uploadErr;

    const { data } = db.storage
      .from('Archivos-iglesia')
      .getPublicUrl(cleanName);

    return data.publicUrl;
  }

  // FUNCIÓN PARA ELIMINAR ARCHIVO DEL STORAGE
  async function borrarArchivoDeStorage(url) {
    if (!url || !url.includes('/Archivos-iglesia/')) return;
    try {
      const ruta = decodeURIComponent(url.split('/Archivos-iglesia/')[1]);
      await db.storage.from('Archivos-iglesia').remove([ruta]);
    } catch (e) {
      console.warn('No se pudo borrar el archivo del storage:', e);
    }
  }

  // ===================================================
  // 5. SECCIÓN ARTÍCULOS: GUARDAR Y LISTAR/BORRAR
  // ===================================================
  const formArticulo = document.getElementById('formArticulo');
  const msgArticulo = document.getElementById('msgArticulo');
  const btnGuardarArt = document.getElementById('btnGuardarArt');

  if (formArticulo) {
    formArticulo.addEventListener('submit', async (e) => {
      e.preventDefault();
      btnGuardarArt.disabled = true;
      btnGuardarArt.textContent = 'Subiendo y guardando...';
      msgArticulo.textContent = '';

      try {
        const file = document.getElementById('artFoto').files[0];
        if (!file) throw new Error('Selecciona una fotografía.');

        const fotoUrl = await subirArchivo(file, 'articulos');

        const { error } = await db.from('articulos').insert([{
          titulo: document.getElementById('artTitulo').value.trim(),
          categoria: document.getElementById('artCategoria').value,
          resumen: document.getElementById('artResumen').value.trim(),
          contenido: document.getElementById('artContenido').value.trim(),
          imagen_url: fotoUrl
        }]);

        if (error) throw error;

        msgArticulo.className = 'alert-box success';
        msgArticulo.textContent = '✓ Artículo publicado con éxito.';
        formArticulo.reset();
        cargarArticulos();
      } catch (err) {
        msgArticulo.className = 'alert-box error';
        msgArticulo.textContent = 'Error: ' + (err.message || err);
      } finally {
        btnGuardarArt.disabled = false;
        btnGuardarArt.textContent = 'Publicar Artículo';
      }
    });
  }

  window.cargarArticulos = async function() {
    const contenedor = document.getElementById('listaArticulosAdmin');
    if (!contenedor) return;
    contenedor.innerHTML = '<p class="text-muted">Cargando...</p>';

    try {
      const { data, error } = await db.from('articulos').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      if (!data || data.length === 0) {
        contenedor.innerHTML = '<p class="text-muted">No hay artículos registrados.</p>';
        return;
      }

      contenedor.innerHTML = data.map(item => `
        <div class="admin-item-row" id="art-${item.id}">
          <img src="${item.imagen_url || 'https://via.placeholder.com/70'}" class="admin-thumb" alt="foto">
          <div class="admin-item-info">
            <span class="badge-cat-sm">${item.categoria || 'General'}</span>
            <h4>${item.titulo}</h4>
            <small>${new Date(item.created_at).toLocaleDateString()} — ${item.resumen ? item.resumen.substring(0, 60) + '...' : ''}</small>
          </div>
          <button type="button" class="btn-delete" onclick="eliminarArticulo(${item.id}, '${item.imagen_url}')">🗑️ Eliminar</button>
        </div>
      `).join('');
    } catch (err) {
      contenedor.innerHTML = '<p style="color:red;">Error al cargar artículos.</p>';
    }
  };

  window.eliminarArticulo = async function(id, imgUrl) {
    if (!confirm('¿Seguro que deseas eliminar este artículo permanentemente?')) return;
    try {
      await borrarArchivoDeStorage(imgUrl);
      const { error } = await db.from('articulos').delete().eq('id', id);
      if (error) throw error;
      document.getElementById(`art-${id}`)?.remove();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  // ===================================================
  // 6. SECCIÓN REVISTAS: GUARDAR Y LISTAR/BORRAR
  // ===================================================
  const formRevista = document.getElementById('formRevista');
  const msgRevista = document.getElementById('msgRevista');
  const btnGuardarRev = document.getElementById('btnGuardarRev');

  if (formRevista) {
    formRevista.addEventListener('submit', async (e) => {
      e.preventDefault();
      btnGuardarRev.disabled = true;
      btnGuardarRev.textContent = 'Subiendo archivos...';
      msgRevista.textContent = '';

      try {
        const filePortada = document.getElementById('revPortada').files[0];
        const filePdf = document.getElementById('revPdf').files[0];
        if (!filePortada || !filePdf) throw new Error('Debes subir la foto y el PDF.');

        const portadaUrl = await subirArchivo(filePortada, 'revistas/portadas');
        const pdfUrl = await subirArchivo(filePdf, 'revistas/pdf');

        const { error } = await db.from('revistas').insert([{
          edicion: document.getElementById('revEdicion').value.trim(),
          fecha: document.getElementById('revFecha').value,
          portada_url: portadaUrl,
          pdf_url: pdfUrl
        }]);

        if (error) throw error;

        msgRevista.className = 'alert-box success';
        msgRevista.textContent = '✓ Revista publicada con éxito.';
        formRevista.reset();
        cargarRevistas();
      } catch (err) {
        msgRevista.className = 'alert-box error';
        msgRevista.textContent = 'Error: ' + (err.message || err);
      } finally {
        btnGuardarRev.disabled = false;
        btnGuardarRev.textContent = 'Guardar Revista';
      }
    });
  }

  window.cargarRevistas = async function() {
    const contenedor = document.getElementById('listaRevistasAdmin');
    if (!contenedor) return;
    contenedor.innerHTML = '<p class="text-muted">Cargando...</p>';

    try {
      const { data, error } = await db.from('revistas').select('*').order('fecha', { ascending: false });
      if (error) throw error;

      if (!data || data.length === 0) {
        contenedor.innerHTML = '<p class="text-muted">No hay revistas registradas.</p>';
        return;
      }

      contenedor.innerHTML = data.map(item => `
        <div class="admin-item-row" id="rev-${item.id}">
          <img src="${item.portada_url || 'https://via.placeholder.com/70'}" class="admin-thumb" alt="portada">
          <div class="admin-item-info">
            <h4>${item.edicion}</h4>
            <small>Fecha: ${item.fecha} — <a href="${item.pdf_url}" target="_blank" style="color:#0b192c; font-weight:bold;">Ver PDF</a></small>
          </div>
          <button type="button" class="btn-delete" onclick="eliminarRevista(${item.id}, '${item.portada_url}', '${item.pdf_url}')">🗑️ Eliminar</button>
        </div>
      `).join('');
    } catch (err) {
      contenedor.innerHTML = '<p style="color:red;">Error al cargar revistas.</p>';
    }
  };

  window.eliminarRevista = async function(id, portadaUrl, pdfUrl) {
    if (!confirm('¿Seguro que deseas eliminar esta revista y su PDF?')) return;
    try {
      await borrarArchivoDeStorage(portadaUrl);
      await borrarArchivoDeStorage(pdfUrl);
      const { error } = await db.from('revistas').delete().eq('id', id);
      if (error) throw error;
      document.getElementById(`rev-${id}`)?.remove();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  // ===================================================
  // 7. SECCIÓN SEDES: GUARDAR Y LISTAR/BORRAR
  // ===================================================
  const formSede = document.getElementById('formSede');
  const msgSede = document.getElementById('msgSede');
  const btnGuardarSede = document.getElementById('btnGuardarSede');

  if (formSede) {
    formSede.addEventListener('submit', async (e) => {
      e.preventDefault();
      btnGuardarSede.disabled = true;
      btnGuardarSede.textContent = 'Guardando sede...';
      msgSede.textContent = '';

      try {
        const { error } = await db.from('sedes').insert([{
          nombre: document.getElementById('sedeNombre').value.trim(),
          direccion: document.getElementById('sedeDireccion').value.trim(),
          horarios: document.getElementById('sedeHorarios').value.trim(),
          telefono: document.getElementById('sedeTelefono').value.trim()
        }]);

        if (error) throw error;

        msgSede.className = 'alert-box success';
        msgSede.textContent = '✓ Sede registrada con éxito.';
        formSede.reset();
        cargarSedes();
      } catch (err) {
        msgSede.className = 'alert-box error';
        msgSede.textContent = 'Error: ' + (err.message || err);
      } finally {
        btnGuardarSede.disabled = false;
        btnGuardarSede.textContent = 'Registrar Sede';
      }
    });
  }

  window.cargarSedes = async function() {
    const contenedor = document.getElementById('listaSedesAdmin');
    if (!contenedor) return;
    contenedor.innerHTML = '<p class="text-muted">Cargando...</p>';

    try {
      const { data, error } = await db.from('sedes').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      if (!data || data.length === 0) {
        contenedor.innerHTML = '<p class="text-muted">No hay sedes registradas.</p>';
        return;
      }

      contenedor.innerHTML = data.map(item => `
        <div class="admin-item-row" id="sede-${item.id}">
          <div class="admin-item-info">
            <h4>📍 ${item.nombre}</h4>
            <small>${item.direccion} | Horarios: ${item.horarios} ${item.telefono ? '| Tel: ' + item.telefono : ''}</small>
          </div>
          <button type="button" class="btn-delete" onclick="eliminarSede(${item.id})">🗑️ Eliminar</button>
        </div>
      `).join('');
    } catch (err) {
      contenedor.innerHTML = '<p style="color:red;">Error al cargar sedes.</p>';
    }
  };

  window.eliminarSede = async function(id) {
    if (!confirm('¿Deseas eliminar esta sede?')) return;
    try {
      const { error } = await db.from('sedes').delete().eq('id', id);
      if (error) throw error;
      document.getElementById(`sede-${id}`)?.remove();
    } catch (err) {
      alert('Error al eliminar sede: ' + err.message);
    }
  };

  // ===================================================
  // 8. SECCIÓN LÍDERES: GUARDAR Y LISTAR/BORRAR
  // ===================================================
  const formLider = document.getElementById('formLider');
  const msgLider = document.getElementById('msgLider');
  const btnGuardarLider = document.getElementById('btnGuardarLider');

  if (formLider) {
    formLider.addEventListener('submit', async (e) => {
      e.preventDefault();
      btnGuardarLider.disabled = true;
      btnGuardarLider.textContent = 'Subiendo fotografía...';
      msgLider.textContent = '';

      try {
        const file = document.getElementById('liderFoto').files[0];
        if (!file) throw new Error('Selecciona la fotografía del pastor o líder.');

        const fotoUrl = await subirArchivo(file, 'lideres');

        const { error } = await db.from('lideres').insert([{
          nombre: document.getElementById('liderNombre').value.trim(),
          cargo: document.getElementById('liderCargo').value.trim(),
          orden: parseInt(document.getElementById('liderOrden').value, 10) || 1,
          foto_url: fotoUrl
        }]);

        if (error) throw error;

        msgLider.className = 'alert-box success';
        msgLider.textContent = '✓ Pastor / Líder guardado y agregado al carrusel.';
        formLider.reset();
        cargarLideres();
      } catch (err) {
        msgLider.className = 'alert-box error';
        msgLider.textContent = 'Error: ' + (err.message || err);
      } finally {
        btnGuardarLider.disabled = false;
        btnGuardarLider.textContent = 'Registrar Líder';
      }
    });
  }

  window.cargarLideres = async function() {
    const contenedor = document.getElementById('listaLideresAdmin');
    if (!contenedor) return;
    contenedor.innerHTML = '<p class="text-muted">Cargando pastores...</p>';

    try {
      const { data, error } = await db.from('lideres').select('*').order('orden', { ascending: true });
      if (error) throw error;

      if (!data || data.length === 0) {
        contenedor.innerHTML = '<p class="text-muted">Aún no hay pastores registrados.</p>';
        return;
      }

      contenedor.innerHTML = data.map(item => `
        <div class="admin-item-row" id="lid-${item.id}">
          <img src="${item.foto_url || 'https://via.placeholder.com/70'}" class="admin-thumb" alt="${item.nombre}">
          <div class="admin-item-info">
            <h4>${item.nombre}</h4>
            <small><strong>Cargo:</strong> ${item.cargo} | <strong>Orden en carrusel:</strong> #${item.orden}</small>
          </div>
          <button type="button" class="btn-delete" onclick="eliminarLider(${item.id}, '${item.foto_url}')">🗑️ Eliminar</button>
        </div>
      `).join('');
    } catch (err) {
      contenedor.innerHTML = '<p style="color:red;">Error al cargar líderes.</p>';
    }
  };

  window.eliminarLider = async function(id, fotoUrl) {
    if (!confirm('¿Seguro que deseas eliminar a este pastor/líder del carrusel?')) return;
    try {
      await borrarArchivoDeStorage(fotoUrl);
      const { error } = await db.from('lideres').delete().eq('id', id);
      if (error) throw error;
      document.getElementById(`lid-${id}`)?.remove();
    } catch (err) {
      alert('Error al eliminar líder: ' + err.message);
    }
  };

  // Carga inicial automática de la primera pestaña
  cargarArticulos();
});