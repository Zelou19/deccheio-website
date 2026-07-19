const elAbas = document.getElementById('eventos-abas');
const elGrid = document.getElementById('eventos-grid');

let categorias = [];
let categoriaAtiva = null;

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto || '';
  return div.innerHTML;
}

function renderizarAbas() {
  elAbas.innerHTML = categorias.map((cat) => `
    <button class="eventos-aba ${cat._id === categoriaAtiva ? 'ativa' : ''}" data-id="${cat._id}">
      ${escaparHtml(cat.nome)}
    </button>
  `).join('');
}

function renderizarGrid() {
  const categoria = categorias.find((c) => c._id === categoriaAtiva);

  if (!categoria || categoria.fotos.length === 0) {
    elGrid.innerHTML = '<p class="eventos-vazio">Ainda sem fotos nesta categoria.</p>';
    return;
  }

  elGrid.innerHTML = categoria.fotos.map((foto) => `
    <div class="foto-item">
      <img src="${foto.dataUrl}" alt="${escaparHtml(foto.legenda) || escaparHtml(categoria.nome)}" loading="lazy">
    </div>
  `).join('');
}

elAbas.addEventListener('click', (event) => {
  const id = event.target.dataset.id;
  if (!id) return;
  categoriaAtiva = id;
  renderizarAbas();
  renderizarGrid();
});

async function carregarEventos() {
  try {
    const resposta = await fetch('/api/categorias');
    if (!resposta.ok) return;

    categorias = await resposta.json();
    if (categorias.length === 0) {
      elGrid.innerHTML = '<p class="eventos-vazio">Em breve, fotos dos nossos eventos.</p>';
      return;
    }

    categoriaAtiva = categorias[0]._id;
    renderizarAbas();
    renderizarGrid();
  } catch (erro) {
    // secção fica simplesmente vazia se algo correr mal
  }
}

carregarEventos();
