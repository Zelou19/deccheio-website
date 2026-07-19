const params = new URLSearchParams(window.location.search);
const idPedido = params.get('id');

const elCarregamento = document.getElementById('estado-carregamento');
const elConteudo = document.getElementById('conteudo-pedido');
const elErro = document.getElementById('estado-erro');
const elTipo = document.getElementById('pedido-tipo');
const elTitulo = document.getElementById('pedido-titulo');
const elEmail = document.getElementById('pedido-email');
const elTelefone = document.getElementById('pedido-telefone');
const elDetalhes = document.getElementById('pedido-detalhes');
const elInfoVista = document.getElementById('pedido-info-vista');
const btnEditarPedido = document.getElementById('btn-editar-pedido');
const formEditar = document.getElementById('form-editar-pedido');
const btnCancelarEditar = document.getElementById('btn-cancelar-editar');
const feedbackEditar = document.getElementById('editar-feedback');
const elStatus = document.getElementById('pedido-status');
const selectStatus = document.getElementById('status-select');
const btnFecharConversa = document.getElementById('btn-fechar-conversa');
const btnAddCalendario = document.getElementById('btn-add-calendario');
const avisoFechada = document.getElementById('aviso-fechada');
const btnReabrirConversa = document.getElementById('btn-reabrir-conversa');
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
let pedidoAtual = null;

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

// Formata a data do evento como YYYYMMDD/YYYYMMDD+1 (o Google Calendar pede a data
// de fim seguinte, mesmo para eventos de dia inteiro) e monta o link de "adicionar evento".
function linkGoogleCalendar(pedido) {
  const data = new Date(pedido.dataEvento);
  const paraYYYYMMDD = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');

  const inicio = paraYYYYMMDD(data);
  const fim = new Date(data);
  fim.setUTCDate(fim.getUTCDate() + 1);

  const detalhes = [
    pedido.numeroConvidados ? `${pedido.numeroConvidados} convidados` : null,
    pedido.orcamentoAproximado ? `Orçamento: ${pedido.orcamentoAproximado}` : null,
    pedido.mensagem || null,
    `Contacto: ${pedido.email}${pedido.telefone ? ' · ' + pedido.telefone : ''}`,
  ].filter(Boolean).join('\n');

  const parametros = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${pedido.tipoEvento} — ${pedido.nome}`,
    dates: `${inicio}/${paraYYYYMMDD(fim)}`,
    details: detalhes,
    location: pedido.localEvento || '',
  });

  return `https://calendar.google.com/calendar/render?${parametros.toString()}`;
}

function renderizarPedido(pedido) {
  pedidoAtual = pedido;

  elTipo.textContent = pedido.tipoEvento;
  elTitulo.textContent = pedido.nome;
  elEmail.textContent = pedido.email;
  elTelefone.textContent = pedido.telefone || '';
  elDetalhes.textContent = [
    pedido.nomeFestejado ? `Para: ${pedido.nomeFestejado}` : null,
    pedido.dataEvento ? `Data: ${new Date(pedido.dataEvento).toLocaleDateString('pt-PT')}` : null,
    pedido.localEvento ? `Local: ${pedido.localEvento}` : null,
    pedido.numeroConvidados ? `${pedido.numeroConvidados} convidados` : null,
    pedido.orcamentoAproximado ? `Orçamento: ${pedido.orcamentoAproximado}` : null,
    pedido.mensagem || null,
  ].filter(Boolean).join(' · ');

  elStatus.textContent = ROTULOS_STATUS[pedido.status];
  elStatus.dataset.status = pedido.status;
  selectStatus.value = pedido.status;

  if (pedido.dataEvento) {
    btnAddCalendario.hidden = false;
    btnAddCalendario.href = linkGoogleCalendar(pedido);
  } else {
    btnAddCalendario.hidden = true;
  }

  if (pedido.fechado) {
    btnFecharConversa.hidden = true;
    avisoFechada.hidden = false;
    form.hidden = true;
  } else {
    btnFecharConversa.hidden = false;
    avisoFechada.hidden = true;
    form.hidden = false;
  }

  if (pedido.mensagens.length === ultimaContagemMensagens) return;
  ultimaContagemMensagens = pedido.mensagens.length;

  elMensagens.innerHTML = pedido.mensagens.length === 0
    ? '<p class="chat-vazio">Ainda sem mensagens.</p>'
    : pedido.mensagens.map((msg) => {
        const classe = msg.autor === 'admin' ? 'msg-admin' : 'msg-cliente';
        const hora = new Date(msg.criadoEm).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const autor = msg.autor === 'admin' ? (msg.enviadoPor || 'Equipa DecoraçãoCheio') : `Cliente: ${pedido.nome}`;
        return `<div class="msg ${classe}">${escaparHtml(msg.texto)}<span class="msg-meta">${hora}</span><span class="msg-autor">${escaparHtml(autor)}</span></div>`;
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

// ---------- Editar dados do pedido ----------
function formatarDataParaInput(iso) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

function abrirEdicao() {
  if (!pedidoAtual) return;

  document.getElementById('edit-nome').value = pedidoAtual.nome || '';
  document.getElementById('edit-nomeFestejado').value = pedidoAtual.nomeFestejado || '';
  document.getElementById('edit-email').value = pedidoAtual.email || '';
  document.getElementById('edit-telefone').value = pedidoAtual.telefone || '';
  document.getElementById('edit-tipoEvento').value = pedidoAtual.tipoEvento || '';
  document.getElementById('edit-dataEvento').value = formatarDataParaInput(pedidoAtual.dataEvento);
  document.getElementById('edit-localEvento').value = pedidoAtual.localEvento || '';
  document.getElementById('edit-numeroConvidados').value = pedidoAtual.numeroConvidados ?? '';
  document.getElementById('edit-orcamentoAproximado').value = pedidoAtual.orcamentoAproximado || '';
  document.getElementById('edit-mensagem').value = pedidoAtual.mensagem || '';

  feedbackEditar.textContent = '';
  feedbackEditar.className = 'form-feedback';

  elInfoVista.hidden = true;
  elDetalhes.hidden = true;
  formEditar.hidden = false;
  btnEditarPedido.hidden = true;
}

function fecharEdicao() {
  formEditar.hidden = true;
  elInfoVista.hidden = false;
  elDetalhes.hidden = false;
  btnEditarPedido.hidden = false;
}

btnEditarPedido?.addEventListener('click', abrirEdicao);
btnCancelarEditar?.addEventListener('click', fecharEdicao);

formEditar?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const alteracoes = {
    nome: document.getElementById('edit-nome').value.trim(),
    nomeFestejado: document.getElementById('edit-nomeFestejado').value.trim(),
    email: document.getElementById('edit-email').value.trim(),
    telefone: document.getElementById('edit-telefone').value.trim(),
    tipoEvento: document.getElementById('edit-tipoEvento').value,
    dataEvento: document.getElementById('edit-dataEvento').value || '',
    localEvento: document.getElementById('edit-localEvento').value.trim(),
    numeroConvidados: document.getElementById('edit-numeroConvidados').value || '',
    orcamentoAproximado: document.getElementById('edit-orcamentoAproximado').value.trim(),
    mensagem: document.getElementById('edit-mensagem').value.trim(),
  };

  feedbackEditar.textContent = '';
  feedbackEditar.className = 'form-feedback';

  const botaoGuardar = formEditar.querySelector('button[type="submit"]');
  botaoGuardar.disabled = true;

  try {
    const resposta = await fetch(`/api/quotes/${idPedido}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alteracoes),
    });
    const pedido = await resposta.json();

    if (!resposta.ok) {
      feedbackEditar.textContent = pedido.erro || 'Não foi possível guardar as alterações.';
      feedbackEditar.classList.add('erro');
      return;
    }

    renderizarPedido(pedido);
    fecharEdicao();
  } catch (erro) {
    feedbackEditar.textContent = 'Não foi possível guardar. Tenta novamente.';
    feedbackEditar.classList.add('erro');
  } finally {
    botaoGuardar.disabled = false;
  }
});

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const texto = textarea.value.trim();
  if (!texto) return;

  feedback.textContent = '';
  feedback.className = 'form-feedback';

  const resposta = await fetch(`/api/quotes/${idPedido}/messages/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: selectStatus.value }),
  });
  carregarPedido();
});

btnFecharConversa?.addEventListener('click', async () => {
  await fetch(`/api/quotes/${idPedido}/fechar`, {
    method: 'PATCH',
  });
  carregarPedido();
});

btnReabrirConversa?.addEventListener('click', async () => {
  await fetch(`/api/quotes/${idPedido}/reabrir`, {
    method: 'PATCH',
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
    feedbackApagar.textContent = 'Escreve a tua palavra-passe para confirmar.';
    feedbackApagar.classList.add('erro');
    return;
  }

  btnConfirmarApagar.disabled = true;
  btnConfirmarApagar.textContent = 'A apagar...';

  try {
    // Confirmação extra para uma ação irreversível: verifica sempre a palavra-passe
    // escrita agora neste campo (a da tua própria conta), mesmo já tendo sessão aberta.
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

    const resposta = await fetch(`/api/quotes/${idPedido}`, { method: 'DELETE' });

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
  protegerPaginaAdmin().then((admin) => {
    if (!admin) return;
    carregarPedido();
    setInterval(carregarPedido, 5000);
  });
}
