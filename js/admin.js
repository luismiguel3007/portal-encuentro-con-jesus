// js/admin.js

document.addEventListener('DOMContentLoaded', async () => {
  // =========================================================================
  // 1. VERIFICAR AUTENTICACIÓN Y EXIGIR SEGUNDO FACTOR ESTRICTO (AAL2)
  // =========================================================================
  const sessionStatus = document.getElementById('sessionStatus');
  const btnLogout = document.getElementById('btnLogout');
  const adminMain = document.querySelector('.admin-container');

  try {
    const { data: { session }, error } = await db.auth.getSession();
    
    if (error || !session) {
      window.location.replace('login.html');
      return;
    }

    // Comprobación de seguridad: El nivel de autenticación debe ser AAL2 (Contraseña + TOTP)
    const { data: aal, error: aalError } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError || !aal || aal.currentLevel !== 'aal2') {
      console.warn('Acceso revocado: Sesión no verificada con segundo factor (AAL2).');
      await db.auth.signOut();
      window.location.replace('login.html');
      return;
    }

    if (sessionStatus) {
      sessionStatus.textContent = `Conectado (MFA Activo 🛡️): ${session.user.email}`;
      sessionStatus.style.backgroundColor = '#dcfce7';
      sessionStatus.style.color = '#15803d';
    }

    if (adminMain) {
      adminMain.style.display = 'block';
    }

  } catch (err) {
    console.error('Error al comprobar sesión o segundo factor:', err);
    window.location.replace('login.html');
    return;
  }

  // =========================================================================
  // 2. CERRAR SESIÓN
  // =========================================================================
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await db.auth.signOut();
      window.location.href = 'login.html';
    });
  }

  // =========================================================================
  // 3. CAMBIO DE PESTAÑAS (TABS)
  // =========================================================================
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

      if (targetId === 'tab-articulos') cargarArticulos();
      if (targetId === 'tab-revistas') cargarRevistas();
      if (targetId === 'tab-sedes') cargarSedes();
      if (targetId === 'tab-lideres') cargarLideres();
      if (targetId === 'tab-miembros') cargarMiembros();
      if (targetId === 'tab-transmisiones') cargarTransmisiones();
      if (targetId === 'tab-literatura') cargarLiteraturaAdmin();
      if (targetId === 'tab-mensajes') cargarMensajesAdmin();
      if (targetId === 'tab-cronograma') cargarEventosAdmin();
    });
  });

  // =========================================================================
  // 4. SUBIDA Y ELIMINACIÓN DE ARCHIVOS EN CLOUDFLARE R2 CON JWT DE SUPABASE
  // =========================================================================
  async function subirArchivo(archivo, carpeta) {
    const { data: { session } } = await db.auth.getSession();
    if (!session || !session.access_token) {
      throw new Error('Sesión caducada o no autorizada. Por favor vuelve a iniciar sesión.');
    }

    const ext = archivo.name.split('.').pop();
    const cleanName = `${carpeta}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const res = await fetch(`${window.R2_CONFIG.workerUrl}/upload?key=${encodeURIComponent(cleanName)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': archivo.type || 'application/octet-stream',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: archivo
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al subir archivo a Cloudflare R2.');
    }

    return `${window.R2_CONFIG.publicUrl}/${cleanName}`;
  }

  async function borrarArchivoDeStorage(url) {
    if (!url || !url.includes(window.R2_CONFIG.publicUrl)) return;
    try {
      const { data: { session } } = await db.auth.getSession();
      if (!session || !session.access_token) return;

      const cleanKey = url.replace(`${window.R2_CONFIG.publicUrl}/`, '');
      await fetch(`${window.R2_CONFIG.workerUrl}/delete?key=${encodeURIComponent(cleanKey)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
    } catch (e) {
      console.warn('No se pudo borrar el archivo de Cloudflare R2:', e);
    }
  }

  // =========================================================================
  // 5. SECCIÓN ARTÍCULOS: REGISTRO Y EDICIÓN COMPLETA
  // =========================================================================
  let listaArticulosCache = [];
  const formArticulo = document.getElementById('formArticulo');
  const msgArticulo = document.getElementById('msgArticulo');
  const btnGuardarArt = document.getElementById('btnGuardarArt');
  const btnCancelarArt = document.getElementById('btnCancelarArt');
  const artEditId = document.getElementById('artEditId');
  const artExistingImg = document.getElementById('artExistingImg');
  const artFotoHelp = document.getElementById('artFotoHelp');
  const titleFormArt = document.getElementById('titleFormArt');

  if (btnCancelarArt) {
    btnCancelarArt.addEventListener('click', () => {
      formArticulo.reset();
      if (artEditId) artEditId.value = '';
      if (artExistingImg) artExistingImg.value = '';
      if (btnGuardarArt) btnGuardarArt.textContent = 'Publicar Artículo';
      btnCancelarArt.style.display = 'none';
      if (artFotoHelp) artFotoHelp.style.display = 'none';
      if (titleFormArt) titleFormArt.textContent = 'Publicar Nuevo Artículo o Devocional';
      if (msgArticulo) msgArticulo.textContent = '';
    });
  }

  if (formArticulo) {
    formArticulo.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = artEditId ? artEditId.value : '';
      if (btnGuardarArt) {
        btnGuardarArt.disabled = true;
        btnGuardarArt.textContent = editId ? 'Actualizando artículo...' : 'Subiendo y guardando...';
      }
      if (msgArticulo) msgArticulo.textContent = '';

      try {
        const file = document.getElementById('artFoto').files[0];
        let fotoUrl = artExistingImg ? artExistingImg.value : '';

        if (!editId && !file) {
          throw new Error('Selecciona una fotografía.');
        }

        if (file) {
          fotoUrl = await subirArchivo(file, 'articulos');
        }

        const articuloData = {
          titulo: document.getElementById('artTitulo').value.trim(),
          categoria: document.getElementById('artCategoria').value,
          resumen: document.getElementById('artResumen').value.trim(),
          contenido: document.getElementById('artContenido').value.trim(),
          imagen_url: fotoUrl
        };

        if (editId) {
          const { error } = await db.from('articulos').update(articuloData).eq('id', editId);
          if (error) throw error;
          if (msgArticulo) {
            msgArticulo.className = 'alert-box success';
            msgArticulo.textContent = '✓ Artículo actualizado con éxito.';
          }
          if (btnCancelarArt) btnCancelarArt.click();
        } else {
          const { error } = await db.from('articulos').insert([articuloData]);
          if (error) throw error;
          if (msgArticulo) {
            msgArticulo.className = 'alert-box success';
            msgArticulo.textContent = '✓ Artículo publicado con éxito.';
          }
          formArticulo.reset();
        }

        cargarArticulos();
        actualizarKPIs();
      } catch (err) {
        if (msgArticulo) {
          msgArticulo.className = 'alert-box error';
          msgArticulo.textContent = 'Error: ' + (err.message || err);
        } else {
          alert('Error: ' + (err.message || err));
        }
      } finally {
        if (btnGuardarArt) {
          btnGuardarArt.disabled = false;
          btnGuardarArt.textContent = (artEditId && artEditId.value) ? 'Actualizar Artículo' : 'Publicar Artículo';
        }
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

      listaArticulosCache = data || [];

      if (listaArticulosCache.length === 0) {
        contenedor.innerHTML = '<p class="text-muted">No hay artículos registrados.</p>';
        return;
      }

      contenedor.innerHTML = listaArticulosCache.map(item => `
        <div class="admin-item-row" id="art-${item.id}">
          <img src="${item.imagen_url || 'https://via.placeholder.com/70'}" class="admin-thumb" alt="foto">
          <div class="admin-item-info">
            <span class="badge-cat-sm">${item.categoria || 'General'}</span>
            <h4>${item.titulo}</h4>
            <small>${new Date(item.created_at).toLocaleDateString()} — ${item.resumen ? item.resumen.substring(0, 60) + '...' : ''}</small>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <button type="button" class="btn-secondary btn-sm" onclick="editarArticulo(${item.id})">✏️ Editar</button>
            <button type="button" class="btn-delete" onclick="eliminarArticulo(${item.id}, '${item.imagen_url}')">🗑️ Eliminar</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      contenedor.innerHTML = '<p style="color:red;">Error al cargar artículos.</p>';
    }
  };

  window.editarArticulo = function(id) {
    const item = listaArticulosCache.find(a => a.id === id);
    if (!item) return;

    if (artEditId) artEditId.value = item.id;
    if (artExistingImg) artExistingImg.value = item.imagen_url || '';
    document.getElementById('artTitulo').value = item.titulo || '';
    document.getElementById('artCategoria').value = item.categoria || '';
    document.getElementById('artResumen').value = item.resumen || '';
    document.getElementById('artContenido').value = item.contenido || '';

    if (btnGuardarArt) btnGuardarArt.textContent = 'Actualizar Artículo';
    if (btnCancelarArt) btnCancelarArt.style.display = 'inline-block';
    if (artFotoHelp) artFotoHelp.style.display = 'block';
    if (titleFormArt) titleFormArt.textContent = 'Editar Artículo / Devocional';
    formArticulo.scrollIntoView({ behavior: 'smooth' });
  };

  window.eliminarArticulo = async function(id, imgUrl) {
    if (!confirm('¿Seguro que deseas eliminar este artículo permanentemente?')) return;
    try {
      await borrarArchivoDeStorage(imgUrl);
      const { error } = await db.from('articulos').delete().eq('id', id);
      if (error) throw error;
      document.getElementById(`art-${id}`)?.remove();
      actualizarKPIs();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  // =========================================================================
  // 6. SECCIÓN REVISTAS: REGISTRO Y EDICIÓN COMPLETA
  // =========================================================================
  let listaRevistasCache = [];
  const formRevista = document.getElementById('formRevista');
  const msgRevista = document.getElementById('msgRevista');
  const btnGuardarRev = document.getElementById('btnGuardarRev');
  const btnCancelarRev = document.getElementById('btnCancelarRev');
  const revEditId = document.getElementById('revEditId');
  const revExistingPortada = document.getElementById('revExistingPortada');
  const revExistingPdf = document.getElementById('revExistingPdf');
  const revPortadaHelp = document.getElementById('revPortadaHelp');
  const revPdfHelp = document.getElementById('revPdfHelp');
  const titleFormRev = document.getElementById('titleFormRev');

  if (btnCancelarRev) {
    btnCancelarRev.addEventListener('click', () => {
      formRevista.reset();
      if (revEditId) revEditId.value = '';
      if (revExistingPortada) revExistingPortada.value = '';
      if (revExistingPdf) revExistingPdf.value = '';
      if (btnGuardarRev) btnGuardarRev.textContent = 'Guardar Revista';
      btnCancelarRev.style.display = 'none';
      if (revPortadaHelp) revPortadaHelp.style.display = 'none';
      if (revPdfHelp) revPdfHelp.style.display = 'none';
      if (titleFormRev) titleFormRev.textContent = 'Registrar Nueva Revista Digital';
      if (msgRevista) msgRevista.textContent = '';
    });
  }

  if (formRevista) {
    formRevista.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = revEditId ? revEditId.value : '';
      if (btnGuardarRev) {
        btnGuardarRev.disabled = true;
        btnGuardarRev.textContent = editId ? 'Actualizando revista...' : 'Subiendo archivos...';
      }
      if (msgRevista) msgRevista.textContent = '';

      try {
        const filePortada = document.getElementById('revPortada').files[0];
        const filePdf = document.getElementById('revPdf').files[0];

        let portadaUrl = revExistingPortada ? revExistingPortada.value : '';
        let pdfUrl = revExistingPdf ? revExistingPdf.value : '';

        if (!editId && (!filePortada || !filePdf)) {
          throw new Error('Debes subir la foto y el PDF.');
        }

        if (filePortada) {
          portadaUrl = await subirArchivo(filePortada, 'revistas/portadas');
        }
        if (filePdf) {
          pdfUrl = await subirArchivo(filePdf, 'revistas/pdf');
        }

        const revistaData = {
          edicion: document.getElementById('revEdicion').value.trim(),
          fecha: document.getElementById('revFecha').value,
          portada_url: portadaUrl,
          pdf_url: pdfUrl
        };

        if (editId) {
          const { error } = await db.from('revistas').update(revistaData).eq('id', editId);
          if (error) throw error;
          if (msgRevista) {
            msgRevista.className = 'alert-box success';
            msgRevista.textContent = '✓ Revista actualizada con éxito.';
          }
          if (btnCancelarRev) btnCancelarRev.click();
        } else {
          const { error } = await db.from('revistas').insert([revistaData]);
          if (error) throw error;
          if (msgRevista) {
            msgRevista.className = 'alert-box success';
            msgRevista.textContent = '✓ Revista publicada con éxito.';
          }
          formRevista.reset();
        }

        cargarRevistas();
        actualizarKPIs();
      } catch (err) {
        if (msgRevista) {
          msgRevista.className = 'alert-box error';
          msgRevista.textContent = 'Error: ' + (err.message || err);
        } else {
          alert('Error: ' + (err.message || err));
        }
      } finally {
        if (btnGuardarRev) {
          btnGuardarRev.disabled = false;
          btnGuardarRev.textContent = (revEditId && revEditId.value) ? 'Actualizar Revista' : 'Guardar Revista';
        }
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

      listaRevistasCache = data || [];

      if (listaRevistasCache.length === 0) {
        contenedor.innerHTML = '<p class="text-muted">No hay revistas registradas.</p>';
        return;
      }

      contenedor.innerHTML = listaRevistasCache.map(item => `
        <div class="admin-item-row" id="rev-${item.id}">
          <img src="${item.portada_url || 'https://via.placeholder.com/70'}" class="admin-thumb" alt="portada">
          <div class="admin-item-info">
            <h4>${item.edicion}</h4>
            <small>Fecha: ${item.fecha} — <a href="${item.pdf_url}" target="_blank" style="color:#0b192c; font-weight:bold;">Ver PDF</a></small>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <button type="button" class="btn-secondary btn-sm" onclick="editarRevista(${item.id})">✏️ Editar</button>
            <button type="button" class="btn-delete" onclick="eliminarRevista(${item.id}, '${item.portada_url}', '${item.pdf_url}')">🗑️ Eliminar</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      contenedor.innerHTML = '<p style="color:red;">Error al cargar revistas.</p>';
    }
  };

  window.editarRevista = function(id) {
    const item = listaRevistasCache.find(r => r.id === id);
    if (!item) return;

    if (revEditId) revEditId.value = item.id;
    if (revExistingPortada) revExistingPortada.value = item.portada_url || '';
    if (revExistingPdf) revExistingPdf.value = item.pdf_url || '';
    document.getElementById('revEdicion').value = item.edicion || '';
    document.getElementById('revFecha').value = item.fecha || '';

    if (btnGuardarRev) btnGuardarRev.textContent = 'Actualizar Revista';
    if (btnCancelarRev) btnCancelarRev.style.display = 'inline-block';
    if (revPortadaHelp) revPortadaHelp.style.display = 'block';
    if (revPdfHelp) revPdfHelp.style.display = 'block';
    if (titleFormRev) titleFormRev.textContent = 'Editar Revista Digital';
    formRevista.scrollIntoView({ behavior: 'smooth' });
  };

  window.eliminarRevista = async function(id, portadaUrl, pdfUrl) {
    if (!confirm('¿Seguro que deseas eliminar esta revista y su PDF?')) return;
    try {
      await borrarArchivoDeStorage(portadaUrl);
      await borrarArchivoDeStorage(pdfUrl);
      const { error } = await db.from('revistas').delete().eq('id', id);
      if (error) throw error;
      document.getElementById(`rev-${id}`)?.remove();
      actualizarKPIs();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  // =========================================================================
  // 7. SECCIÓN SEDES: REGISTRO Y EDICIÓN COMPLETA
  // =========================================================================
  let listaSedesCache = [];
  const formSede = document.getElementById('formSede');
  const msgSede = document.getElementById('msgSede');
  const btnGuardarSede = document.getElementById('btnGuardarSede');
  const btnCancelarSede = document.getElementById('btnCancelarSede');
  const sedeEditId = document.getElementById('sedeEditId');
  const titleFormSede = document.getElementById('titleFormSede');

  if (btnCancelarSede) {
    btnCancelarSede.addEventListener('click', () => {
      formSede.reset();
      if (sedeEditId) sedeEditId.value = '';
      if (btnGuardarSede) btnGuardarSede.textContent = 'Registrar Sede';
      btnCancelarSede.style.display = 'none';
      if (titleFormSede) titleFormSede.textContent = 'Agregar Nueva Sede o Filial';
      if (msgSede) msgSede.textContent = '';
    });
  }

  if (formSede) {
    formSede.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = sedeEditId ? sedeEditId.value : '';
      if (btnGuardarSede) {
        btnGuardarSede.disabled = true;
        btnGuardarSede.textContent = editId ? 'Actualizando sede...' : 'Guardando sede...';
      }
      if (msgSede) msgSede.textContent = '';

      try {
        const sedeData = {
          nombre: document.getElementById('sedeNombre').value.trim(),
          direccion: document.getElementById('sedeDireccion').value.trim(),
          horarios: document.getElementById('sedeHorarios').value.trim(),
          telefono: document.getElementById('sedeTelefono').value.trim()
        };

        if (editId) {
          const { error } = await db.from('sedes').update(sedeData).eq('id', editId);
          if (error) throw error;
          if (msgSede) {
            msgSede.className = 'alert-box success';
            msgSede.textContent = '✓ Sede actualizada con éxito.';
          }
          if (btnCancelarSede) btnCancelarSede.click();
        } else {
          const { error } = await db.from('sedes').insert([sedeData]);
          if (error) throw error;
          if (msgSede) {
            msgSede.className = 'alert-box success';
            msgSede.textContent = '✓ Sede registrada con éxito.';
          }
          formSede.reset();
        }

        cargarSedes();
        actualizarKPIs();
      } catch (err) {
        if (msgSede) {
          msgSede.className = 'alert-box error';
          msgSede.textContent = 'Error: ' + (err.message || err);
        } else {
          alert('Error: ' + (err.message || err));
        }
      } finally {
        if (btnGuardarSede) {
          btnGuardarSede.disabled = false;
          btnGuardarSede.textContent = (sedeEditId && sedeEditId.value) ? 'Actualizar Sede' : 'Registrar Sede';
        }
      }
    });
  }

  window.cargarSedes = async function() {
    const contenedor = document.getElementById('listaSedesAdmin');
    if (!contenedor) return;
    contenedor.innerHTML = '<p class="text-muted">Cargando sedes...</p>';

    try {
      const { data, error } = await db.from('sedes').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      listaSedesCache = data || [];

      if (listaSedesCache.length === 0) {
        contenedor.innerHTML = '<p class="text-muted">No hay sedes registradas.</p>';
        return;
      }

      contenedor.innerHTML = listaSedesCache.map(item => `
        <div class="admin-item-row" id="sede-${item.id}">
          <div class="admin-item-info">
            <h4>📍 ${item.nombre}</h4>
            <small>${item.direccion} | Horarios: ${item.horarios} ${item.telefono ? '| Tel: ' + item.telefono : ''}</small>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <button type="button" class="btn-secondary btn-sm" onclick="editarSede(${item.id})">✏️ Editar</button>
            <button type="button" class="btn-delete" onclick="eliminarSede(${item.id})">🗑️ Eliminar</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      contenedor.innerHTML = '<p style="color:red;">Error al cargar sedes.</p>';
    }
  };

  window.editarSede = function(id) {
    const item = listaSedesCache.find(s => s.id === id);
    if (!item) return;

    if (sedeEditId) sedeEditId.value = item.id;
    document.getElementById('sedeNombre').value = item.nombre || '';
    document.getElementById('sedeDireccion').value = item.direccion || '';
    document.getElementById('sedeHorarios').value = item.horarios || '';
    document.getElementById('sedeTelefono').value = item.telefono || '';

    if (btnGuardarSede) btnGuardarSede.textContent = 'Actualizar Sede';
    if (btnCancelarSede) btnCancelarSede.style.display = 'inline-block';
    if (titleFormSede) titleFormSede.textContent = 'Editar Sede o Filial';
    formSede.scrollIntoView({ behavior: 'smooth' });
  };

  window.eliminarSede = async function(id) {
    if (!confirm('¿Deseas eliminar esta sede?')) return;
    try {
      const { error } = await db.from('sedes').delete().eq('id', id);
      if (error) throw error;
      document.getElementById(`sede-${id}`)?.remove();
      actualizarKPIs();
    } catch (err) {
      alert('Error al eliminar sede: ' + err.message);
    }
  };

  // =========================================================================
  // 8. SECCIÓN LÍDERES: REGISTRO Y EDICIÓN COMPLETA
  // =========================================================================
  let listaLideresCache = [];
  const formLider = document.getElementById('formLider');
  const msgLider = document.getElementById('msgLider');
  const btnGuardarLider = document.getElementById('btnGuardarLider');
  const btnCancelarLider = document.getElementById('btnCancelarLider');
  const liderEditId = document.getElementById('liderEditId');
  const liderExistingFoto = document.getElementById('liderExistingFoto');
  const liderFotoHelp = document.getElementById('liderFotoHelp');
  const titleFormLider = document.getElementById('titleFormLider');

  if (btnCancelarLider) {
    btnCancelarLider.addEventListener('click', () => {
      formLider.reset();
      if (liderEditId) liderEditId.value = '';
      if (liderExistingFoto) liderExistingFoto.value = '';
      const liderOrdenEl = document.getElementById('liderOrden');
      if (liderOrdenEl) liderOrdenEl.value = '1';
      if (btnGuardarLider) btnGuardarLider.textContent = 'Registrar Líder';
      btnCancelarLider.style.display = 'none';
      if (liderFotoHelp) liderFotoHelp.style.display = 'none';
      if (titleFormLider) titleFormLider.textContent = 'Registrar Pastor o Líder';
      if (msgLider) msgLider.textContent = '';
    });
  }

  if (formLider) {
    formLider.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = liderEditId ? liderEditId.value : '';
      if (btnGuardarLider) {
        btnGuardarLider.disabled = true;
        btnGuardarLider.textContent = editId ? 'Actualizando pastor...' : 'Subiendo fotografía...';
      }
      if (msgLider) msgLider.textContent = '';

      try {
        const file = document.getElementById('liderFoto').files[0];
        let fotoUrl = liderExistingFoto ? liderExistingFoto.value : '';

        if (!editId && !file) {
          throw new Error('Selecciona la fotografía del pastor o líder.');
        }

        if (file) {
          fotoUrl = await subirArchivo(file, 'lideres');
        }

        const liderData = {
          nombre: document.getElementById('liderNombre').value.trim(),
          cargo: document.getElementById('liderCargo').value.trim(),
          orden: parseInt(document.getElementById('liderOrden').value, 10) || 1,
          foto_url: fotoUrl
        };

        if (editId) {
          const { error } = await db.from('lideres').update(liderData).eq('id', editId);
          if (error) throw error;
          if (msgLider) {
            msgLider.className = 'alert-box success';
            msgLider.textContent = '✓ Pastor / Líder actualizado con éxito.';
          }
          if (btnCancelarLider) btnCancelarLider.click();
        } else {
          const { error } = await db.from('lideres').insert([liderData]);
          if (error) throw error;
          if (msgLider) {
            msgLider.className = 'alert-box success';
            msgLider.textContent = '✓ Pastor / Líder guardado y agregado al carrusel.';
          }
          formLider.reset();
          const liderOrdenEl = document.getElementById('liderOrden');
          if (liderOrdenEl) liderOrdenEl.value = '1';
        }

        cargarLideres();
        actualizarKPIs();
      } catch (err) {
        if (msgLider) {
          msgLider.className = 'alert-box error';
          msgLider.textContent = 'Error: ' + (err.message || err);
        } else {
          alert('Error: ' + (err.message || err));
        }
      } finally {
        if (btnGuardarLider) {
          btnGuardarLider.disabled = false;
          btnGuardarLider.textContent = (liderEditId && liderEditId.value) ? 'Actualizar Líder' : 'Registrar Líder';
        }
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

      listaLideresCache = data || [];

      if (listaLideresCache.length === 0) {
        contenedor.innerHTML = '<p class="text-muted">Aún no hay pastores registrados.</p>';
        return;
      }

      contenedor.innerHTML = listaLideresCache.map(item => `
        <div class="admin-item-row" id="lid-${item.id}">
          <img src="${item.foto_url || 'https://via.placeholder.com/70'}" class="admin-thumb" alt="${item.nombre}">
          <div class="admin-item-info">
            <h4>${item.nombre}</h4>
            <small><strong>Cargo:</strong> ${item.cargo} | <strong>Orden en carrusel:</strong> #${item.orden}</small>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <button type="button" class="btn-secondary btn-sm" onclick="editarLider(${item.id})">✏️ Editar</button>
            <button type="button" class="btn-delete" onclick="eliminarLider(${item.id}, '${item.foto_url}')">🗑️ Eliminar</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      contenedor.innerHTML = '<p style="color:red;">Error al cargar líderes.</p>';
    }
  };

  window.editarLider = function(id) {
    const item = listaLideresCache.find(l => l.id === id);
    if (!item) return;

    if (liderEditId) liderEditId.value = item.id;
    if (liderExistingFoto) liderExistingFoto.value = item.foto_url || '';
    document.getElementById('liderNombre').value = item.nombre || '';
    document.getElementById('liderCargo').value = item.cargo || '';
    document.getElementById('liderOrden').value = item.orden || 1;

    if (btnGuardarLider) btnGuardarLider.textContent = 'Actualizar Líder';
    if (btnCancelarLider) btnCancelarLider.style.display = 'inline-block';
    if (liderFotoHelp) liderFotoHelp.style.display = 'block';
    if (titleFormLider) titleFormLider.textContent = 'Editar Pastor o Líder';
    formLider.scrollIntoView({ behavior: 'smooth' });
  };

  window.eliminarLider = async function(id, fotoUrl) {
    if (!confirm('¿Seguro que deseas eliminar a este pastor/líder del carrusel?')) return;
    try {
      await borrarArchivoDeStorage(fotoUrl);
      const { error } = await db.from('lideres').delete().eq('id', id);
      if (error) throw error;
      document.getElementById(`lid-${id}`)?.remove();
      actualizarKPIs();
    } catch (err) {
      alert('Error al eliminar líder: ' + err.message);
    }
  };

  // =========================================================================
  // 9. SECCIÓN MEMBRESÍA: REGISTRO Y EDICIÓN COMPLETA
  // =========================================================================
  let listaMiembrosCache = [];
  const formMiembro = document.getElementById('formMiembro');
  const msgMiembro = document.getElementById('msgMiembro');
  const btnGuardarMiembro = document.getElementById('btnGuardarMiembro');
  const btnCancelarEditMiembro = document.getElementById('btnCancelarMiembro') || document.getElementById('btnCancelarEditMiembro');
  const miembroEditId = document.getElementById('miembroEditId');
  const btnGenerarCodigo = document.getElementById('btnGenerarCodigo');
  const mFechaNac = document.getElementById('mFechaNac');
  const mEdad = document.getElementById('mEdad');
  const mFechaReg = document.getElementById('mFechaReg');
  const mEsPublico = document.getElementById('mEsPublico');
  const lblEsPublico = document.getElementById('lblEsPublico');
  const titleFormMiembro = document.getElementById('titleFormMiembro');

  if (mFechaReg && !mFechaReg.value) {
    mFechaReg.value = new Date().toISOString().split('T')[0];
  }

  if (mEsPublico && lblEsPublico) {
    mEsPublico.addEventListener('change', () => {
      if (mEsPublico.checked) {
        lblEsPublico.textContent = '🌐 Miembro Público (Aparecerá en el portal web)';
        lblEsPublico.style.color = '#15803d';
      } else {
        lblEsPublico.textContent = '🔒 Miembro Privado (Oculto totalmente en la web)';
        lblEsPublico.style.color = '#b91c1c';
      }
    });
  }

  if (mFechaNac && mEdad) {
    mFechaNac.addEventListener('change', () => {
      if (!mFechaNac.value) {
        mEdad.value = '';
        return;
      }
      const fechaNac = new Date(mFechaNac.value);
      const hoy = new Date();
      let edad = hoy.getFullYear() - fechaNac.getFullYear();
      const mes = hoy.getMonth() - fechaNac.getMonth();
      if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
        edad--;
      }
      mEdad.value = edad >= 0 ? edad : 0;
    });
  }

  if (btnGenerarCodigo) {
    btnGenerarCodigo.addEventListener('click', async () => {
      try {
        const { count, error } = await db.from('miembros').select('*', { count: 'exact', head: true });
        const correlativo = (count || 0) + 1;
        const randomPad = Math.floor(100 + Math.random() * 900);
        document.getElementById('mCodigo').value = `${correlativo}${randomPad}M26`;
      } catch (e) {
        const fallbackNum = Math.floor(1000 + Math.random() * 9000);
        document.getElementById('mCodigo').value = `${fallbackNum}M26`;
      }
    });
  }

  if (btnCancelarEditMiembro) {
    btnCancelarEditMiembro.addEventListener('click', () => {
      formMiembro.reset();
      if (miembroEditId) miembroEditId.value = '';
      if (btnGuardarMiembro) btnGuardarMiembro.textContent = 'Registrar Miembro';
      btnCancelarEditMiembro.style.display = 'none';
      if (titleFormMiembro) titleFormMiembro.textContent = 'Registro & Ficha de Membresía';
      if (mFechaReg) mFechaReg.value = new Date().toISOString().split('T')[0];
      if (mEsPublico) {
        mEsPublico.checked = true;
        if (lblEsPublico) {
          lblEsPublico.textContent = '🌐 Miembro Público (Aparecerá en el portal web)';
          lblEsPublico.style.color = '#15803d';
        }
      }
      if (msgMiembro) msgMiembro.textContent = '';
    });
  }

  if (formMiembro) {
    formMiembro.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editandoId = miembroEditId ? miembroEditId.value : '';

      if (btnGuardarMiembro) {
        btnGuardarMiembro.disabled = true;
        btnGuardarMiembro.textContent = editandoId ? 'Actualizando datos...' : 'Registrando miembro...';
      }
      if (msgMiembro) msgMiembro.textContent = '';

      const visibilidad = {
        nombre: document.getElementById('pub_nombre')?.checked ?? true,
        dni: document.getElementById('pub_dni')?.checked ?? false,
        codigo: document.getElementById('pub_codigo')?.checked ?? true,
        estado: document.getElementById('pub_estado')?.checked ?? true,
        grado_espiritual: document.getElementById('pub_grado_espiritual')?.checked ?? true,
        sexo: document.getElementById('pub_sexo')?.checked ?? false,
        estado_civil: document.getElementById('pub_estado_civil')?.checked ?? false,
        bautismo: document.getElementById('pub_bautismo')?.checked ?? false,
        matrimonio: document.getElementById('pub_matrimonio')?.checked ?? false,
        santa_cena: document.getElementById('pub_santa_cena')?.checked ?? false,
        lavamiento_pies: document.getElementById('pub_lavamiento_pies')?.checked ?? false,
        fecha_nacimiento: document.getElementById('pub_fecha_nacimiento')?.checked ?? false,
        edad: document.getElementById('pub_edad')?.checked ?? false,
        fecha_registro: document.getElementById('pub_fecha_registro')?.checked ?? true,
        fecha_conversion: document.getElementById('pub_fecha_conversion')?.checked ?? false,
        zona: document.getElementById('pub_zona')?.checked ?? true,
        direccion: document.getElementById('pub_direccion')?.checked ?? false
      };

      try {
        let codigoVal = document.getElementById('mCodigo').value.trim();
        if (!codigoVal) {
          codigoVal = `${Math.floor(1000 + Math.random() * 9000)}M26`;
        }

        const datosMiembro = {
          codigo: codigoVal,
          nombre: document.getElementById('mNombre').value.trim(),
          dni: document.getElementById('mDni').value.trim(),
          estado: document.getElementById('mEstado').value,
          grado_espiritual: document.getElementById('mGrado').value,
          sexo: document.getElementById('mSexo').value,
          estado_civil: document.getElementById('mEstadoCivil').value,
          bautismo: document.getElementById('mBautismo').checked,
          matrimonio: document.getElementById('mMatrimonio').checked,
          santa_cena: document.getElementById('mSantaCena').checked,
          lavamiento_pies: document.getElementById('mLavamientoPies').checked,
          fecha_nacimiento: document.getElementById('mFechaNac').value || null,
          edad: parseInt(document.getElementById('mEdad').value, 10) || null,
          fecha_registro: document.getElementById('mFechaReg').value || null,
          fecha_conversion: document.getElementById('mFechaConv').value || null,
          zona: document.getElementById('mZona').value.trim(),
          direccion: document.getElementById('mDireccion').value.trim(),
          es_publico: document.getElementById('mEsPublico')?.checked ?? true,
          visibilidad: visibilidad
        };

        if (editandoId) {
          const { error } = await db.from('miembros').update(datosMiembro).eq('id', editandoId);
          if (error) throw error;
          if (msgMiembro) {
            msgMiembro.className = 'alert-box success';
            msgMiembro.textContent = `✓ Miembro "${datosMiembro.nombre}" actualizado con éxito.`;
          }
          if (btnCancelarEditMiembro) btnCancelarEditMiembro.click();
        } else {
          const { error } = await db.from('miembros').insert([datosMiembro]);
          if (error) throw error;
          if (msgMiembro) {
            msgMiembro.className = 'alert-box success';
            msgMiembro.textContent = `✓ Miembro registrado con éxito. Código asignado: ${datosMiembro.codigo}`;
          }
          formMiembro.reset();
          if (mFechaReg) mFechaReg.value = new Date().toISOString().split('T')[0];
        }

        cargarMiembros();
        actualizarKPIs();
      } catch (err) {
        if (msgMiembro) {
          msgMiembro.className = 'alert-box error';
          msgMiembro.textContent = 'Error: ' + (err.message || err);
        } else {
          alert('Error: ' + (err.message || err));
        }
      } finally {
        if (btnGuardarMiembro) {
          btnGuardarMiembro.disabled = false;
          btnGuardarMiembro.textContent = (miembroEditId && miembroEditId.value) ? 'Actualizar Miembro' : 'Registrar Miembro';
        }
      }
    });
  }

  window.cargarMiembros = async function() {
    const contenedor = document.getElementById('listaMiembrosAdmin');
    if (!contenedor) return;
    contenedor.innerHTML = '<p class="text-muted">Cargando padrón de miembros...</p>';

    try {
      const { data, error } = await db.from('miembros').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      listaMiembrosCache = data || [];
      renderizarListaMiembros(listaMiembrosCache);
    } catch (err) {
      contenedor.innerHTML = '<p style="color:red;">Error al cargar miembros.</p>';
    }
  };

  function renderizarListaMiembros(lista) {
    const contenedor = document.getElementById('listaMiembrosAdmin');
    if (!contenedor) return;

    if (!lista || lista.length === 0) {
      contenedor.innerHTML = '<p class="text-muted">No hay miembros registrados en el padrón.</p>';
      return;
    }

    contenedor.innerHTML = lista.map(m => `
      <div class="admin-item-row" id="mb-${m.id}" style="align-items: flex-start;">
        <div class="admin-item-info" style="flex: 1;">
          <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px; flex-wrap:wrap;">
            <span class="badge-cat-sm" style="background:#0b192c; color:#e5a823; font-weight:bold;">${m.codigo}</span>
            <span class="badge-cat-sm">${m.estado}</span>
            <span class="badge-cat-sm" style="background:#f1f5f9; color:#334155;">${m.grado_espiritual}</span>
            <span class="badge-cat-sm" style="background:${m.es_publico !== false ? '#dcfce7; color:#166534;' : '#fee2e2; color:#991b1b;'}">
              ${m.es_publico !== false ? '🌐 Público' : '🔒 Privado'}
            </span>
          </div>
          
          <h4 class="member-name-click" onclick="verFichaAdmin(${m.id})" title="Ver ficha completa de ${m.nombre}">
            ${m.nombre} 
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--admin-gold);"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          </h4>

          <small style="color: #64748b; display: block; line-height: 1.5; margin-top: 4px;">
            DNI: ${m.dni || 'N/A'} | Zona: ${m.zona || 'N/A'} | Bautismo: ${m.bautismo ? 'Sí' : 'No'} | Santa Cena: ${m.santa_cena ? 'Sí' : 'No'}<br>
            Dirección: ${m.direccion || 'Sin registrar'}
          </small>
        </div>
        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
          <button type="button" class="btn-secondary btn-sm" onclick="editarMiembro(${m.id})">✏️ Editar</button>
          <button type="button" class="btn-secondary btn-sm" onclick="toggleVisibilidadMiembro(${m.id}, ${!(m.es_publico !== false)})">
            ${m.es_publico !== false ? '🔒 Privado' : '🌐 Público'}
          </button>
          <button type="button" class="btn-delete" onclick="eliminarMiembro(${m.id})">🗑️ Eliminar</button>
        </div>
      </div>
    `).join('');
  }

  window.verFichaAdmin = function(id) {
    const m = listaMiembrosCache.find(x => x.id === id);
    if (!m) return;

    const modal = document.getElementById('modalFichaAdmin');
    const fCodigo = document.getElementById('fAdminCodigo');
    const fNombre = document.getElementById('fAdminNombre');
    const boxPersonales = document.getElementById('fAdminPersonales');
    const boxEclesiasticos = document.getElementById('fAdminEclesiasticos');
    const boxOrdenanzas = document.getElementById('fAdminOrdenanzas');
    const boxUbicacion = document.getElementById('fAdminUbicacion');
    const btnEditarDesdeFicha = document.getElementById('btnEditarDesdeFicha');

    if (fCodigo) fCodigo.textContent = m.codigo || 'SIN CÓDIGO';
    if (fNombre) fNombre.textContent = m.nombre || 'Miembro';

    let edadCalculada = m.edad;
    if (!edadCalculada && m.fecha_nacimiento) {
      const fNac = new Date(m.fecha_nacimiento);
      if (!isNaN(fNac.getTime())) {
        const hoy = new Date();
        let edad = hoy.getFullYear() - fNac.getFullYear();
        const mes = hoy.getMonth() - fNac.getMonth();
        if (mes < 0 || (mes === 0 && hoy.getDate() < fNac.getDate())) edad--;
        edadCalculada = edad >= 0 ? `${edad} años` : 'N/A';
      }
    } else if (edadCalculada) {
      edadCalculada = `${edadCalculada} años`;
    } else {
      edadCalculada = 'No registrada';
    }

    if (boxPersonales) {
      boxPersonales.innerHTML = `
        <div class="ficha-item"><strong>Documento DNI</strong><span>${m.dni || 'N/A'}</span></div>
        <div class="ficha-item"><strong>Fecha de Nacimiento</strong><span>${m.fecha_nacimiento || 'No registrada'}</span></div>
        <div class="ficha-item"><strong>Edad</strong><span>${edadCalculada}</span></div>
        <div class="ficha-item"><strong>Sexo</strong><span>${m.sexo || 'N/A'}</span></div>
        <div class="ficha-item"><strong>Estado Civil</strong><span>${m.estado_civil || 'N/A'}</span></div>
      `;
    }

    if (boxEclesiasticos) {
      boxEclesiasticos.innerHTML = `
        <div class="ficha-item"><strong>Estado Congregacional</strong><span>${m.estado || 'Activo'}</span></div>
        <div class="ficha-item"><strong>Grado Espiritual</strong><span>${m.grado_espiritual || 'Creyente'}</span></div>
        <div class="ficha-item"><strong>Fecha de Registro</strong><span>${m.fecha_registro || 'No registrada'}</span></div>
        <div class="ficha-item"><strong>Fecha de Conversión</strong><span>${m.fecha_conversion || 'No registrada'}</span></div>
      `;
    }

    if (boxOrdenanzas) {
      boxOrdenanzas.innerHTML = `
        <div class="ficha-item"><strong>Bautismo en Agua</strong><span>${m.bautismo ? '✅ Conforme' : '❌ No'}</span></div>
        <div class="ficha-item"><strong>Santa Cena</strong><span>${m.santa_cena ? '✅ Participa' : '❌ No'}</span></div>
        <div class="ficha-item"><strong>Lavamiento de Pies</strong><span>${m.lavamiento_pies ? '✅ Sí' : '❌ No'}</span></div>
        <div class="ficha-item"><strong>Matrimonio Eclesiástico</strong><span>${m.matrimonio ? '✅ Conforme' : '❌ No'}</span></div>
      `;
    }

    if (boxUbicacion) {
      boxUbicacion.innerHTML = `
        <div class="ficha-item"><strong>Sede / Zona</strong><span>${m.zona || 'Sin asignar'}</span></div>
        <div class="ficha-item" style="grid-column: 1 / -1;"><strong>Dirección Domiciliaria</strong><span>${m.direccion || 'Sin registrar'}</span></div>
        <div class="ficha-item"><strong>Visibilidad en Web</strong><span>${m.es_publico !== false ? '🌐 Miembro Público' : '🔒 Miembro Privado'}</span></div>
      `;
    }

    if (btnEditarDesdeFicha) {
      btnEditarDesdeFicha.onclick = () => {
        if (modal) modal.style.display = 'none';
        editarMiembro(m.id);
      };
    }

    if (modal) modal.style.display = 'flex';
  };

  const modalFicha = document.getElementById('modalFichaAdmin');
  const btnCerrarModal = document.getElementById('btnCerrarFichaAdmin');
  const btnCerrarModalFooter = document.getElementById('btnCerrarFichaAdminFooter');

  const cerrarModal = () => { if (modalFicha) modalFicha.style.display = 'none'; };
  if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarModal);
  if (btnCerrarModalFooter) btnCerrarModalFooter.addEventListener('click', cerrarModal);
  if (modalFicha) {
    modalFicha.addEventListener('click', (e) => {
      if (e.target === modalFicha) cerrarModal();
    });
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalFicha && modalFicha.style.display === 'flex') {
      cerrarModal();
    }
  });

  window.editarMiembro = function(id) {
    const m = listaMiembrosCache.find(x => x.id === id);
    if (!m) return;

    if (miembroEditId) miembroEditId.value = m.id;
    document.getElementById('mNombre').value = m.nombre || '';
    document.getElementById('mDni').value = m.dni || '';
    document.getElementById('mCodigo').value = m.codigo || '';
    document.getElementById('mEstado').value = m.estado || 'Activo';
    document.getElementById('mGrado').value = m.grado_espiritual || 'Creyente';
    document.getElementById('mSexo').value = m.sexo || 'Masculino';
    document.getElementById('mEstadoCivil').value = m.estado_civil || 'Soltero(a)';
    document.getElementById('mBautismo').checked = Boolean(m.bautismo);
    document.getElementById('mMatrimonio').checked = Boolean(m.matrimonio);
    document.getElementById('mSantaCena').checked = Boolean(m.santa_cena);
    document.getElementById('mLavamientoPies').checked = Boolean(m.lavamiento_pies);
    document.getElementById('mFechaNac').value = m.fecha_nacimiento || '';
    document.getElementById('mEdad').value = m.edad || '';
    document.getElementById('mFechaReg').value = m.fecha_registro || '';
    document.getElementById('mFechaConv').value = m.fecha_conversion || '';
    document.getElementById('mZona').value = m.zona || '';
    document.getElementById('mDireccion').value = m.direccion || '';

    const esPub = m.es_publico !== false;
    if (mEsPublico) mEsPublico.checked = esPub;
    if (lblEsPublico) {
      lblEsPublico.textContent = esPub ? '🌐 Miembro Público (Aparecerá en el portal web)' : '🔒 Miembro Privado (Oculto totalmente en la web)';
      lblEsPublico.style.color = esPub ? '#15803d' : '#b91c1c';
    }

    const vis = m.visibilidad || {};
    const setCheck = (idCheck, val) => {
      const el = document.getElementById(idCheck);
      if (el) el.checked = Boolean(val);
    };

    setCheck('pub_nombre', vis.nombre ?? true);
    setCheck('pub_dni', vis.dni ?? false);
    setCheck('pub_codigo', vis.codigo ?? true);
    setCheck('pub_estado', vis.estado ?? true);
    setCheck('pub_grado_espiritual', vis.grado_espiritual ?? true);
    setCheck('pub_sexo', vis.sexo ?? false);
    setCheck('pub_estado_civil', vis.estado_civil ?? false);
    setCheck('pub_bautismo', vis.bautismo ?? false);
    setCheck('pub_matrimonio', vis.matrimonio ?? false);
    setCheck('pub_santa_cena', vis.santa_cena ?? false);
    setCheck('pub_lavamiento_pies', vis.lavamiento_pies ?? false);
    setCheck('pub_fecha_nacimiento', vis.fecha_nacimiento ?? false);
    setCheck('pub_edad', vis.edad ?? false);
    setCheck('pub_fecha_registro', vis.fecha_registro ?? true);
    setCheck('pub_fecha_conversion', vis.fecha_conversion ?? false);
    setCheck('pub_zona', vis.zona ?? true);
    setCheck('pub_direccion', vis.direccion ?? false);

    if (btnGuardarMiembro) btnGuardarMiembro.textContent = 'Actualizar Miembro';
    if (btnCancelarEditMiembro) btnCancelarEditMiembro.style.display = 'inline-block';
    if (titleFormMiembro) titleFormMiembro.textContent = 'Editar Registro de Membresía';
    formMiembro.scrollIntoView({ behavior: 'smooth' });
  };

  window.toggleVisibilidadMiembro = async function(id, nuevoEstado) {
    try {
      const { error } = await db.from('miembros').update({ es_publico: nuevoEstado }).eq('id', id);
      if (error) throw error;
      cargarMiembros();
    } catch (err) {
      alert('Error al actualizar visibilidad: ' + err.message);
    }
  };

  window.eliminarMiembro = async function(id) {
    if (!confirm('¿Seguro que deseas eliminar a este miembro del padrón?')) return;
    try {
      const { error } = await db.from('miembros').delete().eq('id', id);
      if (error) throw error;
      document.getElementById(`mb-${id}`)?.remove();
      actualizarKPIs();
    } catch (err) {
      alert('Error al eliminar miembro: ' + err.message);
    }
  };

  const buscarInput = document.getElementById('buscarMiembroInput');
  if (buscarInput) {
    buscarInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      const filtrados = listaMiembrosCache.filter(m => 
        (m.nombre && m.nombre.toLowerCase().includes(query)) ||
        (m.dni && m.dni.includes(query)) ||
        (m.codigo && m.codigo.toLowerCase().includes(query))
      );
      renderizarListaMiembros(filtrados);
    });
  }

  // =========================================================================
  // 10. SECCIÓN TRANSMISIONES EN VIVO (FACEBOOK / OBS)
  // =========================================================================
  let listaTransmisionesCache = [];
  const formTransmision = document.getElementById('formTransmision');
  const msgTransmision = document.getElementById('msgTransmision');
  const btnGuardarTrans = document.getElementById('btnGuardarTrans');
  const btnCancelarTrans = document.getElementById('btnCancelarTrans');
  const transmisionEditId = document.getElementById('transmisionEditId');
  const btnCopiarClaveObs = document.getElementById('btnCopiarClaveObs');
  const titleFormTransmision = document.getElementById('titleFormTransmision');

  if (btnCopiarClaveObs) {
    btnCopiarClaveObs.addEventListener('click', () => {
      const clave = document.getElementById('transClaveObs').value.trim();
      if (!clave) {
        alert('No hay ninguna clave escrita.');
        return;
      }
      navigator.clipboard.writeText(clave);
      btnCopiarClaveObs.textContent = '✓ ¡Copiada!';
      setTimeout(() => btnCopiarClaveObs.textContent = '📋 Copiar Clave', 2000);
    });
  }

  if (btnCancelarTrans) {
    btnCancelarTrans.addEventListener('click', () => {
      formTransmision.reset();
      if (transmisionEditId) transmisionEditId.value = '';
      if (btnGuardarTrans) btnGuardarTrans.textContent = 'Guardar Señal';
      btnCancelarTrans.style.display = 'none';
      if (titleFormTransmision) titleFormTransmision.textContent = 'Configurar Transmisión en Directo (Facebook / OBS)';
      if (msgTransmision) msgTransmision.textContent = '';
    });
  }

  if (formTransmision) {
    formTransmision.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = transmisionEditId ? transmisionEditId.value : '';
      const esActiva = document.getElementById('transActiva').value === 'true';

      if (btnGuardarTrans) {
        btnGuardarTrans.disabled = true;
        btnGuardarTrans.textContent = editId ? 'Actualizando señal...' : 'Guardando señal...';
      }
      if (msgTransmision) msgTransmision.textContent = '';

      try {
        if (esActiva) {
          await db.from('transmisiones_en_vivo').update({ activa: false }).neq('id', 0);
        }

        const dataTrans = {
          titulo: document.getElementById('transTitulo').value.trim(),
          url: document.getElementById('transUrl').value.trim(),
          clave_obs: document.getElementById('transClaveObs').value.trim(),
          activa: esActiva
        };

        if (editId) {
          const { error } = await db.from('transmisiones_en_vivo').update(dataTrans).eq('id', editId);
          if (error) throw error;
          if (msgTransmision) {
            msgTransmision.className = 'alert-box success';
            msgTransmision.textContent = '✓ Transmisión actualizada con éxito.';
          }
          if (btnCancelarTrans) btnCancelarTrans.click();
        } else {
          const { error } = await db.from('transmisiones_en_vivo').insert([dataTrans]);
          if (error) throw error;
          if (msgTransmision) {
            msgTransmision.className = 'alert-box success';
            msgTransmision.textContent = '✓ Transmisión guardada con éxito.';
          }
          formTransmision.reset();
        }

        cargarTransmisiones();
        actualizarKPIs();
      } catch (err) {
        if (msgTransmision) {
          msgTransmision.className = 'alert-box error';
          msgTransmision.textContent = 'Error: ' + (err.message || err);
        } else {
          alert('Error: ' + (err.message || err));
        }
      } finally {
        if (btnGuardarTrans) {
          btnGuardarTrans.disabled = false;
          btnGuardarTrans.textContent = (transmisionEditId && transmisionEditId.value) ? 'Actualizar Señal' : 'Guardar Señal';
        }
      }
    });
  }

  window.cargarTransmisiones = async function() {
    const contenedor = document.getElementById('listaTransmisionesAdmin');
    if (!contenedor) return;
    contenedor.innerHTML = '<p class="text-muted">Cargando señales...</p>';

    try {
      const { data, error } = await db.from('transmisiones_en_vivo').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      listaTransmisionesCache = data || [];

      if (listaTransmisionesCache.length === 0) {
        contenedor.innerHTML = '<p class="text-muted">No hay transmisiones registradas aún.</p>';
        return;
      }

      contenedor.innerHTML = listaTransmisionesCache.map(t => {
        const esFb = t.url.includes('facebook.com') || t.url.includes('fb.watch');
        return `
          <div class="admin-item-row" id="trans-${t.id}" style="border-left: 5px solid ${t.activa ? '#10b981' : '#cbd5e1'};">
            <div class="admin-item-info" style="flex: 1;">
              <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px; flex-wrap:wrap;">
                <span class="badge-cat-sm" style="background:${esFb ? '#1877f2' : '#ff0000'}; color:#ffffff;">
                  ${esFb ? 'Facebook Live' : 'YouTube Live'}
                </span>
                <span class="badge-cat-sm" style="background:${t.activa ? '#dcfce7; color:#15803d;' : '#f1f5f9; color:#64748b;'}">
                  ${t.activa ? '🟢 REPRODUCIÉNDOSE EN WEB' : 'Inactiva'}
                </span>
              </div>
              <h4 style="margin: 2px 0;">${t.titulo}</h4>
              <small style="display:block; word-break:break-all; color:#475569;">
                <strong>Enlace:</strong> <a href="${t.url}" target="_blank" style="color:#0b192c;">${t.url}</a>
              </small>
              ${t.clave_obs ? `
                <small style="display:inline-block; margin-top:4px; background:#f8fafc; padding:3px 8px; border-radius:4px; border:1px solid #e2e8f0;">
                  <strong>Clave OBS:</strong> ${t.clave_obs}
                </small>
              ` : ''}
            </div>
            <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
              ${!t.activa ? `
                <button type="button" class="btn-primary btn-sm" onclick="activarTransmision(${t.id})">📡 Activar en Web</button>
              ` : ''}
              ${t.clave_obs ? `
                <button type="button" class="btn-secondary btn-sm" onclick="copiarTexto('${t.clave_obs}')">📋 Copiar OBS</button>
              ` : ''}
              <button type="button" class="btn-secondary btn-sm" onclick="editarTransmision(${t.id})">✏️ Editar</button>
              <button type="button" class="btn-delete" onclick="eliminarTransmision(${t.id})">🗑️ Eliminar</button>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      contenedor.innerHTML = '<p style="color:red;">Error al cargar transmisiones.</p>';
    }
  };

  window.activarTransmision = async function(id) {
    try {
      await db.from('transmisiones_en_vivo').update({ activa: false }).neq('id', 0);
      const { error } = await db.from('transmisiones_en_vivo').update({ activa: true }).eq('id', id);
      if (error) throw error;
      cargarTransmisiones();
    } catch (err) {
      alert('Error al activar transmisión: ' + err.message);
    }
  };

  window.copiarTexto = function(texto) {
    navigator.clipboard.writeText(texto);
    alert('✓ Clave de OBS copiada al portapapeles.');
  };

  window.editarTransmision = function(id) {
    const t = listaTransmisionesCache.find(x => x.id === id);
    if (!t) return;

    if (transmisionEditId) transmisionEditId.value = t.id;
    document.getElementById('transTitulo').value = t.titulo || '';
    document.getElementById('transUrl').value = t.url || '';
    document.getElementById('transClaveObs').value = t.clave_obs || '';
    document.getElementById('transActiva').value = t.activa ? 'true' : 'false';

    if (btnGuardarTrans) btnGuardarTrans.textContent = 'Actualizar Señal';
    if (btnCancelarTrans) btnCancelarTrans.style.display = 'inline-block';
    if (titleFormTransmision) titleFormTransmision.textContent = 'Editar Transmisión';
    formTransmision.scrollIntoView({ behavior: 'smooth' });
  };

  window.eliminarTransmision = async function(id) {
    if (!confirm('¿Deseas eliminar esta transmisión?')) return;
    try {
      const { error } = await db.from('transmisiones_en_vivo').delete().eq('id', id);
      if (error) throw error;
      document.getElementById(`trans-${id}`)?.remove();
      actualizarKPIs();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  // =========================================================================
  // 11. SECCIÓN LITERATURA: REGISTRO Y EDICIÓN COMPLETA (CORREGIDO)
  // =========================================================================
  let listaLiteraturaCache = [];
  const formLit = document.getElementById('formLiteratura');
  const msgLit = document.getElementById('msgLit');
  const btnGuardarLit = document.getElementById('btnGuardarLit');
  const btnCancelarLit = document.getElementById('btnCancelarLit');
  const litEditId = document.getElementById('litEditId');
  const litExistingPortada = document.getElementById('litExistingPortada');
  const litExistingPdf = document.getElementById('litExistingPdf');
  const litPortadaHelp = document.getElementById('litPortadaHelp');
  const litPdfHelp = document.getElementById('litPdfHelp');
  const titleFormLit = document.getElementById('titleFormLit');

  if (btnCancelarLit) {
    btnCancelarLit.addEventListener('click', () => {
      formLit.reset();
      if (litEditId) litEditId.value = '';
      if (litExistingPortada) litExistingPortada.value = '';
      if (litExistingPdf) litExistingPdf.value = '';
      if (btnGuardarLit) btnGuardarLit.textContent = 'Guardar Literatura';
      btnCancelarLit.style.display = 'none';
      if (litPortadaHelp) litPortadaHelp.style.display = 'none';
      if (litPdfHelp) litPdfHelp.style.display = 'none';
      if (titleFormLit) titleFormLit.textContent = 'Publicar Nuevo Libro o Estudio';
      if (msgLit) msgLit.textContent = '';
    });
  }

  if (formLit) {
    formLit.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = litEditId ? litEditId.value : '';
      if (btnGuardarLit) {
        btnGuardarLit.disabled = true;
        btnGuardarLit.textContent = editId ? 'Actualizando material...' : 'Subiendo a Cloudflare R2...';
      }
      if (msgLit) msgLit.textContent = '';

      try {
        const filePortada = document.getElementById('litPortada').files[0];
        const filePdf = document.getElementById('litPdf').files[0];

        let portadaUrl = litExistingPortada ? litExistingPortada.value : '';
        let pdfUrl = litExistingPdf ? litExistingPdf.value : '';

        if (!editId && (!filePortada || !filePdf)) {
          throw new Error('Debes seleccionar la fotografía de portada y el documento PDF.');
        }

        if (filePortada) {
          portadaUrl = await subirArchivo(filePortada, 'literatura/portadas');
        }
        if (filePdf) {
          pdfUrl = await subirArchivo(filePdf, 'literatura/pdf');
        }

        const litData = {
          titulo: document.getElementById('litTitulo').value.trim(),
          autor: document.getElementById('litAutor').value.trim(),
          categoria: document.getElementById('litCategoria').value,
          descripcion: document.getElementById('litDescripcion').value.trim(),
          portada_url: portadaUrl,
          archivo_url: pdfUrl
        };

        if (editId) {
          const { error } = await db.from('literatura').update(litData).eq('id', editId);
          if (error) throw error;
          if (msgLit) {
            msgLit.className = 'alert-box success';
            msgLit.textContent = '✓ Material actualizado con éxito.';
          }
          if (btnCancelarLit) btnCancelarLit.click();
        } else {
          const { error } = await db.from('literatura').insert([litData]);
          if (error) throw error;
          if (msgLit) {
            msgLit.className = 'alert-box success';
            msgLit.textContent = '✓ Material publicado con éxito.';
          }
          formLit.reset();
        }

        cargarLiteraturaAdmin();
        actualizarKPIs();
      } catch (err) {
        if (msgLit) {
          msgLit.className = 'alert-box error';
          msgLit.textContent = 'Error: ' + (err.message || err);
        } else {
          alert('Error: ' + (err.message || err));
        }
      } finally {
        if (btnGuardarLit) {
          btnGuardarLit.disabled = false;
          btnGuardarLit.textContent = (litEditId && litEditId.value) ? 'Actualizar Material' : 'Guardar Literatura';
        }
      }
    });
  }

  window.cargarLiteraturaAdmin = async function() {
    const contenedor = document.getElementById('listaLiteraturaAdmin');
    if (!contenedor) return;
    contenedor.innerHTML = '<p class="text-muted">Cargando biblioteca...</p>';

    try {
      const { data, error } = await db.from('literatura').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      listaLiteraturaCache = data || [];

      if (listaLiteraturaCache.length === 0) {
        contenedor.innerHTML = '<p class="text-muted">No hay libros ni estudios registrados.</p>';
        return;
      }

      contenedor.innerHTML = listaLiteraturaCache.map(item => `
        <div class="admin-item-row" id="lit-${item.id}">
          <img src="${item.portada_url || 'https://via.placeholder.com/70'}" class="admin-thumb" alt="portada">
          <div class="admin-item-info">
            <span class="badge-cat-sm">${item.categoria}</span>
            <h4>${item.titulo}</h4>
            <small>Autor: ${item.autor} — <a href="${item.archivo_url}" target="_blank" style="color:#0b192c; font-weight:bold;">Ver PDF</a></small>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <button type="button" class="btn-secondary btn-sm" onclick="editarLiteratura(${item.id})">✏️ Editar</button>
            <button type="button" class="btn-delete" onclick="eliminarLiteratura(${item.id}, '${item.portada_url}', '${item.archivo_url}')">🗑️ Eliminar</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      contenedor.innerHTML = '<p style="color:red;">Error al cargar literatura.</p>';
    }
  };

  window.editarLiteratura = function(id) {
    const item = listaLiteraturaCache.find(x => x.id === id);
    if (!item) return;

    if (litEditId) litEditId.value = item.id;
    if (litExistingPortada) litExistingPortada.value = item.portada_url || '';
    if (litExistingPdf) litExistingPdf.value = item.archivo_url || '';

    document.getElementById('litTitulo').value = item.titulo || '';
    document.getElementById('litAutor').value = item.autor || '';
    document.getElementById('litCategoria').value = item.categoria || '';
    document.getElementById('litDescripcion').value = item.descripcion || '';

    if (btnGuardarLit) btnGuardarLit.textContent = 'Actualizar Material';
    if (btnCancelarLit) btnCancelarLit.style.display = 'inline-block';
    if (litPortadaHelp) litPortadaHelp.style.display = 'block';
    if (litPdfHelp) litPdfHelp.style.display = 'block';
    if (titleFormLit) titleFormLit.textContent = 'Editar Libro o Estudio';
    formLit.scrollIntoView({ behavior: 'smooth' });
  };

  window.eliminarLiteratura = async function(id, portadaUrl, pdfUrl) {
    if (!confirm('¿Seguro que deseas eliminar este libro/estudio y sus archivos?')) return;
    try {
      await borrarArchivoDeStorage(portadaUrl);
      await borrarArchivoDeStorage(pdfUrl);
      const { error } = await db.from('literatura').delete().eq('id', id);
      if (error) throw error;
      document.getElementById(`lit-${id}`)?.remove();
      actualizarKPIs();
    } catch (err) {
      alert('Error al eliminar literatura: ' + err.message);
    }
  };

  // =========================================================================
  // 12. SECCIÓN MENSAJES Y PETICIONES (BUZÓN CONGREGACIONAL)
  // =========================================================================
  let listaMensajesCache = [];

  window.cargarMensajesAdmin = async function() {
    const contenedor = document.getElementById('listaMensajesAdmin');
    if (!contenedor) return;
    contenedor.innerHTML = '<p class="text-muted">Cargando mensajes recibidos...</p>';

    try {
      const { data, error } = await db
        .from('mensajes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      listaMensajesCache = data || [];
      const badge = document.getElementById('kpiMensajesBadge');
      if (badge) badge.textContent = listaMensajesCache.length;
      const kpi = document.getElementById('kpiMensajes');
      if (kpi) kpi.textContent = listaMensajesCache.length;

      renderizarListaMensajes(listaMensajesCache);
    } catch (err) {
      console.error('Error al cargar mensajes:', err);
      contenedor.innerHTML = '<p style="color:red;">Error al cargar mensajes: ' + err.message + '</p>';
    }
  };

  function renderizarListaMensajes(lista) {
    const contenedor = document.getElementById('listaMensajesAdmin');
    if (!contenedor) return;

    if (!lista || lista.length === 0) {
      contenedor.innerHTML = '<p class="text-muted">No hay mensajes ni peticiones en la bandeja.</p>';
      return;
    }

    contenedor.innerHTML = lista.map(msg => {
      const esEspiritual = msg.tipo === 'espiritual';
      const fecha = new Date(msg.created_at).toLocaleString('es-PE', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      return `
        <div class="admin-item-row" id="msg-${msg.id}" style="border-left: 5px solid ${esEspiritual ? '#e5a823' : '#0b192c'}; flex-direction: column; align-items: stretch; gap: 8px; padding: 1.2rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
            <div>
              <span class="badge-cat-sm" style="background:${esEspiritual ? '#fffbeb; color:#92400e; border:1px solid #fde68a;' : '#f1f5f9; color:#0b192c; border:1px solid #cbd5e1;'}">
                ${esEspiritual ? '🙏 Asunto Espiritual' : '📋 Secretaría / Consultas'}
              </span>
              <span class="badge-cat-sm" style="background:#0b192c; color:#e5a823; font-weight:700;">
                ${msg.motivo}
              </span>
            </div>
            <div style="display:flex; align-items:center; gap: 10px;">
              <small style="color: #64748b;">📅 ${fecha}</small>
              <button type="button" class="btn-delete" onclick="eliminarMensajeAdmin(${msg.id})">🗑️ Borrar</button>
            </div>
          </div>

          <h3 style="margin: 4px 0 2px 0; color: #0b192c; font-size: 1.05rem;">${msg.nombre}</h3>

          <div style="font-size: 0.84rem; color: #475569; display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 6px;">
            <span>📞 <strong>Teléfono:</strong> <a href="tel:${msg.telefono}" style="color:#0b192c; font-weight:700;">${msg.telefono}</a></span>
            ${msg.correo ? `<span>✉️ <strong>Correo:</strong> <a href="mailto:${msg.correo}" style="color:#0b192c;">${msg.correo}</a></span>` : ''}
            ${msg.direccion ? `<span>📍 <strong>Dirección:</strong> ${msg.direccion}</span>` : ''}
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; font-size: 0.92rem; color: #1e293b; line-height: 1.5; white-space: pre-wrap;">
            ${msg.mensaje}
          </div>
        </div>
      `;
    }).join('');
  }

  window.filtrarMensajesAdmin = function(tipo) {
    if (tipo === 'todos') {
      renderizarListaMensajes(listaMensajesCache);
    } else {
      const filtrados = listaMensajesCache.filter(m => m.tipo === tipo);
      renderizarListaMensajes(filtrados);
    }
  };

  window.eliminarMensajeAdmin = async function(id) {
    if (!confirm('¿Deseas eliminar este mensaje de la bandeja permanentemente?')) return;
    try {
      const { error } = await db.from('mensajes').delete().eq('id', id);
      if (error) throw error;

      document.getElementById(`msg-${id}`)?.remove();
      listaMensajesCache = listaMensajesCache.filter(m => m.id !== id);

      const badge = document.getElementById('kpiMensajesBadge');
      if (badge) badge.textContent = listaMensajesCache.length;
      const kpi = document.getElementById('kpiMensajes');
      if (kpi) kpi.textContent = listaMensajesCache.length;
    } catch (err) {
      alert('Error al borrar mensaje: ' + err.message);
    }
  };

  // =========================================================================
  // 13. SECCIÓN CRONOGRAMA & CARTELERA DE ACTIVIDADES
  // =========================================================================
  let listaEventosCache = [];
  const formEvento = document.getElementById('formEvento');
  const msgEvento = document.getElementById('msgEvento');
  const btnGuardarEvento = document.getElementById('btnGuardarEvento');
  const btnCancelarEvento = document.getElementById('btnCancelarEvento');
  const eventoEditId = document.getElementById('eventoEditId');
  const titleFormEvento = document.getElementById('titleFormEvento');

  if (btnCancelarEvento) {
    btnCancelarEvento.addEventListener('click', () => {
      formEvento.reset();
      if (eventoEditId) eventoEditId.value = '';
      if (btnGuardarEvento) btnGuardarEvento.textContent = 'Guardar en Cronograma';
      btnCancelarEvento.style.display = 'none';
      if (titleFormEvento) titleFormEvento.textContent = 'Programar Nuevo Evento o Actividad';
      if (msgEvento) msgEvento.textContent = '';
    });
  }

  if (formEvento) {
    formEvento.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = eventoEditId ? eventoEditId.value : '';
      if (btnGuardarEvento) {
        btnGuardarEvento.disabled = true;
        btnGuardarEvento.textContent = editId ? 'Actualizando...' : 'Guardando...';
      }
      if (msgEvento) msgEvento.textContent = '';

      try {
        const dataEv = {
          titulo: document.getElementById('evTitulo').value.trim(),
          categoria: document.getElementById('evCategoria').value,
          fecha: document.getElementById('evFecha').value,
          hora: document.getElementById('evHora').value.trim(),
          sede: document.getElementById('evSede').value.trim(),
          descripcion: document.getElementById('evDescripcion').value.trim()
        };

        if (editId) {
          const { error } = await db.from('eventos').update(dataEv).eq('id', editId);
          if (error) throw error;
          if (msgEvento) {
            msgEvento.className = 'alert-box success';
            msgEvento.textContent = '✓ Actividad actualizada con éxito.';
          }
          if (btnCancelarEvento) btnCancelarEvento.click();
        } else {
          const { error } = await db.from('eventos').insert([dataEv]);
          if (error) throw error;
          if (msgEvento) {
            msgEvento.className = 'alert-box success';
            msgEvento.textContent = '✓ Actividad incorporada a la cartelera.';
          }
          formEvento.reset();
        }

        cargarEventosAdmin();
        actualizarKPIs();
      } catch (err) {
        if (msgEvento) {
          msgEvento.className = 'alert-box error';
          msgEvento.textContent = 'Error: ' + (err.message || err);
        } else {
          alert('Error: ' + (err.message || err));
        }
      } finally {
        if (btnGuardarEvento) {
          btnGuardarEvento.disabled = false;
          btnGuardarEvento.textContent = (eventoEditId && eventoEditId.value) ? 'Actualizar Actividad' : 'Guardar en Cronograma';
        }
      }
    });
  }

  window.cargarEventosAdmin = async function() {
    const contenedor = document.getElementById('listaEventosAdmin');
    if (!contenedor) return;
    contenedor.innerHTML = '<p class="text-muted">Cargando actividades...</p>';

    try {
      const { data, error } = await db
        .from('eventos')
        .select('*')
        .order('fecha', { ascending: true });

      if (error) throw error;
      listaEventosCache = data || [];

      if (listaEventosCache.length === 0) {
        contenedor.innerHTML = '<p class="text-muted">No hay actividades programadas en la cartelera.</p>';
        return;
      }

      contenedor.innerHTML = listaEventosCache.map(ev => `
        <div class="admin-item-row" id="ev-${ev.id}">
          <div class="admin-item-info" style="flex: 1;">
            <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px; flex-wrap:wrap;">
              <span class="badge-cat-sm" style="background:#0b192c; color:#e5a823; font-weight:bold;">${ev.categoria}</span>
              <span class="badge-cat-sm" style="background:#f1f5f9; color:#334155;">📍 ${ev.sede}</span>
            </div>
            <h4>${ev.titulo}</h4>
            <small style="color:#64748b;">
              📅 <strong>Fecha:</strong> ${ev.fecha} ${ev.hora ? `&bull; ⏰ <strong>Hora:</strong> ${ev.hora}` : ''}
              ${ev.descripcion ? `<br>${ev.descripcion}` : ''}
            </small>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <button type="button" class="btn-secondary btn-sm" onclick="editarEventoAdmin(${ev.id})">✏️ Editar</button>
            <button type="button" class="btn-delete" onclick="eliminarEventoAdmin(${ev.id})">🗑️ Eliminar</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      contenedor.innerHTML = '<p style="color:red;">Error al cargar cronograma: ' + err.message + '</p>';
    }
  };

  window.editarEventoAdmin = function(id) {
    const ev = listaEventosCache.find(x => x.id === id);
    if (!ev) return;

    if (eventoEditId) eventoEditId.value = ev.id;
    document.getElementById('evTitulo').value = ev.titulo || '';
    document.getElementById('evCategoria').value = ev.categoria || '';
    document.getElementById('evFecha').value = ev.fecha || '';
    document.getElementById('evHora').value = ev.hora || '';
    document.getElementById('evSede').value = ev.sede || '';
    document.getElementById('evDescripcion').value = ev.descripcion || '';

    if (btnGuardarEvento) btnGuardarEvento.textContent = 'Actualizar Actividad';
    if (btnCancelarEvento) btnCancelarEvento.style.display = 'inline-block';
    if (titleFormEvento) titleFormEvento.textContent = 'Editar Actividad Programada';
    formEvento.scrollIntoView({ behavior: 'smooth' });
  };

  window.eliminarEventoAdmin = async function(id) {
    if (!confirm('¿Deseas eliminar este evento del cronograma?')) return;
    try {
      const { error } = await db.from('eventos').delete().eq('id', id);
      if (error) throw error;
      document.getElementById(`ev-${id}`)?.remove();
      actualizarKPIs();
    } catch (err) {
      alert('Error al eliminar evento: ' + err.message);
    }
  };

  // =========================================================================
  // 14. CARGA DE CONTADORES (KPIS) Y PRIMERA VISTA
  // =========================================================================
  async function actualizarKPIs() {
    try {
      const [art, rev, sed, lid, mie, tra, lit, msg, ev] = await Promise.all([
        db.from('articulos').select('*', { count: 'exact', head: true }),
        db.from('revistas').select('*', { count: 'exact', head: true }),
        db.from('sedes').select('*', { count: 'exact', head: true }),
        db.from('lideres').select('*', { count: 'exact', head: true }),
        db.from('miembros').select('*', { count: 'exact', head: true }),
        db.from('transmisiones_en_vivo').select('*', { count: 'exact', head: true }),
        db.from('literatura').select('*', { count: 'exact', head: true }),
        db.from('mensajes').select('*', { count: 'exact', head: true }),
        db.from('eventos').select('*', { count: 'exact', head: true })
      ]);

      const setVal = (id, count) => {
        const el = document.getElementById(id);
        if (el) el.textContent = count !== null ? count : 0;
      };

      setVal('kpiArticulos', art.count);
      setVal('kpiRevistas', rev.count);
      setVal('kpiSedes', sed.count);
      setVal('kpiLideres', lid.count);
      setVal('kpiMiembros', mie.count);
      setVal('kpiTransmisiones', tra ? tra.count : 0);
      setVal('kpiLiteratura', lit ? lit.count : 0);
      setVal('kpiMensajes', msg ? msg.count : 0);
      setVal('kpiEventos', ev ? ev.count : 0);

      const badgeMsg = document.getElementById('kpiMensajesBadge');
      if (badgeMsg) badgeMsg.textContent = msg ? (msg.count ?? 0) : 0;
    } catch (e) {
      console.warn('Error calculando KPIs:', e);
    }
  }

  // Inicialización de la vista
  actualizarKPIs();
  cargarArticulos();
});