const params = new URLSearchParams(window.location.search);
const idPedido = params.get('id');

const elCarregamento = document.getElementById('estado-carregamento');
const elConteudo = document.getElementById('conteudo-pedido');
const elErro = document.getElementById('estado-erro');
const elTitulo = document.getElementById('pedido-titulo');
const elStatus = document.getElementById('pedido-status');
const elData = document.getElementById('pedido-data');
const btnFecharConversa = document.getElementById('btn-fechar-conversa');
const avisoFechada = document.getElementById('aviso-fechada');
const btnReabrirConversa = document.getElementById('btn-reabrir-conversa');
const elMensagens = document.getElementById('chat-mensagens');
const elImagensPedido = document.getElementById('pedido-imagens');
const form = document.getElementById('chat-form');
const textarea = document.getElementById('chat-texto');
const feedback = document.getElementById('chat-feedback');
const inputImagem = document.getElementById('chat-imagem');
const elImagemNome = document.getElementById('chat-imagem-nome');
const btnRemoverImagem = document.getElementById('chat-imagem-remover');

let imagemSelecionada = null; // data URL da imagem anexada à próxima mensagem

// Reduz a imagem para no máximo 1600px no lado maior e converte para JPEG a 80% de qualidade.
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

inputImagem.addEventListener('change', async () => {
  const ficheiro = inputImagem.files[0];
  if (!ficheiro) return;
  imagemSelecionada = await comprimirImagem(ficheiro);
  elImagemNome.textContent = ficheiro.name;
  btnRemoverImagem.hidden = false;
});

btnRemoverImagem.addEventListener('click', () => {
  imagemSelecionada = null;
  inputImagem.value = '';
  elImagemNome.textContent = '';
  btnRemoverImagem.hidden = true;
});

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

  if (pedido.imagensInspiracao?.length) {
    elImagensPedido.hidden = false;
    elImagensPedido.innerHTML = pedido.imagensInspiracao
      .map((src) => `<img src="${src}" alt="Imagem de inspiração enviada" onclick="window.open(this.src, '_blank')">`)
      .join('');
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

  // Só volta a desenhar as mensagens se o número mudou, para não interromper quem está a escrever
  if (pedido.mensagens.length === ultimaContagemMensagens) return;
  ultimaContagemMensagens = pedido.mensagens.length;

  if (pedido.mensagens.length === 0) {
    elMensagens.innerHTML = '<p class="chat-vazio">Ainda não há mensagens. Escreva a primeira!</p>';
  } else {
    elMensagens.innerHTML = pedido.mensagens
      .map((msg) => {
        const classe = msg.autor === 'admin' ? 'msg-admin' : 'msg-cliente';
        const hora = new Date(msg.criadoEm).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const autor = msg.autor === 'admin' ? 'Equipa DecoraçãoCheio' : 'Você';
        const imagemHtml = msg.imagem ? `<img class="msg-imagem" src="${msg.imagem}" alt="Imagem anexada" onclick="window.open(this.src, '_blank')">` : '';
        return `<div class="msg ${classe}">${imagemHtml}${escaparHtml(msg.texto)}<span class="msg-meta">${hora}</span><span class="msg-autor">${autor}</span></div>`;
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
  if (!texto && !imagemSelecionada) return;

  feedback.textContent = '';
  feedback.className = 'form-feedback';

  try {
    const resposta = await fetch(`/api/quotes/${idPedido}/messages/cliente`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto, imagem: imagemSelecionada }),
    });
    const pedido = await resposta.json();
    if (!resposta.ok) throw new Error(pedido.erro || 'Não foi possível enviar.');

    textarea.value = '';
    imagemSelecionada = null;
    inputImagem.value = '';
    elImagemNome.textContent = '';
    btnRemoverImagem.hidden = true;
    renderizarPedido(pedido);
  } catch (erro) {
    feedback.textContent = erro.message;
    feedback.classList.add('erro');
  }
});

btnFecharConversa?.addEventListener('click', async () => {
  try {
    const resposta = await fetch(`/api/quotes/${idPedido}/fechar`, { method: 'PATCH' });
    const pedido = await resposta.json();
    if (resposta.ok) renderizarPedido(pedido);
  } catch (erro) {
    // se falhar, o botão continua visível e a pessoa pode tentar de novo
  }
});

btnReabrirConversa?.addEventListener('click', async () => {
  try {
    const resposta = await fetch(`/api/quotes/${idPedido}/reabrir`, { method: 'PATCH' });
    const pedido = await resposta.json();
    if (resposta.ok) renderizarPedido(pedido);
  } catch (erro) {
    // se falhar, o aviso continua visível e a pessoa pode tentar de novo
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
