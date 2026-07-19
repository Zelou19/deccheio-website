// Menu hambúrguer, só usado em ecrãs pequenos (o CSS trata de o esconder em desktop).
document.querySelectorAll('.nav-toggle').forEach((botao) => {
  const nav = botao.parentElement.querySelector('.site-nav');
  if (!nav) return;

  botao.addEventListener('click', () => {
    const aberto = nav.classList.toggle('nav-aberto');
    botao.setAttribute('aria-expanded', aberto ? 'true' : 'false');
  });

  // Fecha o menu automaticamente quando se escolhe uma opção
  nav.querySelectorAll('a, button').forEach((item) => {
    item.addEventListener('click', () => {
      nav.classList.remove('nav-aberto');
      botao.setAttribute('aria-expanded', 'false');
    });
  });
});
