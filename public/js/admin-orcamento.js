const params = new URLSearchParams(window.location.search);
let idOrcamento = params.get('id'); // null = a criar um orçamento novo

const elCarregamento = document.getElementById('estado-carregamento');
const elErro = document.getElementById('estado-erro');
const form = document.getElementById('form-orcamento');
const elEyebrow = document.getElementById('orc-eyebrow');
const elTitulo = document.getElementById('orc-titulo');
const elStatusPill = document.getElementById('orc-status-pill');
const elDePedido = document.getElementById('orc-de-pedido');

const campoNome = document.getElementById('orc-nome');
const campoNomeFestejado = document.getElementById('orc-nomeFestejado');
const campoEmail = document.getElementById('orc-email');
const campoTelefone = document.getElementById('orc-telefone');
const campoTipoEvento = document.getElementById('orc-tipoEvento');
const campoDataEvento = document.getElementById('orc-dataEvento');
const campoLocalEvento = document.getElementById('orc-localEvento');
const corpoItens = document.getElementById('orc-itens-corpo');
const btnAddItem = document.getElementById('btn-add-item');
const campoDesconto = document.getElementById('orc-desconto');
const elTotalValor = document.getElementById('orc-total-valor');
const campoValidoAte = document.getElementById('orc-validoAte');
const campoStatus = document.getElementById('orc-status');
const campoNotas = document.getElementById('orc-notas');
const feedback = document.getElementById('orc-feedback');
const btnGuardar = document.getElementById('btn-guardar-orcamento');
const elZonaPerigo = document.getElementById('orc-zona-perigo');

let quoteRequestIdAtual = null;
let contadorLinhas = 0;

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(valor || 0);
}

function formatarDataParaInput(iso) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

// ---------- Tabela de itens ----------
function criarLinhaItem(item = { descricao: '', quantidade: 1, precoUnitario: 0 }) {
  contadorLinhas += 1;
  const tr = document.createElement('tr');
  tr.dataset.linha = contadorLinhas;
  tr.innerHTML = `
    <td><input type="text" class="item-descricao" placeholder="ex: Arco de balões" value="${item.descricao || ''}"></td>
    <td class="orc-col-num"><input type="number" class="item-quantidade" min="0" step="1" value="${item.quantidade ?? 1}"></td>
    <td class="orc-col-num"><input type="number" class="item-preco" min="0" step="0.01" value="${item.precoUnitario ?? 0}"></td>
    <td class="orc-col-num item-subtotal">${formatarMoeda((item.quantidade || 0) * (item.precoUnitario || 0))}</td>
    <td><button type="button" class="btn-remover-item" title="Remover item">&times;</button></td>
  `;
  corpoItens.appendChild(tr);

  tr.querySelector('.item-quantidade').addEventListener('input', recalcular);
  tr.querySelector('.item-preco').addEventListener('input', recalcular);
  tr.querySelector('.btn-remover-item').addEventListener('click', () => {
    tr.remove();
    recalcular();
  });
}

btnAddItem.addEventListener('click', () => criarLinhaItem());

function lerItensDaTabela() {
  return Array.from(corpoItens.querySelectorAll('tr')).map((tr) => ({
    descricao: tr.querySelector('.item-descricao').value.trim(),
    quantidade: Number(tr.querySelector('.item-quantidade').value) || 0,
    precoUnitario: Number(tr.querySelector('.item-preco').value) || 0,
  }));
}

function recalcular() {
  let subtotalGeral = 0;
  corpoItens.querySelectorAll('tr').forEach((tr) => {
    const quantidade = Number(tr.querySelector('.item-quantidade').value) || 0;
    const preco = Number(tr.querySelector('.item-preco').value) || 0;
    const subtotal = quantidade * preco;
    tr.querySelector('.item-subtotal').textContent = formatarMoeda(subtotal);
    subtotalGeral += subtotal;
  });

  const desconto = Number(campoDesconto.value) || 0;
  const total = Math.max(0, subtotalGeral - desconto);
  elTotalValor.textContent = formatarMoeda(total);
}

campoDesconto.addEventListener('input', recalcular);

// ---------- Carregar / preencher ----------
function preencherFormulario(orc) {
  quoteRequestIdAtual = orc.quoteRequestId || null;

  campoNome.value = orc.nome || '';
  campoNomeFestejado.value = orc.nomeFestejado || '';
  campoEmail.value = orc.email || '';
  campoTelefone.value = orc.telefone || '';
  campoTipoEvento.value = orc.tipoEvento || '';
  campoDataEvento.value = formatarDataParaInput(orc.dataEvento);
  campoLocalEvento.value = orc.localEvento || '';

  corpoItens.innerHTML = '';
  if (orc.itens && orc.itens.length) {
    orc.itens.forEach((item) => criarLinhaItem(item));
  } else {
    criarLinhaItem();
  }

  campoDesconto.value = orc.desconto || 0;
  campoValidoAte.value = formatarDataParaInput(orc.validoAte);
  campoStatus.value = orc.status || 'rascunho';
  campoNotas.value = orc.notas || '';

  elTitulo.textContent = orc.nome || 'Orçamento';
  elEyebrow.textContent = 'Orçamento';
  elStatusPill.hidden = false;
  elStatusPill.textContent = orc.status === 'enviado' ? 'Enviado' : 'Rascunho';
  elStatusPill.dataset.status = orc.status === 'enviado' ? 'concluido' : 'nao_respondido';

  if (quoteRequestIdAtual) {
    elDePedido.hidden = false;
    elDePedido.innerHTML = `<a href="/admin/chat.html?id=${quoteRequestIdAtual}">&larr; Ver o pedido original deste cliente</a>`;
  } else {
    elDePedido.hidden = true;
  }

  elZonaPerigo.hidden = false;
  recalcular();
}

function prepararFormularioVazio() {
  elEyebrow.textContent = 'Novo orçamento';
  elTitulo.textContent = 'Orçamento do zero';
  elStatusPill.hidden = true;
  elDePedido.hidden = true;
  campoStatus.value = 'rascunho';
  criarLinhaItem();
  elZonaPerigo.hidden = true;
  recalcular();
}

async function carregar() {
  if (!idOrcamento) {
    elCarregamento.hidden = true;
    form.hidden = false;
    prepararFormularioVazio();
    return;
  }

  const resposta = await fetch(`/api/orcamentos/${idOrcamento}`);
  if (!resposta.ok) {
    elCarregamento.hidden = true;
    elErro.hidden = false;
    return;
  }
  const orc = await resposta.json();
  elCarregamento.hidden = true;
  form.hidden = false;
  preencherFormulario(orc);
}

// ---------- Guardar ----------
form.addEventListener('submit', async (event) => {
  event.preventDefault();

  feedback.textContent = '';
  feedback.className = 'form-feedback';

  const dados = {
    nome: campoNome.value.trim(),
    nomeFestejado: campoNomeFestejado.value.trim(),
    email: campoEmail.value.trim(),
    telefone: campoTelefone.value.trim(),
    tipoEvento: campoTipoEvento.value,
    dataEvento: campoDataEvento.value || '',
    localEvento: campoLocalEvento.value.trim(),
    itens: lerItensDaTabela().filter((item) => item.descricao),
    desconto: Number(campoDesconto.value) || 0,
    validoAte: campoValidoAte.value || '',
    status: campoStatus.value,
    notas: campoNotas.value.trim(),
  };

  if (!dados.nome) {
    feedback.textContent = 'O nome do cliente é obrigatório.';
    feedback.classList.add('erro');
    return;
  }

  btnGuardar.disabled = true;
  btnGuardar.textContent = 'A guardar...';

  try {
    let resposta;
    if (idOrcamento) {
      resposta = await fetch(`/api/orcamentos/${idOrcamento}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
    } else {
      resposta = await fetch('/api/orcamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
    }

    const orc = await resposta.json();

    if (!resposta.ok) {
      feedback.textContent = orc.erro || 'Não foi possível guardar o orçamento.';
      feedback.classList.add('erro');
      return;
    }

    if (!idOrcamento) {
      idOrcamento = orc._id;
      window.history.replaceState({}, '', `/admin/orcamento.html?id=${idOrcamento}`);
    }

    preencherFormulario(orc);
    feedback.textContent = 'Orçamento guardado.';
    feedback.classList.remove('erro');
  } catch (erro) {
    feedback.textContent = 'Não foi possível guardar. Tenta novamente.';
    feedback.classList.add('erro');
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = 'Guardar orçamento';
  }
});

// ---------- Apagar (zona perigosa) ----------
const btnMostrarApagar = document.getElementById('btn-mostrar-apagar');
const painelApagar = document.getElementById('painel-apagar');
const btnCancelarApagar = document.getElementById('btn-cancelar-apagar');
const btnConfirmarApagar = document.getElementById('btn-confirmar-apagar');
const inputSenhaApagar = document.getElementById('apagar-senha');
const feedbackApagar = document.getElementById('apagar-feedback');

btnMostrarApagar?.addEventListener('click', () => {
  painelApagar.hidden = false;
  btnMostrarApagar.hidden = true;
  inputSenhaApagar.focus();
});

btnCancelarApagar?.addEventListener('click', () => {
  painelApagar.hidden = true;
  btnMostrarApagar.hidden = false;
  inputSenhaApagar.value = '';
  feedbackApagar.textContent = '';
  feedbackApagar.className = 'form-feedback';
});

btnConfirmarApagar?.addEventListener('click', async () => {
  const senha = inputSenhaApagar.value;
  feedbackApagar.textContent = '';
  feedbackApagar.className = 'form-feedback';

  if (!senha) {
    feedbackApagar.textContent = 'Escreve a tua palavra-passe para confirmar.';
    feedbackApagar.classList.add('erro');
    return;
  }

  btnConfirmarApagar.disabled = true;
  btnConfirmarApagar.textContent = 'A apagar...';

  try {
    const verificacao = await fetch('/api/admin/auth/verificar-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha }),
    });

    if (!verificacao.ok) {
      feedbackApagar.textContent = 'Palavra-passe incorreta.';
      feedbackApagar.classList.add('erro');
      return;
    }

    const resposta = await fetch(`/api/orcamentos/${idOrcamento}`, { method: 'DELETE' });

    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));
      feedbackApagar.textContent = erro.erro || 'Não foi possível apagar.';
      feedbackApagar.classList.add('erro');
      return;
    }

    window.location.href = '/admin/orcamentos.html';
  } catch (erro) {
    feedbackApagar.textContent = 'Não foi possível apagar. Tenta novamente.';
    feedbackApagar.classList.add('erro');
  } finally {
    btnConfirmarApagar.disabled = false;
    btnConfirmarApagar.textContent = 'Apagar para sempre';
  }
});

protegerPaginaAdmin().then((admin) => {
  if (!admin) return;
  carregar();
});
