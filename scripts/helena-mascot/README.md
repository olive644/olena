# Renderizador gráfico da Helena

Modelo 3D aprovado pelo proprietário, exportado do Blender. O frame recebe apenas
estado visual por postMessage, com origem e janela de origem verificadas. Não
recebe conversa, tokens ou dados da conta. O botão React mantém os controles.

Three.js 0.170.0, MIT, com GLTFLoader e BufferGeometryUtils da mesma versão.
Origem: https://cdn.jsdelivr.net/npm/three@0.170.0/.
Consulta de segurança: OSV npm/three 0.170.0 não retornou avisos em 2026-10-12.
Fontes de terceiros são mantidas sem alterações de formatação; apenas o import
relativo de BufferGeometryUtils foi ajustado para esta disposição de diretórios.

SHA-256 das fontes vendorizadas:

- three.module.js: ce1fa418de16a19495a9f72495580e3015d7745c296d3ce0485897f902ddedfb
- GLTFLoader.js: 8a7db5a19d1018d79fb9a7a8b8372f317682027321a67d86023002e264ea479d
- BufferGeometryUtils.js: c25b7930e570e9ec56173cd3b866ec8d2e10016630db3937efb439daf1cedbf6

Gerar o bundle: node scripts/build-helena-mascot.mjs. Não altera dependências npm.
Saída: public/helena-assistant/runtime.js. CSS, CSP e controle de movimento ficam
no componente e em vercel.json. Renderização limitada a 30 quadros/s e suspensa
quando o botão não está visível. Movimento reduzido evita carregar o frame.
Orçamento próprio: 768 KiB de JavaScript e 4 MiB de modelo, verificado junto aos
orçamentos existentes da aplicação. O código minificado e as fontes de terceiros
não recebem formatação/lint do código autoral; a fonte runtime.js recebe ambos.
