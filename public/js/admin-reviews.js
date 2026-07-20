const avisoNaoOwner = document.getElementById('aviso-nao-owner');
const areaOwner = document.getElementById('area-owner');
const listaReviews = document.getElementById('lista-reviews');
const formNovaReview = document.getElementById('form-nova-review');
const feedback = document.getElementById('review-feedback');

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto || '';
  return div.innerHTML;
}

function renderizarEstrelas(nota) {
  return '★'.repeat(nota) + '☆'.repeat(5 - nota);
}

async function carregarReviews() {
  const resposta = await fetch('/api/reviews');
  if (!resposta.ok) return;

  const reviews = await resposta.json();

  if (reviews.length === 0) {
    listaReviews.innerHTML = '<p class="sem-resultados">Ainda não adicionaste nenhuma avaliação.</p>';
    return;
  }

  listaReviews.innerHTML = reviews.map((review) => `
    <div class="review-admin-item" data-id="${review._id}">
      <div>
        <div class="review-admin-estrelas">${renderizarEstrelas(review.classificacao)}</div>
        <p class="review-admin-texto">${escaparHtml(review.texto)}</p>
        <div class="review-admin-autor">${escaparHtml(review.nomeCliente)}${review.tipoEvento ? ` · ${escaparHtml(review.tipoEvento)}` : ''}</div>
      </div>
      <button class="review-admin-apagar" data-id="${review._id}">Apagar</button>
    </div>
  `).join('');
}

formNovaReview.addEventListener('submit', async (event) => {
  event.preventDefault();
  feedback.textContent = '';
  feedback.className = 'form-feedback';

  const nomeCliente = document.getElementById('review-nome').value.trim();
  const tipoEvento = document.getElementById('review-tipo-evento').value.trim();
  const classificacao = document.getElementById('review-estrelas').value;
  const texto = document.getElementById('review-texto').value.trim();

  const resposta = await fetch('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nomeCliente, tipoEvento, texto, classificacao }),
  });
  const resultado = await resposta.json();

  if (!resposta.ok) {
    feedback.textContent = resultado.erro || 'Não foi possível adicionar a avaliação.';
    feedback.classList.add('erro');
    return;
  }

  formNovaReview.reset();
  document.getElementById('review-estrelas').value = '5';
  carregarReviews();
});

listaReviews.addEventListener('click', async (event) => {
  if (!event.target.matches('.review-admin-apagar')) return;
  if (!confirm('Apagar esta avaliação do site?')) return;

  await fetch(`/api/reviews/${event.target.dataset.id}`, { method: 'DELETE' });
  carregarReviews();
});

protegerPaginaAdmin().then((admin) => {
  if (!admin) return;

  if (admin.role !== 'owner') {
    avisoNaoOwner.hidden = false;
    return;
  }

  areaOwner.hidden = false;
  carregarReviews();
});
