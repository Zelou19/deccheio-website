document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('quote-form');
const feedback = document.getElementById('form-feedback');
const elLoading = document.getElementById('orcamento-loading');
const elGate = document.getElementById('orcamento-gate');

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
