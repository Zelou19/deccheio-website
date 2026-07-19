// Script partilhado por todas as páginas do painel de admin.
// Substitui o antigo sistema de "chave de admin" por uma sessão a sério (cookie + login).
// Tem de ser incluído ANTES do script próprio de cada página (admin.js, admin-chat.js, etc.).

window.adminAtual = null;

// Verifica se há sessão válida. Se não houver, manda logo para o login.
// Devolve os dados do admin (username, role) quando a sessão é válida, ou null.
async function protegerPaginaAdmin() {
  try {
    const resposta = await fetch('/api/admin/auth/me');
    if (!resposta.ok) {
      window.location.href = '/admin/login.html';
      return null;
    }
    const dados = await resposta.json();
    window.adminAtual = dados.admin;

    // Elementos marcados com esta classe só aparecem para o dono da conta (ex: link "Utilizadores")
    document.querySelectorAll('.admin-so-owner').forEach((el) => {
      el.hidden = dados.admin.role !== 'owner';
    });

    return dados.admin;
  } catch (erro) {
    window.location.href = '/admin/login.html';
    return null;
  }
}

document.getElementById('btn-sair')?.addEventListener('click', async () => {
  await fetch('/api/admin/auth/logout', { method: 'POST' });
  window.location.href = '/admin/login.html';
});
