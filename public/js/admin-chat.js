const params = new URLSearchParams(window.location.search);
const idPedido = params.get('id');

function getChave() {
  return sessionStorage.getItem('adminKey') || '';
}

const elCarregamento = document.getElementById('estado-carregamento');
const elConteudo = document.getElementById('conteudo-pedido');
const elErro = document.getElementById('estado-erro');
const elTipo = document.getElementById('pedido-tipo');
const elTitulo = document.getElementById('pedido-titulo');
const elEmail = document.getElementById('pedido-email');
const elTelefone = document.getElementById('pedido-telefone');
const elDetalhes = document.getElementById('pedido-detalhes');
const elStatus = document.getElementById('pedido-status');
const selectStatus = document.getElementById('status-select');
const elMensagens = document.getElementById('chat-mensagens');
const form = document.getElementById('chat-form');
const textarea = document.getElementById('chat-texto');
const feedback = document.getElementById('chat-feedback');

const ROTULOS_STATUS = {
  nao_respondido: 'Não respondido',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
};

let ultimaContagemMensagens = -1;

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function renderizarPedido(pedido) {
  elTipo.textContent = pedido.tipoEvento;
  elTitulo.textContent = pedido.nome;
  elEmail.textContent = pedido.email;
  elTelefone.textContent = pedido.telefone || '';
  elDetalhes.textContent = [
    pedido.dataEvento ? `Data: ${new Date(pedido.dataEvento).toLocaleDateString('pt-PT')}` : null,
    pedido.numeroConvidados ? `${pedido.numeroConvidados} convidados` : null,
    pedido.orcamentoAproximado ? `Orçamento: ${pedido.orcamentoAproximado}` : null,
    pedido.mensagem || null,
  ].filter(Boolean).join(' · ');

  elStatus.textContent = ROTULOS_STATUS[pedido.status];
  elStatus.dataset.status = pedido.status;
  selectStatus.value = pedido.status;

  if (pedido.mensagens.length === ultimaContagemMensagens) return;
  ultimaContagemMensagens = pedido.mensagens.length;

  elMensagens.innerHTML = pedido.mensagens.length === 0
    ? '<p class="chat-vazio">Ainda sem mensagens.</p>'
    : pedido.mensagens.map((msg) => {
        const classe = msg.autor === 'admin' ? 'msg-admin' : 'msg-cliente';
        const hora = new Date(msg.criadoEm).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        return `<div class="msg ${classe}">${escaparHtml(msg.texto)}<span class="msg-meta">${hora}</span></div>`;
      }).join('');
  elMensagens.scrollTop = elMensagens.scrollHeight;
}

async function carregarPedido() {
  const resposta = await fetch(`/api/quotes/${idPedido}`);
  if (!resposta.ok) {
    elCarregamento.hidden = true;
    elErro.hidden = false;
    return;
  }
  const pedido = await resposta.json();
  elCarregamento.hidden = true;
  elConteudo.hidden = false;
  renderizarPedido(pedido);
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const texto = textarea.value.trim();
  if (!texto) return;

  feedback.textContent = '';
  feedback.className = 'form-feedback';

  const resposta = await fetch(`/api/quotes/${idPedido}/messages/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': getChave() },
    body: JSON.stringify({ texto }),
  });
  const pedido = await resposta.json();

  if (!resposta.ok) {
    feedback.textContent = pedido.erro || 'Não foi possível enviar.';
    feedback.classList.add('erro');
    return;
  }

  textarea.value = '';
  renderizarPedido(pedido);
});

selectStatus.addEventListener('change', async () => {
  await fetch(`/api/quotes/${idPedido}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': getChave() },
    body: JSON.stringify({ status: selectStatus.value }),
  });
  carregarPedido();
});

// ---------- Apagar conversa (zona perigosa) ----------
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
    feedbackApagar.textContent = 'Escreve a palavra-passe para confirmar.';
    feedbackApagar.classList.add('erro');
    return;
  }

  btnConfirmarApagar.disabled = true;
  btnConfirmarApagar.textContent = 'A apagar...';

  try {
    // Nota: usa-se sempre a palavra-passe escrita agora neste campo (não a guardada em sessão),
    // de propósito — é essa a confirmação extra pedida para uma ação irreversível.
    const resposta = await fetch(`/api/quotes/${idPedido}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': senha },
    });

    if (resposta.status === 401) {
      feedbackApagar.textContent = 'Palavra-passe incorreta.';
      feedbackApagar.classList.add('erro');
      return;
    }
    if (!resposta.ok) {
      const erro = await resposta.json().catch(() => ({}));
      feedbackApagar.textContent = erro.erro || 'Não foi possível apagar.';
      feedbackApagar.classList.add('erro');
      return;
    }

    window.location.href = '/admin/';
  } catch (erro) {
    feedbackApagar.textContent = 'Não foi possível apagar. Tenta novamente.';
    feedbackApagar.classList.add('erro');
  } finally {
    btnConfirmarApagar.disabled = false;
    btnConfirmarApagar.textContent = 'Apagar para sempre';
  }
});

if (!idPedido) {
  elCarregamento.hidden = true;
  elErro.hidden = false;
} else {
  carregarPedido();
  setInterval(carregarPedido, 5000);
}
