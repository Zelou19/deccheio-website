const listaCategorias = document.getElementById('lista-categorias');
const formNovaCategoria = document.getElementById('form-nova-categoria');
const inputNomeCategoria = document.getElementById('nome-categoria');
const categoriaFeedback = document.getElementById('categoria-feedback');

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto || '';
  return div.innerHTML;
}

async function carregarCategorias() {
  const resposta = await fetch('/api/categorias');

  if (!resposta.ok) {
    listaCategorias.innerHTML = '<p class="sem-resultados">Não foi possível carregar as categorias.</p>';
    return;
  }

  const categorias = await resposta.json();
  renderizarCategorias(categorias);
}

function renderizarCategorias(categorias) {
  if (categorias.length === 0) {
    listaCategorias.innerHTML = '<p class="sem-resultados">Ainda não criaste nenhuma categoria.</p>';
    return;
  }

  listaCategorias.innerHTML = categorias.map((cat) => `
    <div class="categoria-bloco" data-id="${cat._id}">
      <div class="categoria-bloco-header">
        <h3>${escaparHtml(cat.nome)}</h3>
        <button class="categoria-apagar" data-acao="apagar-categoria" data-id="${cat._id}">Apagar categoria</button>
      </div>

      ${cat.fotos.length === 0
        ? '<p class="categoria-sem-fotos">Ainda sem fotos.</p>'
        : `<div class="categoria-fotos-grid">
            ${cat.fotos.map((foto) => `
              <div class="foto-item">
                <img src="${foto.dataUrl}" alt="${escaparHtml(foto.legenda) || escaparHtml(cat.nome)}">
                <button class="foto-apagar" title="Apagar foto" data-acao="apagar-foto" data-cat-id="${cat._id}" data-foto-id="${foto._id}">&times;</button>
              </div>
            `).join('')}
          </div>`
      }

      <div class="upload-foto">
        <label>
          Adicionar foto
          <input type="file" accept="image/*" data-acao="upload-foto" data-cat-id="${cat._id}">
        </label>
        <span class="upload-estado" data-estado-id="${cat._id}"></span>
      </div>
    </div>
  `).join('');
}

function ficheiroParaDataUrl(ficheiro) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = reject;
    leitor.readAsDataURL(ficheiro);
  });
}

listaCategorias.addEventListener('click', async (event) => {
  const alvo = event.target;

  if (alvo.dataset.acao === 'apagar-categoria') {
    if (!confirm('Apagar esta categoria e todas as suas fotos?')) return;
    await fetch(`/api/categorias/${alvo.dataset.id}`, {
      method: 'DELETE',
    });
    carregarCategorias();
  }

  if (alvo.dataset.acao === 'apagar-foto') {
    await fetch(`/api/categorias/${alvo.dataset.catId}/fotos/${alvo.dataset.fotoId}`, {
      method: 'DELETE',
    });
    carregarCategorias();
  }
});

listaCategorias.addEventListener('change', async (event) => {
  const alvo = event.target;
  if (alvo.dataset.acao !== 'upload-foto') return;

  const ficheiro = alvo.files[0];
  if (!ficheiro) return;

  const catId = alvo.dataset.catId;
  const estado = document.querySelector(`[data-estado-id="${catId}"]`);
  estado.textContent = 'A enviar...';

  try {
    const dataUrl = await ficheiroParaDataUrl(ficheiro);
    const resposta = await fetch(`/api/categorias/${catId}/fotos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl }),
    });

    if (!resposta.ok) {
      const erro = await resposta.json();
      throw new Error(erro.erro || 'Não foi possível enviar a foto.');
    }

    carregarCategorias();
  } catch (erro) {
    estado.textContent = erro.message;
  }
});

formNovaCategoria.addEventListener('submit', async (event) => {
  event.preventDefault();
  categoriaFeedback.textContent = '';
  categoriaFeedback.className = 'form-feedback';

  const nome = inputNomeCategoria.value.trim();
  if (!nome) return;

  const resposta = await fetch('/api/categorias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome }),
  });
  const resultado = await resposta.json();

  if (!resposta.ok) {
    categoriaFeedback.textContent = resultado.erro || 'Não foi possível criar a categoria.';
    categoriaFeedback.classList.add('erro');
    return;
  }

  inputNomeCategoria.value = '';
  carregarCategorias();
});

protegerPaginaAdmin().then((admin) => {
  if (admin) carregarCategorias();
});
