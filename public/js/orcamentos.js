const elCarregamento = document.getElementById('estado-carregamento');
const elVazio = document.getElementById('estado-vazio');
const elLista = document.getElementById('lista-orcamentos');
const elOlaNome = document.getElementById('ola-nome');
const elAbasBar = document.getElementById('abas-bar');
const botoesAba = document.querySelectorAll('.aba-btn');

let todosPedidos = [];
let abaAtual = 'abertas';

const ROTULOS_STATUS = {
  nao_respondido: 'Ainda não respondido',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
};

function formatarData(iso) {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
}

async function carregar() {
  // Confirma sessão e mostra o nome
  const respostaMe = await fetch('/api/auth/me', { credentials: 'include' });
  if (!respostaMe.ok) {
    window.location.href = '/login.html?redirecionar=/orcamentos.html';
    return;
  }
  const { user } = await respostaMe.json();
  elOlaNome.textContent = `Olá, ${user.nome.split(' ')[0]}`;

  // Carrega os orçamentos da conta
  const resposta = await fetch('/api/quotes/minhas', { credentials: 'include' });
  if (!resposta.ok) {
    window.location.href = '/login.html?redirecionar=/orcamentos.html';
    return;
  }
  todosPedidos = await resposta.json();

  elCarregamento.hidden = true;

  if (todosPedidos.length === 0) {
    elVazio.hidden = false;
    return;
  }

  elAbasBar.hidden = false;
  renderizarLista();
}

function renderizarLista() {
  const filtrados = todosPedidos.filter((p) => (abaAtual === 'fechadas' ? p.fechado : !p.fechado));

  if (filtrados.length === 0) {
    elLista.innerHTML = `<p class="sem-resultados">${abaAtual === 'fechadas' ? 'Ainda não tem conversas fechadas.' : 'Não tem conversas abertas.'}</p>`;
    return;
  }

  elLista.innerHTML = filtrados
    .map(
      (p) => `
      <a href="/pedido.html?id=${p._id}" class="orcamento-card">
        <div>
          <div class="orcamento-card-titulo">${p.tipoEvento} — ${p.nome}</div>
          <div class="orcamento-card-meta">Pedido a ${formatarData(p.createdAt)}${p.fechado ? ' · <span class="pedido-card-fechada">fechada</span>' : ''}</div>
        </div>
        <span class="status-pill" data-status="${p.status}">${ROTULOS_STATUS[p.status] || p.status}</span>
      </a>
    `
    )
    .join('');
}

botoesAba.forEach((botao) => {
  botao.addEventListener('click', () => {
    abaAtual = botao.dataset.aba;
    botoesAba.forEach((b) => b.classList.toggle('ativa', b === botao));
    renderizarLista();
  });
});

document.getElementById('btn-sair').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  window.location.href = '/';
});

carregar();
