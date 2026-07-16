const tabLogin = document.getElementById('tab-login');
const tabRegisto = document.getElementById('tab-registo');
const formLogin = document.getElementById('form-login');
const formRegisto = document.getElementById('form-registo');
const feedback = document.getElementById('auth-feedback');

const params = new URLSearchParams(window.location.search);
const redirecionarPara = params.get('redirecionar') || '/';

function mostrarErro(mensagem) {
  feedback.textContent = mensagem;
  feedback.className = 'form-feedback erro';
}

function limparFeedback() {
  feedback.textContent = '';
  feedback.className = 'form-feedback';
}

tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('ativo');
  tabRegisto.classList.remove('ativo');
  formLogin.classList.remove('auth-hidden');
  formRegisto.classList.add('auth-hidden');
  limparFeedback();
});

tabRegisto.addEventListener('click', () => {
  tabRegisto.classList.add('ativo');
  tabLogin.classList.remove('ativo');
  formRegisto.classList.remove('auth-hidden');
  formLogin.classList.add('auth-hidden');
  limparFeedback();
});

formLogin.addEventListener('submit', async (event) => {
  event.preventDefault();
  limparFeedback();

  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;

  try {
    const resposta = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível iniciar sessão.');

    window.location.href = redirecionarPara;
  } catch (erro) {
    mostrarErro(erro.message);
  }
});

formRegisto.addEventListener('submit', async (event) => {
  event.preventDefault();
  limparFeedback();

  const nome = document.getElementById('registo-nome').value.trim();
  const email = document.getElementById('registo-email').value.trim();
  const senha = document.getElementById('registo-senha').value;

  try {
    const resposta = await fetch('/api/auth/registo', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha }),
    });
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível criar a conta.');

    window.location.href = redirecionarPara;
  } catch (erro) {
    mostrarErro(erro.message);
  }
});

// ---------- Login com Google ----------
async function iniciarLoginGoogle() {
  try {
    const resposta = await fetch('/api/config');
    const { googleClientId } = await resposta.json();

    if (!googleClientId || typeof google === 'undefined') {
      document.getElementById('google-btn').innerHTML =
        '<p style="color: var(--taupe); font-size: 0.82rem;">Login com Google indisponível de momento.</p>';
      return;
    }

    google.accounts.id.initialize({
      client_id: googleClientId,
      callback: enviarCredencialGoogle,
    });

    google.accounts.id.renderButton(document.getElementById('google-btn'), {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      width: 300,
    });
  } catch (erro) {
    console.error('Erro ao preparar o login com Google:', erro);
  }
}

async function enviarCredencialGoogle(resposta) {
  limparFeedback();
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: resposta.credential }),
    });
    const dados = await res.json();
    if (!res.ok) throw new Error(dados.erro || 'Não foi possível entrar com o Google.');

    window.location.href = redirecionarPara;
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

window.addEventListener('load', iniciarLoginGoogle);
