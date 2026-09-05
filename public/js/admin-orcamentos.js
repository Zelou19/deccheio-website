const elLista = document.getElementById('lista-orcamentos');
const filtroStatus = document.getElementById('filtro-status');
const btnNovoOrcamento = document.getElementById('btn-novo-orcamento');

const ROTULOS_STATUS = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
};

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(valor || 0);
}

async function carregarOrcamentos() {
  elLista.innerHTML = '<p>A carregar...</p>';

  const parametros = new URLSearchParams();
  if (filtroStatus.value) parametros.set('status', filtroStatus.value);

  const resposta = await fetch(`/api/orcamentos?${parametros.toString()}`);
  if (!resposta.ok) {
    elLista.innerHTML = '<p class="sem-resultados">Não foi possível carregar os orçamentos.</p>';
    return;
  }

  const orcamentos = await resposta.json();

  if (!orcamentos.length) {
    elLista.innerHTML = '<p class="sem-resultados">Ainda não há orçamentos criados.</p>';
    return;
  }

  elLista.innerHTML = orcamentos.map((orc) => `
    <a href="/admin/orcamento.html?id=${orc._id}" class="pedido-card">
      <div class="pedido-card-info">
        <span class="status-dot" data-status="${orc.status === 'enviado' ? 'concluido' : 'nao_respondido'}"></span>
        <span class="pedido-card-nome">${orc.nome}</span>
        <div class="pedido-card-meta">
          ${orc.tipoEvento ? `<span class="pedido-card-tag">${orc.tipoEvento}</span>` : ''}
          ${formatarMoeda(orc.total)} · ${ROTULOS_STATUS[orc.status]} · ${new Date(orc.createdAt).toLocaleDateString('pt-PT')}
        </div>
      </div>
    </a>
  `).join('');
}

filtroStatus.addEventListener('change', carregarOrcamentos);

btnNovoOrcamento.addEventListener('click', () => {
  window.location.href = '/admin/orcamento.html';
});

protegerPaginaAdmin().then((admin) => {
  if (!admin) return;
  carregarOrcamentos();
});
