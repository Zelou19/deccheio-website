const params = new URLSearchParams(window.location.search);
const idOrcamento = params.get('id');

const elCarregamento = document.getElementById('estado-carregamento');
const elErro = document.getElementById('estado-erro');
const elDocumento = document.getElementById('documento');
const linkVoltar = document.getElementById('link-voltar');
const btnImprimir = document.getElementById('btn-imprimir');

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(valor || 0);
}

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function renderizarDocumento(orc) {
  document.title = `Orçamento — ${orc.nome} — De Cheio`;

  linkVoltar.href = `/admin/orcamento.html?id=${orc._id}`;

  document.getElementById('doc-numero').textContent = `Nº ${orc._id.slice(-6).toUpperCase()}`;
  document.getElementById('doc-data').textContent = new Date(orc.createdAt).toLocaleDateString('pt-PT', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  document.getElementById('doc-nome').textContent = orc.nomeFestejado
    ? `${orc.nome} (para ${orc.nomeFestejado})`
    : orc.nome;
  document.getElementById('doc-contacto').textContent = [orc.email, orc.telefone].filter(Boolean).join(' · ');

  document.getElementById('doc-tipo-evento').textContent = orc.tipoEvento || '—';
  document.getElementById('doc-detalhes-evento').innerHTML = [
    orc.dataEvento ? `Data: ${new Date(orc.dataEvento).toLocaleDateString('pt-PT')}` : null,
    orc.localEvento ? `Local: ${escaparHtml(orc.localEvento)}` : null,
  ].filter(Boolean).join('<br>');

  const itens = orc.itens || [];
  document.getElementById('doc-itens').innerHTML = itens.length
    ? itens.map((item) => `
        <tr>
          <td>${escaparHtml(item.descricao)}</td>
          <td class="doc-col-num">${item.quantidade}</td>
          <td class="doc-col-num">${formatarMoeda(item.precoUnitario)}</td>
          <td class="doc-col-num">${formatarMoeda(item.quantidade * item.precoUnitario)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="4" style="color: var(--taupe);">Sem itens definidos.</td></tr>';

  const subtotal = itens.reduce((soma, item) => soma + item.quantidade * item.precoUnitario, 0);
  const desconto = orc.desconto || 0;

  const linhasTotais = [];
  if (desconto > 0) {
    linhasTotais.push(`<div class="doc-linha-total"><span>Subtotal</span><span>${formatarMoeda(subtotal)}</span></div>`);
    linhasTotais.push(`<div class="doc-linha-total"><span>Desconto</span><span>-${formatarMoeda(desconto)}</span></div>`);
  }
  linhasTotais.push(`<div class="doc-linha-total doc-linha-final"><span>Total</span><span>${formatarMoeda(orc.total)}</span></div>`);
  document.getElementById('doc-linhas-totais').innerHTML = linhasTotais.join('');

  if (orc.imagens && orc.imagens.length) {
    document.getElementById('doc-imagens-secao').hidden = false;
    document.getElementById('doc-imagens').innerHTML = orc.imagens
      .map((src) => `<img src="${src}" alt="Imagem de inspiração">`)
      .join('');
  }

  if (orc.notas) {
    document.getElementById('doc-notas-secao').hidden = false;
    document.getElementById('doc-notas').textContent = orc.notas;
  }

  if (orc.validoAte) {
    const elValidade = document.getElementById('doc-validade');
    elValidade.hidden = false;
    elValidade.textContent = `Este orçamento é válido até ${new Date(orc.validoAte).toLocaleDateString('pt-PT')}.`;
  }

  elCarregamento.hidden = true;
  elDocumento.hidden = false;
}

btnImprimir.addEventListener('click', () => window.print());

async function carregar() {
  if (!idOrcamento) {
    elCarregamento.hidden = true;
    elErro.hidden = false;
    return;
  }

  try {
    const resposta = await fetch(`/api/orcamentos/${idOrcamento}`);
    if (!resposta.ok) {
      elCarregamento.hidden = true;
      elErro.hidden = false;
      return;
    }
    renderizarDocumento(await resposta.json());
  } catch (erro) {
    elCarregamento.hidden = true;
    elErro.hidden = false;
  }
}

protegerPaginaAdmin().then((admin) => {
  if (!admin) return;
  carregar();
});
