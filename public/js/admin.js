const gate = document.getElementById('admin-gate');
const conteudo = document.getElementById('admin-conteudo');
const gateErro = document.getElementById('gate-erro');
const inputChave = document.getElementById('admin-key-input');

const filtroStatus = document.getElementById('filtro-status');
const filtroTipo = document.getElementById('filtro-tipo');
const filtroBusca = document.getElementById('filtro-busca');

let todosPedidos = [];

function getChave() {
  return sessionStorage.getItem('adminKey') || '';
}

async function carregarPedidos() {
  const resposta = await fetch('/api/quotes', {
    headers: { 'x-admin-key': getChave() },
  });

  if (resposta.status === 401) {
    sessionStorage.removeItem('adminKey');
    gate.hidden = false;
    conteudo.hidden = true;
    gateErro.textContent = 'Chave incorreta.';
    return;
  }

  todosPedidos = await resposta.json();
  gate.hidden = true;
  conteudo.hidden = false;

  renderizarStats();
  renderizarLista();
}

function renderizarStats() {
  const contagens = { nao_respondido: 0, em_andamento: 0, concluido: 0 };
  todosPedidos.forEach((p) => { contagens[p.status] = (contagens[p.status] || 0) + 1; });

  document.getElementById('stat-total').textContent = todosPedidos.length;
  document.getElementById('stat-nao_respondido').textContent = contagens.nao_respondido;
  document.getElementById('stat-em_andamento').textContent = contagens.em_andamento;
  document.getElementById('stat-concluido').textContent = contagens.concluido;
}

function renderizarLista() {
  const lista = document.getElementById('lista-pedidos');

  const termoBusca = filtroBusca.value.trim().toLowerCase();
  const filtrados = todosPedidos.filter((p) => {
    if (filtroStatus.value && p.status !== filtroStatus.value) return false;
    if (filtroTipo.value && p.tipoEvento !== filtroTipo.value) return false;
    if (termoBusca && !`${p.nome} ${p.email}`.toLowerCase().includes(termoBusca)) return false;
    return true;
  });

  if (filtrados.length === 0) {
    lista.innerHTML = '<p class="sem-resultados">Nenhum pedido corresponde a este filtro.</p>';
    return;
  }

  lista.innerHTML = filtrados
    .map((p) => `
      <div class="pedido-card" style="margin-bottom: 10px;">
        <a href="/admin/chat.html?id=${p._id}" class="pedido-card-info" style="text-decoration:none; color: inherit;">
          <div class="pedido-card-nome">${p.nome}</div>
          <div class="pedido-card-meta">
            <span class="pedido-card-tag">${p.tipoEvento}</span>
            ${p.email} · pedido a ${new Date(p.createdAt).toLocaleDateString('pt-PT')}
          </div>
        </a>
        <div class="pedido-card-actions">
          <select class="status-select" data-id="${p._id}">
            <option value="nao_respondido" ${p.status === 'nao_respondido' ? 'selected' : ''}>Não respondido</option>
            <option value="em_andamento" ${p.status === 'em_andamento' ? 'selected' : ''}>Em andamento</option>
            <option value="concluido" ${p.status === 'concluido' ? 'selected' : ''}>Concluído</option>
          </select>
          <a href="/admin/chat.html?id=${p._id}" class="btn btn-primary" style="padding: 0.5em 1em; font-size: 0.82rem;">Abrir</a>
        </div>
      </div>
    `)
    .join('');

  lista.querySelectorAll('.status-select').forEach((select) => {
    select.addEventListener('change', async () => {
      await fetch(`/api/quotes/${select.dataset.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': getChave() },
        body: JSON.stringify({ status: select.value }),
      });
      carregarPedidos();
    });
  });
}

document.getElementById('admin-key-btn').addEventListener('click', () => {
  sessionStorage.setItem('adminKey', inputChave.value.trim());
  carregarPedidos();
});

inputChave.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('admin-key-btn').click();
});

document.getElementById('btn-sair').addEventListener('click', () => {
  sessionStorage.removeItem('adminKey');
  conteudo.hidden = true;
  gate.hidden = false;
  inputChave.value = '';
});

[filtroStatus, filtroTipo, filtroBusca].forEach((el) => el.addEventListener('input', renderizarLista));

if (getChave()) carregarPedidos();
