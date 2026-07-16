// Verifica se a pessoa tem sessão iniciada e ajusta o link "Entrar" do menu principal.
// Usado em páginas públicas (não no painel de admin, que tem o seu próprio login).
(async function atualizarEstadoConta() {
  const link = document.getElementById('nav-conta');
  if (!link) return;

  try {
    const resposta = await fetch('/api/auth/me', { credentials: 'include' });
    if (!resposta.ok) return; // não tem sessão — mantém "Entrar"

    const { user } = await resposta.json();
    link.textContent = user.nome?.split(' ')[0] || 'A minha conta';
    link.href = '/minhas-conversas.html';
  } catch (erro) {
    // sem sessão ou sem rede — mantém o link "Entrar" tal como está
  }
})();
