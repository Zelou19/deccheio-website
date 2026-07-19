const form = document.getElementById('form-login-admin');
const inputUsername = document.getElementById('admin-username');
const inputSenha = document.getElementById('admin-senha');
const feedback = document.getElementById('login-feedback');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  feedback.textContent = '';
  feedback.className = 'form-feedback';

  const botao = form.querySelector('button[type="submit"]');
  botao.disabled = true;

  try {
    const resposta = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: inputUsername.value.trim(), senha: inputSenha.value }),
    });
    const resultado = await resposta.json();

    if (!resposta.ok) {
      feedback.textContent = resultado.erro || 'Não foi possível entrar.';
      feedback.classList.add('erro');
      return;
    }

    window.location.href = '/admin/';
  } catch (erro) {
    feedback.textContent = 'Não foi possível entrar. Tenta novamente.';
    feedback.classList.add('erro');
  } finally {
    botao.disabled = false;
  }
});

// Se já houver sessão válida, salta logo para o painel
fetch('/api/admin/auth/me').then((resposta) => {
  if (resposta.ok) window.location.href = '/admin/';
});
