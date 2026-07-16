document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('quote-form');
const feedback = document.getElementById('form-feedback');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  feedback.textContent = '';
  feedback.className = 'form-feedback';

  const dados = {
    nome: form.nome.value.trim(),
    email: form.email.value.trim(),
    telefone: form.telefone.value.trim(),
    tipoEvento: form.tipoEvento.value,
    dataEvento: form.dataEvento.value || undefined,
    numeroConvidados: form.numeroConvidados.value || undefined,
    orcamentoAproximado: form.orcamentoAproximado.value.trim(),
    mensagem: form.mensagem.value.trim(),
  };

  const botao = form.querySelector('.btn-submit');
  botao.disabled = true;
  botao.textContent = 'A enviar...';

  try {
    const resposta = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado.erro || 'Algo correu mal.');
    }

    feedback.textContent = 'Pedido enviado! A abrir a tua conversa...';
    feedback.classList.add('sucesso');
    form.reset();

    const idPedido = resultado.pedido._id;
    setTimeout(() => {
      window.location.href = `/pedido.html?id=${idPedido}`;
    }, 900);
  } catch (erro) {
    feedback.textContent = erro.message || 'Não foi possível enviar o pedido. Tenta novamente.';
    feedback.classList.add('erro');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Enviar pedido';
  }
});
