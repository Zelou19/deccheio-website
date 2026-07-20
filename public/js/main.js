document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('quote-form');
const feedback = document.getElementById('form-feedback');
const elLoading = document.getElementById('orcamento-loading');
const elGate = document.getElementById('orcamento-gate');
const inputImagens = document.getElementById('imagens');
const previewImagens = document.getElementById('imagens-preview');

const MAX_IMAGENS = 5;
let imagensSelecionadas = []; // array de data URLs (já comprimidas)

// Reduz a imagem para no máximo 1600px no lado maior e converte para JPEG a 80% de
// qualidade — mantém as fotos de inspiração leves antes de irem em base64 no pedido.
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

function renderizarPreviewImagens() {
  previewImagens.innerHTML = imagensSelecionadas
    .map(
      (dataUrl, indice) => `
      <div class="imagem-preview-item">
        <img src="${dataUrl}" alt="Pré-visualização ${indice + 1}">
        <button type="button" class="imagem-preview-remover" data-indice="${indice}" aria-label="Remover imagem">&times;</button>
      </div>
    `
    )
    .join('');
}

inputImagens.addEventListener('change', async () => {
  const ficheiros = Array.from(inputImagens.files);
  const espacoDisponivel = MAX_IMAGENS - imagensSelecionadas.length;

  if (ficheiros.length > espacoDisponivel) {
    feedback.textContent = `Só pode escolher até ${MAX_IMAGENS} imagens no total.`;
    feedback.className = 'form-feedback erro';
  }

  const aProcessar = ficheiros.slice(0, espacoDisponivel);
  for (const ficheiro of aProcessar) {
    try {
      const dataUrl = await comprimirImagem(ficheiro);
      imagensSelecionadas.push(dataUrl);
    } catch (erro) {
      // se uma imagem falhar a processar, ignora-a e segue com as restantes
    }
  }

  inputImagens.value = '';
  renderizarPreviewImagens();
});

previewImagens.addEventListener('click', (event) => {
  const botao = event.target.closest('.imagem-preview-remover');
  if (!botao) return;
  imagensSelecionadas.splice(Number(botao.dataset.indice), 1);
  renderizarPreviewImagens();
});

// É preciso ter sessão iniciada para pedir orçamento — assim a pessoa consegue
// acompanhar a conversa depois em "Os meus orçamentos", sem depender só do link.
(async function verificarSessaoOrcamento() {
  try {
    const resposta = await fetch('/api/auth/me', { credentials: 'include' });
    elLoading.hidden = true;

    if (!resposta.ok) {
      elGate.hidden = false;
      return;
    }

    const { user } = await resposta.json();
    form.hidden = false;
    if (user?.nome) form.nome.value = user.nome;
    if (user?.email) form.email.value = user.email;
  } catch (erro) {
    elLoading.hidden = true;
    elGate.hidden = false;
  }
})();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  feedback.textContent = '';
  feedback.className = 'form-feedback';

  const dados = {
    nome: form.nome.value.trim(),
    nomeFestejado: form.nomeFestejado.value.trim(),
    email: form.email.value.trim(),
    telefone: form.telefone.value.trim(),
    tipoEvento: form.tipoEvento.value,
    dataEvento: form.dataEvento.value || undefined,
    localEvento: form.localEvento.value.trim(),
    numeroConvidados: form.numeroConvidados.value || undefined,
    orcamentoAproximado: form.orcamentoAproximado.value.trim(),
    mensagem: form.mensagem.value.trim(),
    imagens: imagensSelecionadas,
  };

  const botao = form.querySelector('.btn-submit');
  botao.disabled = true;
  botao.textContent = 'A enviar...';

  try {
    const resposta = await fetch('/api/quotes', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado.erro || 'Algo correu mal.');
    }

    feedback.textContent = 'Pedido enviado! A abrir a sua conversa...';
    feedback.classList.add('sucesso');
    form.reset();
    imagensSelecionadas = [];
    renderizarPreviewImagens();

    const idPedido = resultado.pedido._id;
    setTimeout(() => {
      window.location.href = `/pedido.html?id=${idPedido}`;
    }, 900);
  } catch (erro) {
    feedback.textContent = erro.message || 'Não foi possível enviar o pedido. Tente novamente.';
    feedback.classList.add('erro');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Enviar pedido';
  }
});
