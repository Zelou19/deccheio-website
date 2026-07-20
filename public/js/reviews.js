const elGrid = document.getElementById('reviews-grid');

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto || '';
  return div.innerHTML;
}

function renderizarEstrelas(nota) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += i <= nota ? '★' : '<span class="vazia">★</span>';
  }
  return html;
}

async function carregarReviews() {
  try {
    const resposta = await fetch('/api/reviews');
    if (!resposta.ok) return;

    const reviews = await resposta.json();
    if (reviews.length === 0) {
      elGrid.innerHTML = '<p class="reviews-vazio">Em breve, testemunhos de quem já celebrou connosco.</p>';
      return;
    }

    elGrid.innerHTML = reviews.map((review) => `
      <article class="review-card">
        <div class="review-estrelas">${renderizarEstrelas(review.classificacao)}</div>
        <p class="review-texto">${escaparHtml(review.texto)}</p>
        <div>
          <div class="review-autor">${escaparHtml(review.nomeCliente)}</div>
          ${review.tipoEvento ? `<div class="review-tipo-evento">${escaparHtml(review.tipoEvento)}</div>` : ''}
        </div>
      </article>
    `).join('');
  } catch (erro) {
    // secção fica simplesmente vazia se algo correr mal
  }
}

carregarReviews();
