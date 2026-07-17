const elCarregamento = document.getElementById('estado-carregamento');
const elVazio = document.getElementById('estado-vazio');
const elLista = document.getElementById('lista-orcamentos');
const elOlaNome = document.getElementById('ola-nome');

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
  const pedidos = await resposta.json();

  elCarregamento.hidden = true;

  if (pedidos.length === 0) {
    elVazio.hidden = false;
    return;
  }

  elLista.innerHTML = pedidos
    .map(
      (p) => `
      <a href="/pedido.html?id=${p._id}" class="orcamento-card">
        <div>
          <div class="orcamento-card-titulo">${p.tipoEvento} — ${p.nome}</div>
          <div class="orcamento-card-meta">Pedido a ${formatarData(p.createdAt)}</div>
        </div>
        <span class="status-pill" data-status="${p.status}">${ROTULOS_STATUS[p.status] || p.status}</span>
      </a>
    `
    )
    .join('');
}

document.getElementById('btn-sair').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  window.location.href = '/';
});

carregar();
