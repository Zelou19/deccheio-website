const gate = document.getElementById('admin-gate');
const conteudo = document.getElementById('admin-conteudo');
const gateErro = document.getElementById('gate-erro');
const inputChave = document.getElementById('admin-key-input');

const formNovaCategoria = document.getElementById('form-nova-categoria');
const inputNomeCategoria = document.getElementById('nome-categoria');
const categoriaFeedback = document.getElementById('categoria-feedback');
const listaCategorias = document.getElementById('lista-categorias');

function getChave() {
  return sessionStorage.getItem('adminKey') || '';
}

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto || '';
  return div.innerHTML;
}

// GET /api/categorias é pública (alimenta a página principal), por isso a chave de
// admin é validada aqui contra /api/quotes (endpoint protegido) antes de mostrar o painel.
async function validarChaveEcarregar() {
  const verificacao = await fetch('/api/quotes', { headers: { 'x-admin-key': getChave() } });

  if (!verificacao.ok) {
    sessionStorage.removeItem('adminKey');
    gate.hidden = false;
    conteudo.hidden = true;
    gateErro.textContent = 'Chave incorreta.';
    return;
  }

  await carregarCategorias();
}

async function carregarCategorias() {
  const resposta = await fetch('/api/categorias');

  if (!resposta.ok) {
    listaCategorias.innerHTML = '<p class="sem-resultados">Não foi possível carregar as categorias.</p>';
    return;
  }

  const categorias = await resposta.json();
  gate.hidden = true;
  conteudo.hidden = false;
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
      headers: { 'x-admin-key': getChave() },
    });
    carregarCategorias();
  }

  if (alvo.dataset.acao === 'apagar-foto') {
    await fetch(`/api/categorias/${alvo.dataset.catId}/fotos/${alvo.dataset.fotoId}`, {
      method: 'DELETE',
      headers: { 'x-admin-key': getChave() },
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
      headers: { 'Content-Type': 'application/json', 'x-admin-key': getChave() },
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
    headers: { 'Content-Type': 'application/json', 'x-admin-key': getChave() },
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

document.getElementById('admin-key-btn').addEventListener('click', () => {
  sessionStorage.setItem('adminKey', inputChave.value.trim());
  validarChaveEcarregar();
});

inputChave.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('admin-key-btn').click();
});

if (getChave()) {
  validarChaveEcarregar();
} else {
  gate.hidden = false;
}
