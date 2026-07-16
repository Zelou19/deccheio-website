# De Cheio — Site + Sistema de Pedidos de Orçamento

## Fase 1
- Site público com a identidade da marca (`public/index.html`, `public/css/style.css`)
- Formulário de pedido de orçamento, ligado a uma API Express
- Modelo de dados no MongoDB com o campo `status` (`nao_respondido` / `em_andamento` / `concluido`) e um array `mensagens`

## Fase 2 (esta entrega) — Chat
- Depois de submeter o pedido, o cliente é levado para `/pedido.html?id=...` — a sua conversa privada convosco
- Esse link é o "acesso" do cliente (não há contas/passwords do lado do cliente): quem tiver o link vê e responde na conversa
- Área `/admin` (barebones, temporária): pede uma chave (`ADMIN_KEY` do `.env`) e mostra a lista de pedidos com link para cada conversa
- Em cada conversa de admin, respondes ao cliente e podes mudar o estado do pedido (não respondido / em andamento / concluído)
- Quando respondes pela primeira vez, o estado passa automaticamente de "não respondido" para "em andamento"
- As mensagens são atualizadas por *polling* (verifica novidades a cada 5 segundos) — mais simples de manter do que websockets, e é a mesma ideia que já usas nas notificações Discord do RBXL

## Fase 3 (esta entrega) — Painel de gestão
- `/admin` deixou de ser uma lista simples e passou a painel a sério:
  - Contadores no topo: total, não respondidos, em andamento, concluídos
  - Filtros por estado, por tipo de evento, e busca por nome/email
  - Em cada pedido dá para mudar o estado ali mesmo na lista (sem abrir a conversa), ou clicar "Abrir" para ir ao chat
- Continua protegido pela mesma `ADMIN_KEY` do `.env` — não há contas separadas, é uma chave só tua

### Sobre a chave de admin
Define `ADMIN_KEY` no `.env` com uma password só tua. É o que usas para entrar em `/admin`. Serve bem para um único administrador; se um dia precisares de vários logins diferentes (ex: uma funcionária também acede), aí sim vale a pena substituir por um sistema de contas.

## Como correr localmente

```bash
npm install
cp .env.example .env
# edita o .env com a tua ligação ao MongoDB (Atlas ou local)
npm run dev   # ou: npm start
```

Depois abre `http://localhost:3000`.

## Estrutura

```
decoracao-cheio/
├── server.js              # servidor Express
├── models/QuoteRequest.js # schema Mongoose dos pedidos
├── routes/quotes.js       # POST /api/quotes (criar) e GET /api/quotes (listar)
└── public/                # site estático (HTML/CSS/JS)
```

## Deploy no Render
Igual ao RBXL Skin Gallery:
1. Sobe este repositório para o GitHub
2. Cria um Web Service no Render, root = esta pasta
3. Build command: `npm install` — Start command: `npm start`
4. Adiciona a variável de ambiente `MONGODB_URI` nas definições do Render

## E agora?
As três fases pedidas estão feitas: site + pedidos, chat, e painel de gestão. Coisas naturais para o futuro, se um dia quiseres: notificação por email quando chega um pedido novo ou uma resposta, paginação na lista de admin se o volume crescer muito, ou um sistema de contas em vez da chave partilhada.
