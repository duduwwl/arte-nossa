// Verified business information. Sources: instagram.com/artenossa (bio) and the official link-in-bio page
// linkbio.co/80313176ckU5h, both checked on 2026-10-28. Do not add data that is not confirmed by the store.
export const store = {
  name: 'Arte Nossa',
  tagline: 'Decoração & presentes',
  extra: 'Listas de casamento',
  address: 'Rua Santana, 221 – Lavras – MG',
  instagram: 'https://www.instagram.com/artenossa/',
  instagramHandle: '@artenossa',
  whatsapp: '5535991222309',
  whatsappDisplay: '(35) 99122-2309',
  mapsUrl: 'https://share.google/nEN3QpkApMSagZ7BJ',
  linkBio: 'https://linkbio.co/80313176ckU5h',
} as const

export const whatsappLink = (text?: string) =>
  `https://wa.me/${store.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`

// Answers copied from the store's official FAQ (link in bio).
export const faq = [
  {
    q: 'Vocês fazem entrega?',
    a: 'Sim. Realizamos entregas em Lavras e também para todo o Brasil. As formas de envio, prazos e taxas são informados e combinados no momento da compra.',
  },
  {
    q: 'Como são as peças da loja?',
    a: 'Trabalhamos com peças de decoração de alta qualidade, 100% confiáveis, cuidadosamente selecionadas à mão e escolhidas após uma curadoria para garantir beleza, durabilidade e elegância para os ambientes.',
  },
  {
    q: 'Como faço para comprar?',
    a: 'Você pode comprar pelo WhatsApp/Instagram ou visitar nosso espaço físico em Lavras – MG.',
  },
  {
    q: 'Vocês fazem curadoria de decoração?',
    a: 'Sim. Também realizamos curadoria, levando peças para que o cliente possa visualizar e escolher diretamente no ambiente, facilitando a composição e a escolha ideal para o espaço.',
  },
] as const

export const DEMO_NOTICE =
  'Loja em demonstração. Nenhuma cobrança será realizada e nenhum pedido real será enviado.'
