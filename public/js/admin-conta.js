const contaInfo = document.getElementById('conta-info');
const secaoUtilizadores = document.getElementById('secao-utilizadores');
const listaUtilizadores = document.getElementById('lista-utilizadores');

const formMudarSenha = document.getElementById('form-mudar-senha');
const senhaFeedback = document.getElementById('senha-feedback');

const formMudarEmail = document.getElementById('form-mudar-email');
const emailFeedback = document.getElementById('email-feedback');

const formNovoUtilizador = document.getElementById('form-novo-utilizador');
const utilizadorFeedback = document.getElementById('utilizador-feedback');

const ROTULOS_ROLE = { owner: 'Dono da conta', admin: 'Admin' };

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto || '';
  return div.innerHTML;
}

formMudarEmail.addEventListener('submit', async (event) => {
  event.preventDefault();
  emailFeedback.textContent = '';
  emailFeedback.className = 'form-feedback';

  const email = document.getElementById('email-novo').value.trim();
  const senhaAtual = document.getElementById('email-senha-atual').value;

  const resposta = await fetch('/api/admin/auth/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senhaAtual }),
  });
  const resultado = await resposta.json();

  if (!resposta.ok) {
    emailFeedback.textContent = resultado.erro || 'Não foi possível guardar o email.';
    emailFeedback.classList.add('erro');
    return;
  }

  emailFeedback.textContent = 'Email guardado. Já podes usá-lo para entrar no painel.';
  document.getElementById('email-senha-atual').value = '';
  contaInfo.textContent = `A usar a conta "${resultado.admin.username}" (${ROTULOS_ROLE[resultado.admin.role] || resultado.admin.role})`;
});

formMudarSenha.addEventListener('submit', async (event) => {
  event.preventDefault();
  senhaFeedback.textContent = '';
  senhaFeedback.className = 'form-feedback';

  const senhaAtual = document.getElementById('senha-atual').value;
  const novaSenha = document.getElementById('senha-nova').value;

  const resposta = await fetch('/api/admin/auth/senha', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senhaAtual, novaSenha }),
  });
  const resultado = await resposta.json();

  if (!resposta.ok) {
    senhaFeedback.textContent = resultado.erro || 'Não foi possível mudar a palavra-passe.';
    senhaFeedback.classList.add('erro');
    return;
  }

  senhaFeedback.textContent = 'Palavra-passe alterada com sucesso.';
  formMudarSenha.reset();
});

async function carregarUtilizadores() {
  const resposta = await fetch('/api/admin/auth/utilizadores');
  if (!resposta.ok) return;

  const utilizadores = await resposta.json();
  listaUtilizadores.innerHTML = utilizadores.map((u) => `
    <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(50,45,40,0.1);">
      <span>${escaparHtml(u.username)}${u.email ? ` <span style="color:var(--taupe); font-size:0.82rem;">(${escaparHtml(u.email)})</span>` : ''} <span style="color:var(--taupe); font-size:0.82rem;">— ${ROTULOS_ROLE[u.role] || u.role}</span></span>
      ${u.role !== 'owner' ? `<button type="button" class="admin-sair" data-id="${u.id}" data-acao="remover-utilizador">Remover</button>` : ''}
    </div>
  `).join('');
}

listaUtilizadores.addEventListener('click', async (event) => {
  const alvo = event.target;
  if (alvo.dataset.acao !== 'remover-utilizador') return;
  if (!confirm('Remover o acesso deste utilizador ao painel?')) return;

  await fetch(`/api/admin/auth/utilizadores/${alvo.dataset.id}`, { method: 'DELETE' });
  carregarUtilizadores();
});

formNovoUtilizador.addEventListener('submit', async (event) => {
  event.preventDefault();
  utilizadorFeedback.textContent = '';
  utilizadorFeedback.className = 'form-feedback';

  const username = document.getElementById('novo-username').value.trim();
  const senha = document.getElementById('novo-senha').value;

  const resposta = await fetch('/api/admin/auth/utilizadores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, senha }),
  });
  const resultado = await resposta.json();

  if (!resposta.ok) {
    utilizadorFeedback.textContent = resultado.erro || 'Não foi possível criar o utilizador.';
    utilizadorFeedback.classList.add('erro');
    return;
  }

  utilizadorFeedback.textContent = `Utilizador "${resultado.username}" criado com sucesso.`;
  formNovoUtilizador.reset();
  carregarUtilizadores();
});

protegerPaginaAdmin().then((admin) => {
  if (!admin) return;

  contaInfo.textContent = `A usar a conta "${admin.username}"${admin.email ? ` · ${admin.email}` : ''} (${ROTULOS_ROLE[admin.role] || admin.role})`;
  if (admin.email) document.getElementById('email-novo').value = admin.email;

  if (admin.role === 'owner') {
    secaoUtilizadores.hidden = false;
    carregarUtilizadores();
  }
});
