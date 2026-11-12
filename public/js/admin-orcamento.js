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
const campoNumeroConvidados = document.getElementById('orc-numeroConvidados');
const campoVersao = document.getElementById('orc-versao');
const corpoItens = document.getElementById('orc-itens-corpo');
const btnAddItem = document.getElementById('btn-add-item');
const campoDesconto = document.getElementById('orc-desconto');
const elTotalValor = document.getElementById('orc-total-valor');
const campoValidoAte = document.getElementById('orc-validoAte');
const campoStatus = document.getElementById('orc-status');
const campoNotas = document.getElementById('orc-notas');
const feedback = document.getElementById('orc-feedback');
const btnGuardar = document.getElementById('btn-guardar-orcamento');
const btnVerOrcamento = document.getElementById('btn-ver-orcamento');
const elZonaPerigo = document.getElementById('orc-zona-perigo');
const elGaleria = document.getElementById('orc-imagens-galeria');
const inputImagem = document.getElementById('orc-imagem-input');
const feedbackImagens = document.getElementById('orc-imagens-feedback');

let imagensAtuais = []; // data URLs das imagens deste orçamento
const MAX_IMAGENS = 8;

let quoteRequestIdAtual = null;
let contadorLinhas = 0;
let catalogo = null; // catálogo De Cheio (vem de GET /api/orcamentos/base)

function escaparAtributo(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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
  if (item.secao) tr.dataset.secao = item.secao;
  tr.innerHTML = `
    <td>${item.secao ? `<small class="item-secao">${escaparAtributo(item.secao)}</small>` : ''}<input type="text" class="item-descricao" placeholder="ex: Arco de balões" value="${escaparAtributo(item.descricao || '')}"></td>
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
    secao: tr.dataset.secao || undefined,
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

// ---------- Catálogo De Cheio ----------
const elCatalogo = document.getElementById('orc-catalogo');
const selectCatSecao = document.getElementById('cat-secao');
const elCatNota = document.getElementById('cat-nota');
const elCatItens = document.getElementById('cat-itens');

async function carregarCatalogo() {
  try {
    const resposta = await fetch('/api/orcamentos/base');
    if (resposta.ok) catalogo = await resposta.json();
  } catch (erro) {
    catalogo = null; // sem catálogo o editor continua a funcionar como antes
  }
}

function renderizarCatSecao() {
  const secao = catalogo.secoes[Number(selectCatSecao.value)];
  elCatNota.textContent = secao.nota || '';
  elCatNota.hidden = !secao.nota;
  elCatItens.innerHTML = secao.itens.map((item, indice) => `
    <button type="button" class="orc-catalogo-item" data-indice="${indice}">
      <span>${escaparAtributo(item.descricao)}</span>
      <strong>${formatarMoeda(item.precoUnitario)}</strong>
    </button>
  `).join('');
}

function prepararCatalogo() {
  if (!catalogo || !catalogo.secoes?.length) return;
  elCatalogo.hidden = false;
  selectCatSecao.innerHTML = catalogo.secoes
    .map((secao, indice) => `<option value="${indice}">${escaparAtributo(secao.nome)}</option>`)
    .join('');
  renderizarCatSecao();
}

selectCatSecao.addEventListener('change', renderizarCatSecao);

elCatItens.addEventListener('click', (evento) => {
  const botao = evento.target.closest('.orc-catalogo-item');
  if (!botao || !catalogo) return;
  const item = catalogo.secoes[Number(selectCatSecao.value)].itens[Number(botao.dataset.indice)];

  // Se só existir uma linha em branco (a que aparece num orçamento vazio), ocupa-se essa
  corpoItens.querySelectorAll('tr').forEach((tr) => {
    const vazia = !tr.querySelector('.item-descricao').value.trim() && !Number(tr.querySelector('.item-preco').value);
    if (vazia) tr.remove();
  });

  criarLinhaItem({ ...item });
  recalcular();
  feedback.textContent = `Adicionado: ${item.descricao}`;
  feedback.classList.remove('erro');
});

// ---------- Imagens de inspiração ----------
// Reduz a imagem para no máximo 1600px no lado maior e converte para JPEG a 80% de qualidade
// (mesma lógica usada no chat, para as imagens não ficarem pesadas).
function comprimirImagem(ficheiro, ladoMaximo = 1600, qualidade = 0.8) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > ladoMaximo || height > ladoMaximo) {
          if (width > height) {
            height = Math.round(height * (ladoMaximo / width));
            width = ladoMaximo;
          } else {
            width = Math.round(width * (ladoMaximo / height));
            height = ladoMaximo;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', qualidade));
      };
      img.onerror = reject;
      img.src = leitor.result;
    };
    leitor.onerror = reject;
    leitor.readAsDataURL(ficheiro);
  });
}

function renderizarGaleria() {
  if (!imagensAtuais.length) {
    elGaleria.hidden = true;
    elGaleria.innerHTML = '';
    return;
  }
  elGaleria.hidden = false;
  elGaleria.innerHTML = imagensAtuais.map((src, indice) => `
    <div class="orc-imagem-item">
      <img src="${src}" alt="Imagem de inspiração" onclick="window.open(this.src, '_blank')">
      <button type="button" class="orc-imagem-remover" data-indice="${indice}" title="Remover">&times;</button>
    </div>
  `).join('');

  elGaleria.querySelectorAll('.orc-imagem-remover').forEach((botao) => {
    botao.addEventListener('click', () => {
      imagensAtuais.splice(Number(botao.dataset.indice), 1);
      renderizarGaleria();
    });
  });
}

inputImagem.addEventListener('change', async () => {
  feedbackImagens.textContent = '';
  feedbackImagens.className = 'form-feedback';

  const ficheiros = Array.from(inputImagem.files);
  inputImagem.value = '';

  for (const ficheiro of ficheiros) {
    if (imagensAtuais.length >= MAX_IMAGENS) {
      feedbackImagens.textContent = `Só podes ter até ${MAX_IMAGENS} imagens neste orçamento.`;
      feedbackImagens.classList.add('erro');
      break;
    }
    try {
      const dataUrl = await comprimirImagem(ficheiro);
      imagensAtuais.push(dataUrl);
    } catch (erro) {
      feedbackImagens.textContent = 'Não foi possível processar uma das imagens.';
      feedbackImagens.classList.add('erro');
    }
  }

  renderizarGaleria();
});


function preencherFormulario(orc) {
  quoteRequestIdAtual = orc.quoteRequestId || null;

  campoNome.value = orc.nome || '';
  campoNomeFestejado.value = orc.nomeFestejado || '';
  campoEmail.value = orc.email || '';
  campoTelefone.value = orc.telefone || '';
  campoTipoEvento.value = orc.tipoEvento || '';
  campoDataEvento.value = formatarDataParaInput(orc.dataEvento);
  campoLocalEvento.value = orc.localEvento || '';
  campoNumeroConvidados.value = orc.numeroConvidados || '';
  campoVersao.value = orc.versao || 'V00';

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

  imagensAtuais = Array.isArray(orc.imagens) ? [...orc.imagens] : [];
  renderizarGaleria();

  btnVerOrcamento.hidden = false;
  btnVerOrcamento.href = `/admin/orcamento-ver.html?id=${idOrcamento}`;

  recalcular();
}

function prepararFormularioVazio() {
  elEyebrow.textContent = 'Novo orçamento';
  elTitulo.textContent = 'Orçamento do zero';
  elStatusPill.hidden = true;
  elDePedido.hidden = true;
  campoStatus.value = 'rascunho';
  campoVersao.value = 'V00';
  // Orçamento novo arranca com a base De Cheio: valor base + condições padrão
  if (catalogo?.valorBase) criarLinhaItem({ ...catalogo.valorBase });
  else criarLinhaItem();
  if (catalogo?.notasPadrao) campoNotas.value = catalogo.notasPadrao;
  elZonaPerigo.hidden = true;
  imagensAtuais = [];
  renderizarGaleria();
  btnVerOrcamento.hidden = true;
  recalcular();
}

async function carregar() {
  await carregarCatalogo();
  prepararCatalogo();

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
    numeroConvidados: campoNumeroConvidados.value || '',
    versao: campoVersao.value.trim() || 'V00',
    itens: lerItensDaTabela().filter((item) => item.descricao),
    desconto: Number(campoDesconto.value) || 0,
    validoAte: campoValidoAte.value || '',
    status: campoStatus.value,
    notas: campoNotas.value.trim(),
    imagens: imagensAtuais,
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
