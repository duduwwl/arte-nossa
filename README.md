# Arte Nossa — site e loja de demonstração

Site da **Arte Nossa**, loja de decoração e presentes na Rua Santana, 221, em Lavras (MG). O site tem landing page, catálogo e páginas de produto. Também inclui uma **loja de demonstração**, com sacola, checkout, pagamento simulado e área de gerência.

> **Loja em demonstração.** Nenhuma cobrança é feita e nenhum pedido real é enviado. Preços, frete e estoque são fictícios. Pedidos reais são feitos pelo WhatsApp oficial (35) 99122-2309, pelo Instagram [@artenossa](https://www.instagram.com/artenossa/) ou na loja física.

Publicado em: https://duduwwl.github.io/arte-nossa/

## O que é real e o que é fictício

| Informação | Origem |
| --- | --- |
| Nome, endereço, WhatsApp, Instagram, link de localização | Bio do Instagram e link oficial da bio (linkbio.co/80313176ckU5h), conferidos em 28/10/2026 |
| Perguntas frequentes | Copiadas do FAQ oficial do link da bio |
| Nomes, descrições, materiais e medidas dos produtos | Legendas das publicações do Instagram. Cada produto aponta para o post de origem |
| Fotos | Publicações do @artenossa, usadas com autorização da loja |
| Preços, estoque, frete, pedidos, pagamentos | **Fictícios**, só para a demonstração |

Alguns posts recentes da loja trazem o selo "Conteúdo de IA" do Instagram. Por isso, essas fotos podem não reproduzir cada detalhe da peça física. A imagem das Deusas da Justiça é a capa de um vídeo e só existe em 640 px.

## Executar localmente

Requer Node 24+ e pnpm.

```bash
pnpm install
pnpm dev        # http://localhost:5173/arte-nossa/
pnpm test       # testes de busca, filtros, sacola, pedidos, estoque e importação
pnpm lint
pnpm build      # gera dist/
pnpm preview    # serve o build
```

## Editar produtos e informações da loja

- **Dados da loja e FAQ:** `src/data/store.ts`.
- **Produtos e categorias:** `src/data/products.ts`. Cada produto tem `id`, `name`, `category`, `description`, `details` (materiais e medidas declarados pela loja), `images`, `priceCents` (preço em centavos), `variants` (opções com estoque) e `source` (post de origem).
- **Fotos novas:** coloque os originais numa pasta fora do projeto e rode `pnpm images <pasta>`. O comando gera `public/img/<nome>-640.webp` e `public/img/<nome>-1280.webp` (nunca amplia a imagem) e atualiza `src/data/image-sizes.json`. Depois use `<nome>` em `images`.
- **Favicon e imagem social:** `pnpm icons <arquivo-do-logo>`. O comando usa o avatar oficial da loja e a foto da fachada.

As alterações feitas na **gerência** ficam só no navegador de quem as fez. Para mudar o catálogo publicado, edite os arquivos acima e publique de novo.

## Publicação (GitHub Pages)

Cada push na branch `main` dispara `.github/workflows/deploy.yml`. O workflow instala as dependências, roda lint, testes e build e publica `dist/` no GitHub Pages. O caminho base `/arte-nossa/` está em `vite.config.ts`. Se o repositório mudar de nome, atualize esse caminho e as URLs em `index.html`.

As rotas usam `HashRouter` (`/#/produtos`). Assim, recarregar qualquer página interna funciona no GitHub Pages sem erro 404.

## Limites da demonstração

- Os dados ficam no `localStorage` deste navegador e deste dispositivo.
- Clientes e gerência em dispositivos diferentes **não** compartilham dados.
- Limpar os dados do navegador apaga as alterações. Use **Gerência → Dados → Exportar JSON** para fazer backup.
- A gerência **não tem segurança**: não há senha nem controle de acesso.
- Pix e cartões são simulados. Nenhum código Pix é gerado e nenhum dado de cartão é pedido ou armazenado.

### Para operar de verdade

Uma loja real precisaria de:

- backend com banco de dados;
- autenticação para a administração, com controle de permissões;
- estoque compartilhado e reservado no servidor;
- provedor de pagamentos com confirmação no servidor (webhooks);
- cálculo de frete real;
- política de privacidade e LGPD;
- termos de troca e devolução definidos pela loja.

## Créditos e licenças

Visual: fundo preto, texto branco e amarelo nas ações, as cores do logo da loja. Tipografia Instrument Serif (títulos, serifa fina) e Manrope (texto). Direção de arte definida com a skill `design-taste-frontend` (direção "pinned poster"), conferida com o inspetor dela em 1440, 768 e 390 px.

Componentes de terceiros, em `src/components/vendor/`:

- **Motion Primitives**, `InView`: entradas das seções. MIT, © ibelick. https://motion-primitives.com
- **Motion Primitives**, `AnimatedBackground` (destaque que desliza entre os links do menu), `Magnetic` (botões que acompanham o cursor) e `Tilt` (cards da vitrine inclinam com o mouse).
- **Motion Primitives**, `TextLoop`: alterna as categorias na frase de abertura. `InfiniteSlider`: faixa contínua de fotos das peças. MIT, © ibelick.
- **Spell UI**, `BlurReveal`: título "Monte sua seleção". MIT, © xxtomm. https://spell.sh
- **Fancy Components**, `VerticalCutReveal`: títulos "Vitrine da semana" e "Para cada canto" entram letra por letra. MIT, © Daniel Petho. https://www.fancycomponents.dev
- **Watermelon UI**, `PopStepper`: seletor de quantidade. MIT. https://ui.watermelon.sh. Adaptado para ser controlado e acessível, com as cores da marca.
- **Canvas UI**, `Canvas`: efeito de tela pintada na foto da fachada (seção "Visite a loja"). Código aberto. https://canvasui.dev. Só é carregado em navegadores com a API experimental HTML-in-Canvas. Nos demais, a foto aparece estática.

Bibliotecas: React, React Router, Motion, Tailwind CSS, lucide-react, Vite e Vitest. Fontes: Instrument Serif e Manrope, hospedadas no próprio site via @fontsource (SIL OFL).

Fotos e textos dos produtos: © Arte Nossa (@artenossa).
