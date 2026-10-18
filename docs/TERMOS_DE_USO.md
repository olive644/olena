# Termos de Uso

Página pública em `public/termos-de-uso.html`, publicada em `/termos-de-uso.html`. Versão em `src/domain/terms-of-use.ts` (`TERMS_OF_USE_VERSION`), igual ao atributo `data-terms-version` da página (um teste confere). Segue o mesmo padrão visual e as mesmas regras da Política de Privacidade: página estática, sem script nem recurso externo, sem travessões, com índice e tema claro e escuro.

## O que os termos dizem

Doze seções: quem somos, o que o aplicativo oferece, sua conta, como usar (condutas proibidas, salas e cadernos compartilhados), o que é do usuário e o que é da Galeria.Oli, respostas automáticas e inteligência artificial, planos pagos no futuro, disponibilidade, suspensão e encerramento, responsabilidade, mudanças e lei aplicável.

Decisões que o texto reflete e que devem continuar valendo se o produto mudar:

- **Uso gratuito hoje, planos pagos só como possibilidade.** O texto promete preço e condições antes de qualquer cobrança, confirmação do usuário e o direito de arrependimento de 7 dias (Código de Defesa do Consumidor, art. 49). Quando um plano existir, as regras dele entram nestes termos.
- **O conteúdo é do usuário.** A Galeria.Oli só recebe a permissão necessária para o aplicativo funcionar e mostrar o conteúdo a quem o usuário escolher. Não há uso para publicidade.
- **O produto é da Galeria.Oli.** Coerente com a `LICENSE` (software proprietário): permissão pessoal, limitada e intransferível de uso.
- **Menores de 18 anos** usam com a ciência e a autorização de quem é responsável, a mesma regra da Política de Privacidade.
- **@ que imita a equipe** não é permitido (ligado à lista de nomes reservados em `profile-handle-handler.ts`).
- **Respostas automáticas e IA podem errar.** O texto é condicional (não afirma que há IA em tudo) e diz que o envio de conteúdo a parceiros depende de permissão, como na Política de Privacidade.

## O que continua em aberto (decisão da dona, não do código)

1. **Canal de contato e dados da empresa** (e-mail de atendimento, CNPJ). A página traz um aviso "em definição", como a Política de Privacidade, e não inventa dados. Quando existirem, atualize as duas páginas e o `SECURITY.md`.
2. **Foro para os demais casos.** O texto mantém o foro do domicílio do consumidor quando a lei assim determinar e deixa o resto em definição.
3. **Revisão jurídica.** Este texto foi escrito por uma IA, a partir do que o aplicativo faz hoje e das regras do repositório. **Não substitui um advogado.** Antes de cobrar por planos, ter menores como público declarado ou publicar o endereço da empresa, peça uma revisão. Pontos que mais merecem atenção: limitação de responsabilidade, regras de plano pago e reembolso, tratamento de menores e foro.
4. **Se houver cobrança,** acrescentar as regras de pagamento, renovação, cancelamento e reembolso na seção 7, e dizer qual meio de pagamento é usado e quem o processa (isso também muda a Política de Privacidade).

## O que ainda não foi feito (próximos passos, cada um em PR própria)

- **Link dentro do aplicativo.** Hoje os termos estão publicados e ligados à Política de Privacidade, mas a tela de entrada ainda só cita a política. Mostrar o link na tela de entrada exige novas frases nos catálogos de idioma (`public/locales/*.json`, com índice por número e `CATALOG_VERSION`) e teste e2e.
- **Aceite registrado por versão.** A política já registra a versão aceita (`helena.privacy.v1`). Fazer o mesmo para os termos, e pedir novo aceite em mudança importante, é um passo à parte, com teste.
- **Versão em inglês.** O aplicativo é bilíngue e as páginas legais ainda são só em português.

## Como atualizar

1. Edite `public/termos-de-uso.html` e mude a data no topo.
2. Atualize `TERMS_OF_USE_VERSION` em `src/domain/terms-of-use.ts` para o mesmo valor.
3. Rode `npx vitest run src/terms-of-use-page.test.ts` e `npm run verify`.
4. Registre a mudança em `docs/CURRENT_STATE_AUDIT.md`. Mudança importante pede aviso aos usuários.
