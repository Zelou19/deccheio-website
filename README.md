# De Cheio — site, pedidos de orçamento e orçamentos

Site da De Cheio (decoração de eventos) com pedido de orçamento, chat com o cliente, painel de gestão
e criador de orçamentos. Node.js + Express + MongoDB.

## Ficheiros

```
server.js        servidor completo (API, base de dados, emails) — está dividido em blocos "===== pasta/ficheiro"
seed-fotos.json  30 fotos iniciais do catálogo (só é usado uma vez; depois do 1.º arranque pode apagar-se)
package.json     dependências
public/          o site: 4 páginas públicas, admin/ (painel, chat, orçamentos) e img/
```

Cada página em `public/` já traz o seu CSS e JavaScript lá dentro (não há ficheiros .css/.js separados).

## Variáveis de ambiente (Render → Environment)

| Variável | Para quê |
|---|---|
| `MONGODB_URI` | **Obrigatória.** Ligação ao MongoDB (Atlas) |
| `JWT_SECRET` | **Obrigatória.** Frase longa e aleatória que assina os logins. Sem ela as sessões caem a cada reinício |
| `OWNER_USERNAME` / `OWNER_PASSWORD` | Conta do dono, criada só na 1.ª vez com a base de dados sem admins (por omissão "Filipa C."; sem palavra-passe, gera-se uma temporária que aparece nos logs) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | "Entrar com Google" dos clientes |
| `RESEND_API_KEY` | Emails de notificação (Resend). Sem ela o site funciona, só não envia emails |
| `EMAIL_EQUIPA` | Quem recebe os avisos (pedido novo / mensagem de cliente). Vários separados por vírgula |
| `EMAIL_FROM` | Remetente. Sem domínio verificado no Resend, deixa o valor por omissão `DecoraçãoCheio <onboarding@resend.dev>` |
| `SITE_URL` | Endereço do site, para os links dos emails (no Render usa `RENDER_EXTERNAL_URL` se faltar) |
| `EMAIL_CLIENTES` | `true` para avisar também os clientes quando a equipa responde (só depois de verificar um domínio no Resend) |

## Correr localmente

```bash
npm install
# cria um ficheiro .env com as variáveis acima (pelo menos MONGODB_URI e JWT_SECRET)
npm start
```

Abre `http://localhost:3000`.

## Deploy no Render

Build command: `npm install` — Start command: `npm start`. Define as variáveis acima em Environment.

## Onde mudar o quê

- **Preços, textos e notas do catálogo** (e as condições padrão dos orçamentos): bloco `config/orcamentoBase` em `server.js`.
- **Texto da mensagem de boas-vindas** do chat: constante `MENSAGEM_BOAS_VINDAS` no bloco `routes/quotes`.
- **Fotos das opções do catálogo**: no editor de orçamentos, botão 📷 ao lado de cada opção.
