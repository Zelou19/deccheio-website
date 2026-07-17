const params = new URLSearchParams(window.location.search);
const idPedido = params.get('id');

const elCarregamento = document.getElementById('estado-carregamento');
const elConteudo = document.getElementById('conteudo-pedido');
const elErro = document.getElementById('estado-erro');
const elTitulo = document.getElementById('pedido-titulo');
const elStatus = document.getElementById('pedido-status');
const elData = document.getElementById('pedido-data');
const elMensagens = document.getElementById('chat-mensagens');
const form = document.getElementById('chat-form');
const textarea = document.getElementById('chat-texto');
const feedback = document.getElementById('chat-feedback');

const ROTULOS_STATUS = {
  nao_respondido: 'Ainda não respondido',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
};

let ultimaContagemMensagens = -1;

function formatarData(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
}

function renderizarPedido(pedido) {
  elTitulo.textContent = `${pedido.tipoEvento} — ${pedido.nome}`;
  elStatus.textContent = ROTULOS_STATUS[pedido.status] || pedido.status;
  elStatus.dataset.status = pedido.status;
  elData.textContent = `Pedido feito a ${formatarData(pedido.createdAt)}`;

  // Só volta a desenhar as mensagens se o número mudou, para não interromper quem está a escrever
  if (pedido.mensagens.length === ultimaContagemMensagens) return;
  ultimaContagemMensagens = pedido.mensagens.length;

  if (pedido.mensagens.length === 0) {
    elMensagens.innerHTML = '<p class="chat-vazio">Ainda não há mensagens. Escreve a primeira!</p>';
  } else {
    elMensagens.innerHTML = pedido.mensagens
      .map((msg) => {
        const classe = msg.autor === 'admin' ? 'msg-admin' : 'msg-cliente';
        const hora = new Date(msg.criadoEm).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        return `<div class="msg ${classe}">${escaparHtml(msg.texto)}<span class="msg-meta">${hora}</span></div>`;
      })
      .join('');
  }
  elMensagens.scrollTop = elMensagens.scrollHeight;
}

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

async function carregarPedido() {
  try {
    const resposta = await fetch(`/api/quotes/${idPedido}`);
    if (!resposta.ok) throw new Error('não encontrado');
    const pedido = await resposta.json();

    elCarregamento.hidden = true;
    elConteudo.hidden = false;
    renderizarPedido(pedido);
  } catch (erro) {
    elCarregamento.hidden = true;
    elErro.hidden = false;
  }
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const texto = textarea.value.trim();
  if (!texto) return;

  feedback.textContent = '';
  feedback.className = 'form-feedback';

  try {
    const resposta = await fetch(`/api/quotes/${idPedido}/messages/cliente`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto }),
    });
    const pedido = await resposta.json();
    if (!resposta.ok) throw new Error(pedido.erro || 'Não foi possível enviar.');

    textarea.value = '';
    renderizarPedido(pedido);
  } catch (erro) {
    feedback.textContent = erro.message;
    feedback.classList.add('erro');
  }
});

async function mostrarLinkOrcamentosSeAutenticado() {
  try {
    const resposta = await fetch('/api/auth/me', { credentials: 'include' });
    if (resposta.ok) document.getElementById('link-orcamentos').hidden = false;
  } catch (erro) {
    // sem sessão — não mostra o link
  }
}

if (!idPedido) {
  elCarregamento.hidden = true;
  elErro.hidden = false;
} else {
  carregarPedido();
  mostrarLinkOrcamentosSeAutenticado();
  setInterval(carregarPedido, 5000); // faz "polling" — verifica novas mensagens a cada 5 segundos
}
