const params = new URLSearchParams(window.location.search);
const idOrcamento = params.get('id');

const elCarregamento = document.getElementById('estado-carregamento');
const elErro = document.getElementById('estado-erro');
const elDocumento = document.getElementById('documento');
const linkVoltar = document.getElementById('link-voltar');
const btnImprimir = document.getElementById('btn-imprimir');

const NOME_VALOR_BASE = 'Valor base';
const NOME_SEM_SECAO = 'Outros itens';
const ALTURA_UTIL_PAGINA_MM = 245; // altura aproveitável de uma página A4 (sem cabeçalho/rodapé)

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(valor || 0);
}

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

function dataPorExtenso(iso) {
  const d = new Date(iso);
  const mes = d.toLocaleDateString('pt-PT', { month: 'long', timeZone: 'UTC' });
  return `${d.getUTCDate()} ${mes} ${d.getUTCFullYear()}`.toUpperCase();
}

// Agrupa os itens por secção, pela ordem em que aparecem no orçamento
function agruparPorSecao(itens) {
  const grupos = [];
  const porNome = new Map();
  itens.forEach((item) => {
    const nome = item.secao || NOME_SEM_SECAO;
    if (!porNome.has(nome)) {
      const grupo = { nome, itens: [] };
      porNome.set(nome, grupo);
      grupos.push(grupo);
    }
    porNome.get(nome).itens.push(item);
  });
  return grupos;
}

const subtotalDe = (itens) => itens.reduce((soma, i) => soma + i.quantidade * i.precoUnitario, 0);

// Estimativa (em mm) da altura de uma secção, para decidir onde quebrar a página:
// título + cabeçalho da tabela + margem, a nota da secção, e cada linha (mais alta se a descrição for longa)
function pesoDaSecao(grupo, nota) {
  const notaMm = nota ? 4 + Math.ceil(nota.length / 105) * 4.4 : 0;
  const linhasMm = grupo.itens.reduce((soma, i) => soma + (i.descricao.length > 62 ? 12 : 8), 0);
  return 27 + notaMm + linhasMm;
}

function htmlSecao(grupo, nota) {
  const linhas = grupo.itens.map((item) => `
    <tr>
      <td>${escaparHtml(item.descricao)}</td>
      <td class="qtd">${item.quantidade}</td>
      <td class="num">${formatarMoeda(item.precoUnitario)}</td>
      <td class="num">${formatarMoeda(item.quantidade * item.precoUnitario)}</td>
    </tr>`).join('');
  return `
    <div class="bloco-secao">
      <h2 class="titulo-secao">${escaparHtml(grupo.nome.toUpperCase())}</h2>
      ${nota ? `<p class="nota-secao">${escaparHtml(nota)}</p>` : ''}
      <table class="tabela-itens">
        <thead><tr><th>Descrição</th><th class="qtd">Qtd.</th><th class="num">Preço unit.</th><th class="num">Subtotal</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;
}

function renderizarCapa(orc) {
  const festejado = orc.nomeFestejado || orc.nome;
  document.getElementById('capa-sub').textContent = [orc.versao || 'V00', orc.tipoEvento, festejado]
    .filter(Boolean).join(' ').toUpperCase();

  const preencher = (id, texto) => {
    const el = document.getElementById(id);
    el.hidden = !texto;
    el.textContent = texto || '';
  };
  preencher('capa-local', orc.localEvento ? `LOCAL - ${orc.localEvento}` : '');
  preencher('capa-data', orc.dataEvento ? `DATA - ${dataPorExtenso(orc.dataEvento)}` : '');
  preencher('capa-convidados', orc.numeroConvidados ? `NÚMERO DE CONVIDADOS - ${orc.numeroConvidados}` : '');
}

function renderizarSeccoes(grupos, notasPorSecao) {
  const contentor = document.getElementById('doc-seccoes');
  contentor.innerHTML = '';
  if (!grupos.length) {
    contentor.innerHTML = '<section class="doc-pagina" data-cabecalho><p>Sem itens definidos.</p></section>';
    return;
  }

  let pagina = null;
  let peso = 0;
  grupos.forEach((grupo) => {
    const nota = notasPorSecao[grupo.nome];
    const pesoGrupo = pesoDaSecao(grupo, nota);
    if (!pagina || (peso > 0 && peso + pesoGrupo > ALTURA_UTIL_PAGINA_MM)) {
      pagina = document.createElement('section');
      pagina.className = 'doc-pagina';
      pagina.dataset.cabecalho = '';
      contentor.appendChild(pagina);
      peso = 0;
    }
    pagina.insertAdjacentHTML('beforeend', htmlSecao(grupo, nota));
    peso += pesoGrupo;
  });
}

function renderizarResumo(orc, grupos) {
  const linhas = grupos.map((g) => `<tr><td>${escaparHtml(g.nome)}</td><td>${formatarMoeda(subtotalDe(g.itens))}</td></tr>`);
  const desconto = orc.desconto || 0;
  if (desconto > 0) {
    linhas.push(`<tr><td><strong>Subtotal</strong></td><td><strong>${formatarMoeda(subtotalDe(orc.itens || []))}</strong></td></tr>`);
    linhas.push(`<tr><td>Desconto</td><td>-${formatarMoeda(desconto)}</td></tr>`);
  }
  linhas.push(`<tr class="linha-total"><td>Total</td><td>${formatarMoeda(orc.total)}</td></tr>`);
  document.getElementById('resumo-corpo').innerHTML = linhas.join('');

  if (orc.validoAte) {
    const el = document.getElementById('doc-validade');
    el.hidden = false;
    el.textContent = `Este orçamento é válido até ${new Date(orc.validoAte).toLocaleDateString('pt-PT')}.`;
  }
}

function renderizarNotas(texto) {
  if (!texto || !texto.trim()) return;
  document.getElementById('pag-notas').hidden = false;
  document.getElementById('doc-notas').innerHTML = texto
    .split('\n')
    .map((linha) => linha.trim())
    .filter(Boolean)
    .map((linha) => `<p class="nota-linha">${escaparHtml(linha)}</p>`)
    .join('');
}

// Cabeçalho pequeno e rodapé com contactos em todas as páginas (exceto capa/fecho, que têm o seu)
function decorarPaginas() {
  const rodape = `
    <footer class="pag-rodape">
      <div class="pag-rodape-logo"><div class="marca"><div class="marca-linha"><span>DE</span><img src="/img/logo512.png" alt=""></div><span class="marca-cheio">CHEIO</span></div></div>
      <div class="pag-rodape-texto"><strong>Filipa Couceiro -</strong> <span>936814781</span> <strong>Email -</strong> <span>decoracao.fcheio@gmail.com</span></div>
    </footer>`;
  document.querySelectorAll('.doc-pagina').forEach((pagina) => {
    if (pagina.hidden) return;
    if ('cabecalho' in pagina.dataset && !pagina.querySelector('.pag-cabecalho')) {
      pagina.insertAdjacentHTML('afterbegin', '<div class="pag-cabecalho"><span>DECORAÇÃOCHEIO</span><span>BY FILIPA COUCEIRO</span></div>');
    }
    if (!pagina.classList.contains('doc-fecho') && !pagina.querySelector('.pag-rodape')) {
      pagina.insertAdjacentHTML('beforeend', rodape);
    }
  });
}

async function carregarNotasDasSecoes() {
  try {
    const resposta = await fetch('/api/orcamentos/base');
    if (!resposta.ok) return {};
    const base = await resposta.json();
    const mapa = {};
    (base.secoes || []).forEach((s) => { if (s.nota) mapa[s.nome] = s.nota; });
    return mapa;
  } catch (erro) {
    return {};
  }
}

async function renderizarDocumento(orc) {
  document.title = `Proposta de orçamento — ${orc.nome} — De Cheio`;
  linkVoltar.href = `/admin/orcamento.html?id=${orc._id}`;

  const itens = orc.itens || [];
  const grupos = agruparPorSecao(itens);
  const gruposNormais = grupos.filter((g) => g.nome !== NOME_VALOR_BASE);
  const grupoValorBase = grupos.find((g) => g.nome === NOME_VALOR_BASE);

  renderizarCapa(orc);
  renderizarSeccoes(gruposNormais, await carregarNotasDasSecoes());

  const blocoValorBase = document.getElementById('bloco-valor-base');
  if (grupoValorBase) {
    blocoValorBase.hidden = false;
    document.getElementById('valor-base-preco').textContent = formatarMoeda(subtotalDe(grupoValorBase.itens));
  } else {
    blocoValorBase.hidden = true;
  }

  renderizarResumo(orc, grupos);
  renderizarNotas(orc.notas);
  decorarPaginas();

  elCarregamento.hidden = true;
  elDocumento.hidden = false;
  ajustarZoom();
}

// No telemóvel a folha A4 (794px) não cabe: encolhe o documento só no ecrã
function ajustarZoom() {
  elDocumento.style.zoom = Math.min(1, (window.innerWidth - 16) / 794);
}
window.addEventListener('resize', ajustarZoom);
window.addEventListener('beforeprint', () => { elDocumento.style.zoom = 1; });
window.addEventListener('afterprint', ajustarZoom);

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
    await renderizarDocumento(await resposta.json());
  } catch (erro) {
    elCarregamento.hidden = true;
    elErro.hidden = false;
  }
}

protegerPaginaAdmin().then((admin) => {
  if (!admin) return;
  carregar();
});
