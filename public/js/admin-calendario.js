const gate = document.getElementById('admin-gate');
const conteudo = document.getElementById('admin-conteudo');
const gateErro = document.getElementById('gate-erro');
const inputChave = document.getElementById('admin-key-input');

const formNovoCalendario = document.getElementById('form-novo-calendario');
const inputNome = document.getElementById('nome-calendario');
const inputId = document.getElementById('id-calendario');
const inputCor = document.getElementById('cor-calendario');
const calendarioFeedback = document.getElementById('calendario-feedback');
const listaCalendarios = document.getElementById('lista-calendarios');
const embedContainer = document.getElementById('embed-container');

function getChave() {
  return sessionStorage.getItem('adminKey') || '';
}

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto || '';
  return div.innerHTML;
}

// GET /api/calendarios é pública, por isso a chave é validada aqui contra /api/quotes
// (endpoint protegido) antes de mostrar o painel — o mesmo padrão usado na página de eventos.
async function validarChaveEcarregar() {
  const verificacao = await fetch('/api/quotes', { headers: { 'x-admin-key': getChave() } });

  if (!verificacao.ok) {
    sessionStorage.removeItem('adminKey');
    gate.hidden = false;
    conteudo.hidden = true;
    gateErro.textContent = 'Chave incorreta.';
    return;
  }

  await carregarCalendarios();
}

function montarUrlEmbed(calendarios) {
  const parametros = new URLSearchParams({ ctz: 'Europe/Lisbon', height: '650' });
  calendarios.forEach((cal) => {
    parametros.append('src', cal.googleCalendarId);
    parametros.append('color', cal.cor || '#6B2A34');
  });
  return `https://calendar.google.com/calendar/embed?${parametros.toString()}`;
}

async function carregarCalendarios() {
  const resposta = await fetch('/api/calendarios');
  if (!resposta.ok) {
    listaCalendarios.innerHTML = '<p class="sem-resultados">Não foi possível carregar os calendários.</p>';
    return;
  }

  const calendarios = await resposta.json();
  gate.hidden = true;
  conteudo.hidden = false;

  listaCalendarios.innerHTML = calendarios.length === 0
    ? ''
    : calendarios.map((cal) => `
        <span class="calendario-chip">
          <span class="bolinha" style="background:${cal.cor}"></span>
          ${escaparHtml(cal.nome)}
          <button type="button" data-id="${cal._id}" title="Remover">&times;</button>
        </span>
      `).join('');

  embedContainer.innerHTML = calendarios.length === 0
    ? '<p class="embed-vazio">Adiciona pelo menos um calendário para o veres aqui.</p>'
    : `<iframe src="${montarUrlEmbed(calendarios)}" frameborder="0" scrolling="no"></iframe>`;
}

listaCalendarios.addEventListener('click', async (event) => {
  const id = event.target.dataset.id;
  if (!id) return;
  if (!confirm('Remover este calendário da lista? (o calendário no Google não é afetado)')) return;

  await fetch(`/api/calendarios/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-key': getChave() },
  });
  carregarCalendarios();
});

formNovoCalendario.addEventListener('submit', async (event) => {
  event.preventDefault();
  calendarioFeedback.textContent = '';
  calendarioFeedback.className = 'form-feedback';

  const nome = inputNome.value.trim();
  const googleCalendarId = inputId.value.trim();
  if (!nome || !googleCalendarId) return;

  const resposta = await fetch('/api/calendarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': getChave() },
    body: JSON.stringify({ nome, googleCalendarId, cor: inputCor.value }),
  });
  const resultado = await resposta.json();

  if (!resposta.ok) {
    calendarioFeedback.textContent = resultado.erro || 'Não foi possível adicionar o calendário.';
    calendarioFeedback.classList.add('erro');
    return;
  }

  formNovoCalendario.reset();
  inputCor.value = '#6B2A34';
  carregarCalendarios();
});

document.getElementById('admin-key-btn').addEventListener('click', () => {
  sessionStorage.setItem('adminKey', inputChave.value.trim());
  validarChaveEcarregar();
});

inputChave.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('admin-key-btn').click();
});

if (getChave()) {
  validarChaveEcarregar();
} else {
  gate.hidden = false;
}
