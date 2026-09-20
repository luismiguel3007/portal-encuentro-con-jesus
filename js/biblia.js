// js/biblia.js
// Lector Bíblico RVR1960, Versículos para Dirigir, Buscador Temático, Favoritos y Radio

document.addEventListener('DOMContentLoaded', () => {
  initMenuMovil();
  initModulosPestanas();
  initVersiculoDelDiaDirecto();
  initLectorBiblia();
  initLiturgiaCultos();
  initBuscadorBiblico();
  initFavoritosLocales();
  initRadioFlotante();
});

/* ===================================================
   1. CONTROL DE MENÚ MÓVIL Y PESTAÑAS PRINCIPALES
   =================================================== */
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

function initModulosPestanas() {
  const tabButtons = document.querySelectorAll('.bible-tab-btn[data-target]');
  const panels = document.querySelectorAll('.bible-module-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      tabButtons.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });
}

/* ===================================================
   2. VERSÍCULOS PARA DIRIGIR (ENSEÑANZA Y ORACIÓN)
   =================================================== */
const LITURGIA_DATA = {
  ensenanza: [
    {
      momento: "Inicio y Bienvenida",
      versiculos: [
        { r: "Salmos 122:1", t: "Yo me alegré con los que me decían: A la casa de Jehová iremos." },
        { r: "Salmos 100:4", t: "Entrad por sus puertas con acción de gracias, por sus atrios con alabanza; alabadle, bendecid su nombre." },
        { r: "Salmos 95:1-2", t: "Venid, aclamemos alegremente a Jehová; cantemos con júbilo a la roca de nuestra salvación." },
        { r: "Salmos 118:24", t: "Este es el día que hizo Jehová; nos gozaremos y alegraremos en él." },
        { r: "Salmos 133:1", t: "¡Mirad cuán bueno y cuán delicioso es habitar los hermanos juntos en armonía!" },
        { r: "Mateo 18:20", t: "Porque donde están dos o tres congregados en mi nombre, allí estoy yo en medio de ellos." },
        { r: "Salmos 84:10", t: "Porque mejor es un día en tus atrios que mil fuera de ellos." },
        { r: "Hebreos 10:25", t: "No dejando de congregarnos, como algunos tienen por costumbre, sino exhortándonos..." },
        { r: "Salmos 63:1-2", t: "Dios, Dios mío eres tú; de madrugada te buscaré; mi alma tiene sed de ti..." },
        { r: "Apocalipsis 1:3", t: "Bienaventurado el que lee, y los que oyen las palabras de esta profecía..." },
        { r: "Salmos 27:4", t: "Una cosa he demandado a Jehová, ésta buscaré; que esté yo en la casa de Jehová todos los días de mi vida." },
        { r: "Salmos 107:1-2", t: "Alabad a Jehová, porque él es bueno; porque para siempre es su misericordia. Díganlo los redimidos de Jehová." }
      ]
    },
    {
      momento: "Alabanzas Iniciales",
      versiculos: [
        { r: "Salmos 149:1", t: "Cantad a Jehová cántico nuevo; su alabanza sea en la congregación de los santos." },
        { r: "Salmos 150:6", t: "Todo lo que respira alabe a JAH. Aleluya." },
        { r: "Salmos 96:1-2", t: "Cantad a Jehová cántico nuevo; cantad a Jehová, toda la tierra. Bendecid su nombre; anunciad de día en día su salvación." },
        { r: "Salmos 34:1-3", t: "Bendeciré a Jehová en todo tiempo; su alabanza estará de continuo en mi boca. Engrandeced a Jehová conmigo..." },
        { r: "Salmos 66:1-2", t: "Aclamad a Dios con alegría, toda la tierra. Cantad la gloria de su nombre; poned gloria en su alabanza." },
        { r: "Salmos 103:1-2", t: "Bendice, alma mía, a Jehová, y bendiga todo mi ser su santo nombre. Y no olvides ninguno de sus beneficios." },
        { r: "Efesios 5:19", t: "Hablando entre vosotros con salmos, con himnos y cánticos espirituales, cantando y alabando al Señor en vuestros corazones." },
        { r: "Colosenses 3:16", t: "La palabra de Cristo more en abundancia en vosotros, enseñándoos y exhortándoos con salmos e himnos..." },
        { r: "Salmos 108:1", t: "Mi corazón está dispuesto, oh Dios; cantaré y entonaré salmos; esta es mi gloria." },
        { r: "Salmos 47:1", t: "Pueblos todos, batid las manos; aclamad a Dios con voz de júbilo." },
        { r: "Salmos 117:1-2", t: "Alabad a Jehová, naciones todas; pueblos todos, alabadle. Porque ha engrandecido sobre nosotros su misericordia." }
      ]
    },
    {
      momento: "Lectura de la Palabra",
      versiculos: [
        { r: "2 Timoteo 3:16-17", t: "Toda la Escritura es inspirada por Dios, y útil para enseñar, para redargüir, para corregir..." },
        { r: "Salmos 119:105", t: "Lámpara es a mis pies tu palabra, y lumbrera a mi camino." },
        { r: "Josué 1:8", t: "Nunca se apartará de tu boca este libro de la ley, sino que de día y de noche meditarás en él..." },
        { r: "Hebreos 4:12", t: "Porque la palabra de Dios es viva y eficaz, y más cortante que toda espada de dos filos..." },
        { r: "Isaías 55:10-11", t: "Así será mi palabra que sale de mi boca; no volverá a mí vacía, sino que hará lo que yo quiero..." },
        { r: "Salmos 19:7-8", t: "La ley de Jehová es perfecta, que convierte el alma; el testimonio de Jehová es fiel, que hace sabio al sencillo." },
        { r: "Juan 5:39", t: "Escudriñad las Escrituras; porque a vosotros os parece que en ellas tenéis la vida eterna; y ellas son las que dan testimonio de mí." },
        { r: "Santiago 1:22", t: "Pero sed hacedores de la palabra, y no tan solamente oidores, engañándoos a vosotros mismos." },
        { r: "Romanos 10:17", t: "Así que la fe es por el oír, y el oír, por la palabra de Dios." },
        { r: "Salmos 119:11", t: "En mi corazón he guardado tus dichos, para no pecar contra ti." },
        { r: "Mateo 4:4", t: "No sólo de pan vivirá el hombre, sino de toda palabra que sale de la boca de Dios." }
      ]
    },
    {
      momento: "Alabanzas Centrales",
      versiculos: [
        { r: "Salmos 40:3", t: "Puso luego en mi boca cántico nuevo, alabanza a nuestro Dios. Verán esto muchos, y temerán, y confiarán en Jehová." },
        { r: "Salmos 30:11-12", t: "Has cambiado mi lamento en baile; desataste mi cilicio, y me ceñiste de alegría. Para que cante gloria a ti..." },
        { r: "Salmos 71:23", t: "Mis labios se alegrarán cuando cante a ti, y mi alma, la cual redimiste." },
        { r: "Salmos 98:1", t: "Cantad a Jehová cántico nuevo, porque ha hecho maravillas; su diestra lo ha salvado, y su santo brazo." },
        { r: "Juan 4:23-24", t: "Mas la hora viene, y ahora es, cuando los verdaderos adoradores adorarán al Padre en espíritu y en verdad." },
        { r: "Salmos 89:1", t: "Las misericordias de Jehová cantaré perpetuamente; de generación en generación haré notoria tu fidelidad con mi boca." },
        { r: "Salmos 9:1-2", t: "Te alabaré, oh Jehová, con todo mi corazón; contaré todas tus maravillas. Me alegraré y me regocijaré en ti." },
        { r: "Éxodo 15:2", t: "Jehová es mi fortaleza y mi cántico, y ha sido mi salvación. Este es mi Dios, y lo alabaré." },
        { r: "Salmos 63:3-4", t: "Porque mejor es tu misericordia que la vida; mis labios te alabarán. Así te bendeciré en mi vida; en tu nombre alzaré mis manos." },
        { r: "Hechos 16:25", t: "Pero a medianoche, orando Pablo y Silas, cantaban himnos a Dios; y los presos los oían." }
      ]
    },
    {
      momento: "Prédica y Exhortación",
      versiculos: [
        { r: "2 Timoteo 4:2", t: "Que prediques la palabra; que instes a tiempo y fuera de tiempo; redarguye, reprende, exhorta con toda paciencia y doctrina." },
        { r: "1 Corintios 1:18", t: "Porque la palabra de la cruz es locura a los que se pierden; pero a los que se salvan, esto es, a nosotros, es poder de Dios." },
        { r: "Romanos 1:16", t: "Porque no me avergüenzo del evangelio, porque es poder de Dios para salvación a todo aquel que cree." },
        { r: "Hechos 4:12", t: "Y en ningún otro hay salvación; porque no hay otro nombre bajo el cielo, dado a los hombres, en que podamos ser salvos." },
        { r: "Hechos 20:27", t: "Porque no he rehuido anunciaros todo el consejo de Dios." },
        { r: "1 Pedro 4:11", t: "Si alguno habla, hable conforme a las palabras de Dios; si alguno ministra, ministre conforme al poder que Dios da." },
        { r: "Jeremías 23:29", t: "¿No es mi palabra como fuego, dice Jehová, y como martillo que quebranta la piedra?" },
        { r: "Marcos 16:15", t: "Y les dijo: Id por todo el mundo y predicad el evangelio a toda criatura." },
        { r: "Mateo 24:35", t: "El cielo y la tierra pasarán, pero mis palabras no pasarán." },
        { r: "Tito 2:1", t: "Pero tú habla lo que está de acuerdo con la sana doctrina." }
      ]
    },
    {
      momento: "Ofrendas y Consagración",
      versiculos: [
        { r: "Malaquías 3:10", t: "Traed todos los diezmos al alfolí y haya alimento en mi casa; y probadme ahora en esto, dice Jehová de los ejércitos..." },
        { r: "2 Corintios 9:7", t: "Cada uno dé como propuso en su corazón: no con tristeza, ni por necesidad, porque Dios ama al dador alegre." },
        { r: "Proverbios 3:9-10", t: "Honra a Jehová con tus bienes, y con las primicias de todos tus frutos; y serán llenos tus graneros con abundancia." },
        { r: "Lucas 6:38", t: "Dad, y se os dará; medida buena, apretada, remecida y rebosando darán en vuestro regazo." },
        { r: "1 Crónicas 29:14", t: "Porque ¿quién soy yo, y quién es mi pueblo, para que pudiésemos ofrecer voluntariamente cosas semejantes? Pues todo es tuyo..." },
        { r: "Salmos 96:8", t: "Dad a Jehová la honra debida a su nombre; traed ofrendas, y venid a sus atrios." },
        { r: "Deuteronomio 16:17", t: "Cada uno con la ofrenda de su mano, conforme a la bendición que Jehová tu Dios te hubiere dado." },
        { r: "Hechos 20:35", t: "Recordar las palabras del Señor Jesús, que dijo: Más bienaventurado es dar que recibir." },
        { r: "2 Corintios 9:6", t: "El que siembra escasamente, también segará escasamente; y el que siembra generosamente, generosamente también segará." },
        { r: "Mateo 6:20-21", t: "Sino haceos tesoros en el cielo... Porque donde esté vuestro tesoro, allí estará también vuestro corazón." }
      ]
    }
  ],
  oracion: [
    {
      momento: "Inicio y Clamor Inicial",
      versiculos: [
        { r: "Salmos 5:3", t: "Oh Jehová, de mañana oirás mi voz; de mañana me presentaré delante de ti, y esperaré." },
        { r: "Salmos 141:2", t: "Suba mi oración delante de ti como el incienso, el don de mis manos como la ofrenda de la tarde." },
        { r: "Jeremías 33:3", t: "Clama a mí, y yo te responderé, y te enseñaré cosas grandes y ocultas que tú no conoces." },
        { r: "Salmos 65:2", t: "Tú oyes la oración; a ti vendrá toda carne." },
        { r: "Salmos 27:8", t: "Mi corazón ha dicho de ti: Buscad mi rostro. Tu rostro buscaré, oh Jehová." },
        { r: "Salmos 86:6-7", t: "Escucha, oh Jehová, mi oración, y está atento a la voz de mis ruegos. En el día de mi angustia te llamaré, porque tú me respondes." },
        { r: "Isaías 56:7", t: "Mi casa será llamada casa de oración para todos los pueblos." },
        { r: "Mateo 6:6", t: "Mas tú, cuando ores, entra en tu aposento, y cerrada la puerta, ora a tu Padre que está en secreto." },
        { r: "Salmos 145:18", t: "Cercano está Jehová a todos los que le invocan, a todos los que le invocan de veras." },
        { r: "Salmos 102:17", t: "Habrá mirado a la oración de los desamparados, y no habrá desechado el ruego de ellos." }
      ]
    },
    {
      momento: "Alabanzas Iniciales",
      versiculos: [
        { r: "Salmos 22:3", t: "Pero tú eres santo, tú que habitas entre las alabanzas de Israel." },
        { r: "Salmos 147:1", t: "Alabad a JAH, porque es bueno cantar salmos a nuestro Dios; porque suave y hermosa es la alabanza." },
        { r: "Salmos 92:1-2", t: "Bueno es alabarte, oh Jehová, y cantar salmos a tu nombre, oh Altísimo; anunciar por la mañana tu misericordia." },
        { r: "Salmos 138:1-2", t: "Te alabaré con todo mi corazón; delante de los dioses te cantaré salmos. Me postraré hacia tu santo templo." },
        { r: "Salmos 146:1-2", t: "Alaba, oh alma mía, a Jehová. Alabaré a Jehová en mi vida; cantaré salmos a mi Dios mientras viva." },
        { r: "Salmos 59:16", t: "Pero yo cantaré de tu poder, y alabaré de mañana tu misericordia; porque has sido mi amparo y refugio en el día de mi angustia." },
        { r: "Salmos 113:3", t: "Desde el nacimiento del sol hasta donde se pone, sea alabado el nombre de Jehová." },
        { r: "Nehemías 9:5", t: "Levantaos, bendecid a Jehová vuestro Dios desde la eternidad hasta la eternidad; y bendígase el nombre tuyo, glorioso y alto." },
        { r: "Salmos 67:3", t: "Te alaben los pueblos, oh Dios; todos los pueblos te alaben." },
        { r: "Salmos 135:3", t: "Alabad a JAH, porque él es bueno; cantad salmos a su nombre, porque él es benigno." }
      ]
    },
    {
      momento: "Meditación de la Palabra",
      versiculos: [
        { r: "Salmos 1:1-3", t: "Bienaventurado el varón que no anduvo en consejo de malos... Sino que en la ley de Jehová está su delicia." },
        { r: "Salmos 119:148", t: "Se anticiparon mis ojos a las vigilias de la noche, para meditar en tus mandatos." },
        { r: "Filipenses 4:8", t: "Por lo demás, hermanos, todo lo que es verdadero, todo lo honesto, todo lo justo... en esto pensad." },
        { r: "Salmos 19:14", t: "Sean gratos los dichos de mi boca y la meditación de mi corazón delante de ti, oh Jehová, roca mía, y redentor mío." },
        { r: "Salmos 119:97", t: "¡Oh, cuánto amo yo tu ley! Todo el día es ella mi meditación." },
        { r: "Colosenses 3:2", t: "Poned la mira en las cosas de arriba, no en las de la tierra." },
        { r: "Proverbios 4:20-22", t: "Hijo mío, está atento a mis palabras; inclina tu oído a mis razones... porque son vida a los que las hallan." },
        { r: "Salmos 63:6", t: "Cuando me acuerde de ti en mi lecho, cuando medite en ti en las vigilias de la noche." },
        { r: "1 Timoteo 4:15", t: "Ocúpate en estas cosas; permanece en ellas, para que tu aprovechamiento sea manifiesto a todos." },
        { r: "Salmos 104:34", t: "Dulce será mi meditación en él; yo me regocijaré en Jehová." }
      ]
    },
    {
      momento: "Intercesión, Clamor y Oración",
      versiculos: [
        { r: "1 Tesalonicenses 5:17", t: "Orad sin cesar." },
        { r: "Filipenses 4:6", t: "Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias." },
        { r: "Santiago 5:16", t: "Confesaos vuestras ofensas unos a otros, y orad unos por otros, para que seáis sanados. La oración eficaz del justo puede mucho." },
        { r: "Efesios 6:18", t: "Orando en todo tiempo con toda oración y súplica en el Espíritu, y velando en ello con toda perseverancia y súplica por todos los santos." },
        { r: "1 Juan 5:14-15", t: "Y esta es la confianza que tenemos en él, que si pedimos alguna cosa conforme a su voluntad, él nos oye." },
        { r: "Mateo 7:7-8", t: "Pedid, y se os dará; buscad, y hallaréis; llamad, y se os abrirá. Porque todo aquel que pide, recibe..." },
        { r: "Hebreos 4:16", t: "Acerquémonos, pues, confiadamente al trono de la gracia, para alcanzar misericordia y hallar gracia para el oportuno socorro." },
        { r: "2 Crónicas 7:14", t: "Si se humillare mi pueblo, sobre el cual mi nombre es invocado, y oraren, y buscaren mi rostro, y se convirtieren... yo oiré desde los cielos." },
        { r: "Salmos 34:15", t: "Los ojos de Jehová están sobre los justos, y atentos sus oídos al clamor de ellos." },
        { r: "Salmos 107:19-20", t: "Pero clamaron a Jehová en su angustia, y los libró de sus aflicciones. Envió su palabra, y los sanó." }
      ]
    },
    {
      momento: "Alabanzas Centrales y Acción de Gracias",
      versiculos: [
        { r: "Salmos 100:1-3", t: "Cantad alegres a Dios, habitantes de toda la tierra. Servid a Jehová con alegría; venid ante su presencia con regocijo." },
        { r: "1 Crónicas 16:8-9", t: "Alabad a Jehová, invocad su nombre, dad a conocer en los pueblos sus obras. Cantad a él, cantadle salmos; hablad de todas sus maravillas." },
        { r: "Salmos 107:1", t: "Alabad a Jehová, porque él es bueno; porque para siempre es su misericordia." },
        { r: "Salmos 116:12", t: "¿Qué pagaré a Jehová por todos sus beneficios para conmigo? Tomaré la copa de la salvación, e invocaré el nombre de Jehová." },
        { r: "Colosenses 2:6-7", t: "Por tanto, de la manera que habéis recibido al Señor Jesucristo, andad en él; arraigados y sobreedificados en él... abundando en acciones de gracias." },
        { r: "Salmos 33:1-3", t: "Alegraos, oh justos, en Jehová; en los íntegros es hermosa la alabanza. Aclamadle con salterio y decacordio." },
        { r: "Salmos 118:1", t: "Alabad a Jehová, porque él es bueno; porque para siempre es su misericordia." },
        { r: "Salmos 145:1-3", t: "Te exaltaré, mi Dios, mi Rey, y bendeciré tu nombre eternamente y para siempre. Cada día te bendeciré." },
        { r: "Hebreos 13:15", t: "Así que, ofrezcamos siempre a Dios, por medio de él, sacrificio de alabanza, es decir, fruto de labios que confiesan su nombre." },
        { r: "Apocalipsis 7:12", t: "Diciendo: Amén. La bendición y la gloria y la sabiduría y la acción de gracias y la honra... sean a nuestro Dios por los siglos de los siglos." }
      ]
    }
  ]
};

function initLiturgiaCultos() {
  const container = document.getElementById('contenedorLiturgia');
  const toggleButtons = document.querySelectorAll('.btn-format-type');
  if (!container) return;

  function renderizarFormato(formato) {
    const lista = LITURGIA_DATA[formato] || LITURGIA_DATA.ensenanza;
    container.innerHTML = lista.map((sec, idx) => `
      <div class="moment-accordion">
        <div class="moment-header" onclick="toggleAcordeonLiturgia(this)">
          <span>${sec.momento}</span>
          <span class="badge">${sec.versiculos.length} versículos</span>
        </div>
        <div class="moment-content" style="${idx === 0 ? 'display:grid;' : 'display:none;'}">
          ${sec.versiculos.map(v => `
            <div class="lead-verse-card">
              <p class="lead-verse-text">“${v.t}”</p>
              <div class="lead-verse-meta">
                <span class="lead-verse-ref">${v.r}</span>
                <button type="button" class="btn-copy-mini" onclick="copiarTextoDirigir('${v.t.replace(/'/g, "\\'")}', '${v.r}')">📋 Copiar</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  window.toggleAcordeonLiturgia = function(headerEl) {
    const content = headerEl.nextElementSibling;
    const isVisible = content.style.display === 'grid';
    content.style.display = isVisible ? 'none' : 'grid';
  };

  window.copiarTextoDirigir = function(texto, ref) {
    navigator.clipboard.writeText(`"${texto}" — ${ref} (RVR1960)`);
    alert(`✓ ${ref} copiado al portapapeles.`);
  };

  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderizarFormato(btn.dataset.culto);
    });
  });

  renderizarFormato('ensenanza');
}

/* ===================================================
   3. BUSCADOR TEMÁTICO EN LA BIBLIA (BOLLS LIFE)
   =================================================== */
function initBuscadorBiblico() {
  const input = document.getElementById('inputBuscarBiblia');
  const btn = document.getElementById('btnEjecutarBusqueda');
  const resultsContainer = document.getElementById('contenedorResultadosBusqueda');
  const statsContainer = document.getElementById('searchResultStats');

  if (!input || !btn || !resultsContainer) return;

  async function ejecutarBusqueda() {
    const query = input.value.trim();
    if (!query) return;

    btn.disabled = true;
    btn.textContent = 'Buscando...';
    statsContainer.textContent = '';
    resultsContainer.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <span>Buscando pasajes con "${query}"...</span>
      </div>`;

    try {
      const res = await fetch(`https://bolls.life/search/RV1960/?search=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();

      if (!data || !Array.isArray(data) || data.length === 0) {
        statsContainer.textContent = 'No se encontraron resultados.';
        resultsContainer.innerHTML = '<p style="color:#64748b; padding:1.5rem; text-align:center;">No hay coincidencias en la versión RVR1960 para esa búsqueda.</p>';
        return;
      }

      statsContainer.textContent = `Se encontraron ${data.length} versículos para "${query}":`;
      resultsContainer.innerHTML = data.slice(0, 100).map(item => {
        const textoLimpio = item.text.replace(/<[^>]*>?/gm, '');
        const refTexto = `${item.book_name || 'Libro'} ${item.chapter}:${item.verse}`;

        return `
          <div class="search-res-item">
            <div>
              <span class="search-res-ref">${refTexto}</span>
              <p class="search-res-text">“${textoLimpio}”</p>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              <button type="button" class="btn-copy-mini" onclick="guardarVersiculoFavorito('${refTexto}', '${textoLimpio.replace(/'/g, "\\'")}')">⭐ Guardar</button>
              <button type="button" class="btn-copy-mini" onclick="copiarTextoDirigir('${textoLimpio.replace(/'/g, "\\'")}', '${refTexto}')">📋 Copiar</button>
            </div>
          </div>
        `;
      }).join('');

    } catch (e) {
      resultsContainer.innerHTML = '<p style="color:#991b1b; padding:1rem;">Error de conexión con el servicio bíblico. Revisa tu internet.</p>';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Buscar';
    }
  }

  btn.addEventListener('click', ejecutarBusqueda);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ejecutarBusqueda(); });
}

/* ===================================================
   4. GESTOR DE FAVORITOS LOCALES (LOCALSTORAGE)
   =================================================== */
function initFavoritosLocales() {
  const btnAbrir = document.getElementById('btnAbrirFavoritos');
  const btnCerrar = document.getElementById('btnCerrarFav');
  const drawer = document.getElementById('favDrawer');
  const overlay = document.getElementById('favOverlay');
  const favList = document.getElementById('favList');
  const favCount = document.getElementById('favCount');
  const btnFavPromesa = document.getElementById('btnFavPromesa');

  function obtenerFavoritos() {
    return JSON.parse(localStorage.getItem('biblia_favoritos') || '[]');
  }

  function actualizarContador() {
    const lista = obtenerFavoritos();
    if (favCount) favCount.textContent = lista.length;
  }

  function renderizarFavoritos() {
    const lista = obtenerFavoritos();
    actualizarContador();
    if (!favList) return;

    if (lista.length === 0) {
      favList.innerHTML = '<p style="color:#64748b; padding:2rem 0; text-align:center;">Aún no has guardado versículos favoritos.</p>';
      return;
    }

    favList.innerHTML = lista.map((fav, i) => `
      <div class="fav-card">
        <div class="fav-card-ref">
          <span>${fav.ref}</span>
          <button type="button" onclick="eliminarFavorito(${i})" style="color:#dc2626; border:none; background:none; cursor:pointer;" title="Eliminar">&times;</button>
        </div>
        <p style="font-size:0.85rem; font-style:italic; color:#334155; margin-bottom:8px;">“${fav.text}”</p>
        <button type="button" class="btn-copy-mini" onclick="copiarTextoDirigir('${fav.text.replace(/'/g, "\\'")}', '${fav.ref}')">📋 Copiar</button>
      </div>
    `).join('');
  }

  window.guardarVersiculoFavorito = function(ref, text) {
    let lista = obtenerFavoritos();
    if (lista.some(x => x.ref === ref)) {
      alert('Este versículo ya está en tus favoritos.');
      return;
    }
    lista.unshift({ ref, text, fecha: new Date().toLocaleDateString() });
    localStorage.setItem('biblia_favoritos', JSON.stringify(lista));
    actualizarContador();
    alert(`✓ ${ref} agregado a tus favoritos.`);
  };

  window.eliminarFavorito = function(indice) {
    let lista = obtenerFavoritos();
    lista.splice(indice, 1);
    localStorage.setItem('biblia_favoritos', JSON.stringify(lista));
    renderizarFavoritos();
  };

  if (btnAbrir && drawer && overlay) {
    btnAbrir.addEventListener('click', () => {
      renderizarFavoritos();
      overlay.style.display = 'block';
      drawer.classList.add('open');
    });

    const cerrar = () => {
      overlay.style.display = 'none';
      drawer.classList.remove('open');
    };

    btnCerrar.addEventListener('click', cerrar);
    overlay.addEventListener('click', cerrar);
  }

  if (btnFavPromesa) {
    btnFavPromesa.addEventListener('click', () => {
      const texto = document.getElementById('vdTexto')?.textContent.replace(/[“”"]/g, '').trim();
      const ref = document.getElementById('vdReferencia')?.textContent.replace(/[—–-]/g, '').trim();
      if (ref && texto) guardarVersiculoFavorito(ref, texto);
    });
  }

  actualizarContador();
}

/* ===================================================
   5. MINIRREPRODUCTOR DE RADIO FLOTANTE
   =================================================== */
function initRadioFlotante() {
  const audio = document.getElementById('audioRadioFlotante');
  const btn = document.getElementById('btnRadioFloat');
  const statusLbl = document.getElementById('radioFloatStatus');
  if (!audio || !btn) return;

  // Stream oficial con fallback de emisión continua
  const streamUrl = window.SUPABASE_CONFIG?.radio_url || 'https://stream.zeno.fm/24f3h3g8s0hvv';
  audio.src = streamUrl;

  let reproduciendo = false;

  btn.addEventListener('click', () => {
    if (!reproduciendo) {
      audio.play().then(() => {
        reproduciendo = true;
        btn.textContent = '❚❚';
        if (statusLbl) statusLbl.textContent = 'En Vivo';
        localStorage.setItem('radio_activa', 'true');
      }).catch(() => {
        alert('No se pudo conectar a la señal de radio en este momento.');
      });
    } else {
      audio.pause();
      reproduciendo = false;
      btn.textContent = '▶';
      if (statusLbl) statusLbl.textContent = 'Señal en pausa';
      localStorage.setItem('radio_activa', 'false');
    }
  });

  audio.addEventListener('error', () => {
    reproduciendo = false;
    btn.textContent = '▶';
    if (statusLbl) statusLbl.textContent = 'Desconectado';
  });
}

/* ===================================================
   6. PROMESA DEL DÍA Y LECTOR BÍBLICO (RVR1960)
   =================================================== */
const COORDENADAS_PROMESAS = {
  animo: [
    { b: 23, c: 41, v: 10, r: "Isaías 41:10" },
    { b: 6,  c: 1,  v: 9,  r: "Josué 1:9" },
    { b: 50, c: 4,  v: 13, r: "Filipenses 4:13" },
    { b: 45, c: 8,  v: 28, r: "Romanos 8:28" },
    { b: 23, c: 40, v: 29, r: "Isaías 40:29" },
    { b: 19, c: 34, v: 18, r: "Salmos 34:18" }
  ],
  no_temas: [
    { b: 19, c: 23, v: 4,  r: "Salmos 23:4" },
    { b: 19, c: 27, v: 1,  r: "Salmos 27:1" },
    { b: 55, c: 1,  v: 7,  r: "2 Timoteo 1:7" },
    { b: 19, c: 91, v: 5,  r: "Salmos 91:5" }
  ],
  fe: [
    { b: 58, c: 11, v: 1,  r: "Hebreos 11:1" },
    { b: 58, c: 11, v: 6,  r: "Hebreos 11:6" },
    { b: 45, c: 10, v: 17, r: "Romanos 10:17" }
  ],
  fortaleza: [
    { b: 19, c: 46, v: 1,  r: "Salmos 46:1" },
    { b: 23, c: 40, v: 31, r: "Isaías 40:31" },
    { b: 49, c: 6,  v: 10, r: "Efesios 6:10" }
  ],
  paz: [
    { b: 43, c: 14, v: 27, r: "Juan 14:27" },
    { b: 50, c: 4,  v: 7,  r: "Filipenses 4:7" },
    { b: 19, c: 4,  v: 8,  r: "Salmos 4:8" }
  ],
  esperanza: [
    { b: 24, c: 29, v: 11, r: "Jeremías 29:11" },
    { b: 45, c: 15, v: 13, r: "Romanos 15:13" }
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

  const inicioAno = new Date(hoy.getFullYear(), 0, 0);
  const diff = hoy - inicioAno;
  const diaDelAno = Math.floor(diff / (1000 * 60 * 60 * 24));

  async function cargarPromesaDeLaBiblia(tema) {
    const lista = COORDENADAS_PROMESAS[tema] || COORDENADAS_PROMESAS.animo;
    const indice = (diaDelAno + hoy.getFullYear()) % lista.length;
    const coord = lista[indice];

    elTexto.innerHTML = `<span style="opacity: 0.6;">Consultando versículo desde la Biblia...</span>`;
    elRef.textContent = `— ${coord.r}`;

    try {
      const res = await fetch(`https://bolls.life/get-chapter/RV1960/${coord.b}/${coord.c}/`);
      if (!res.ok) throw new Error();
      const capitulo = await res.json();
      const vObj = capitulo.find(v => v.verse === coord.v);
      if (vObj) {
        elTexto.textContent = `“${vObj.text.replace(/<[^>]*>?/gm, '').trim()}”`;
      }
    } catch (e) {
      elTexto.textContent = `“Jehová es mi pastor; nada me faltará.”`;
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
      setTimeout(() => btnCopiar.textContent = '📋 Copiar', 2000);
    });
  }

  if (btnWa) {
    btnWa.addEventListener('click', () => {
      const msg = encodeURIComponent(`*Palabra para Hoy*\n\n${elTexto.textContent}\n*${elRef.textContent}*\n\nhttps://unencuentroconjesusperu.com/biblia.html`);
      window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
    });
  }
}

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

  let libroSeleccionado = LIBROS_BIBLIA[39]; // Mateo
  let capSeleccionado = 1;
  let verSeleccionado = 0;
  let versiculosCache = [];

  function actualizarSelectLibros() {
    const test = selTest.value;
    const filtrados = LIBROS_BIBLIA.filter(l => l.test === test);
    selLib.innerHTML = filtrados.map(l => `<option value="${l.id}">${l.nombre}</option>`).join('');
    if (!filtrados.some(l => l.id === libroSeleccionado.id)) libroSeleccionado = filtrados[0];
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
    contVersiculos.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><span>Consultando Escrituras...</span></div>`;

    try {
      const res = await fetch(`https://bolls.life/get-chapter/RV1960/${libroSeleccionado.id}/${capSeleccionado}/`);
      const data = res.ok ? await res.json() : [];
      if (!data || data.length === 0) throw new Error();

      versiculosCache = data;
      poblarSelectVersiculos();
      renderizarVista();
    } catch (e) {
      contVersiculos.innerHTML = '<p style="color:#991b1b; padding:1rem;">Error de conexión con el servicio bíblico.</p>';
    }
  }

  function renderizarVista() {
    if (verSeleccionado === 0) {
      txtTitulo.textContent = `${libroSeleccionado.nombre} ${capSeleccionado}`;
      btnPrev.textContent = '← Capítulo Anterior';
      btnNext.textContent = 'Capítulo Siguiente →';

      contVersiculos.innerHTML = versiculosCache.map(v => `
        <span class="v-box" data-verse="${v.verse}" title="Clic para aislar versículo">
          <sup class="v-num">${v.verse}</sup>${v.text.replace(/<[^>]*>?/gm, '')} 
        </span>
      `).join(' ');

      contVersiculos.querySelectorAll('.v-box').forEach(el => {
        el.addEventListener('click', () => {
          verSeleccionado = parseInt(el.dataset.verse, 10);
          selVer.value = verSeleccionado;
          renderizarVista();
        });
      });
    } else {
      const vObj = versiculosCache.find(x => x.verse === verSeleccionado) || versiculosCache[0];
      const textoLimpio = vObj.text.replace(/<[^>]*>?/gm, '').trim();
      const ref = `${libroSeleccionado.nombre} ${capSeleccionado}:${vObj.verse}`;

      txtTitulo.textContent = ref;
      btnPrev.textContent = '← Versículo Anterior';
      btnNext.textContent = 'Versículo Siguiente →';

      contVersiculos.innerHTML = `
        <div class="verse-focus-card">
          <p class="verse-focus-text">“${textoLimpio}”</p>
          <div class="verse-focus-meta">
            <button type="button" class="btn-secondary btn-sm" onclick="copiarTextoDirigir('${textoLimpio.replace(/'/g, "\\'")}', '${ref}')">📋 Copiar</button>
            <button type="button" class="btn-secondary btn-sm" onclick="guardarVersiculoFavorito('${ref}', '${textoLimpio.replace(/'/g, "\\'")}')">⭐ Guardar</button>
            <button type="button" class="btn-secondary btn-sm" id="btnVerCapCompleto">📖 Ver Capítulo Completo</button>
          </div>
        </div>
      `;

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
      if (capSeleccionado > 1) { capSeleccionado--; selCap.value = capSeleccionado; cargarTextoCapitulo(); }
    } else if (verSeleccionado > 1) {
      verSeleccionado--; selVer.value = verSeleccionado; renderizarVista();
    }
  });

  btnNext.addEventListener('click', () => {
    if (verSeleccionado === 0) {
      if (capSeleccionado < libroSeleccionado.caps) { capSeleccionado++; selCap.value = capSeleccionado; cargarTextoCapitulo(); }
    } else if (verSeleccionado < versiculosCache.length) {
      verSeleccionado++; selVer.value = verSeleccionado; renderizarVista();
    }
  });

  actualizarSelectLibros();
}