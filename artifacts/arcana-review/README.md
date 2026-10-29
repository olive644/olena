# Revisão das contagens e traduções do Arcano

Na raiz desta branch, executar `npm run dev -- --host 127.0.0.1 --port 4186` para o app e, em outro Shell, `node artifacts/arcana-review/serve.cjs` para a página de revisão em <http://127.0.0.1:4187>.

A página reúne originais auditados, variantes corrigidas e capturas reais do navegador, com ampliação. As cinco variantes count-v3 são usadas pelos catálogos desta branch. Seis de Paus recebeu aceite da proprietária em 29/10/2026. Cinco, Oito, Nove e Dez de Paus foram produzidos após esse aceite e continuam sujeitos à conferência final. Nada nesta página autoriza merge.

As vinte capturas das cartas foram feitas por Chromium headless com viewport fixo, usando capture.mjs e o preview real. As capturas desktop da tradução vêm do e2e de produção; as mobile de tradução vêm do portal Maestri. Dimensões, tema e contexto de cada PNG estão em screenshots.json. O componente de estudo usa a arte real; a inspeção traduzida usa um perfil visitante fictício. Nos screenshots de tradução, o tema foi aplicado por fixture. Não são provas de autenticação, sincronização ou de alternância de tema pela interface. Não há captura do desktop ou mouse nativo. Para refazer as vinte capturas, executar `node artifacts/arcana-review/capture.mjs` com o app na porta4186 e Edge disponível.

As imagens são provas visuais da worktree baseada em 28539d6, com as alterações desta branch aplicadas. A captura ocorreu antes do commit, não foi usada uma imagem de UI gerada por IA. As artes foram editadas por imagegen, e só depois montadas e capturadas no componente real. Para conferir novamente no app: <http://127.0.0.1:4186/perfil>. Para uma carta específica no estudo: <http://127.0.0.1:4186/previews/arcana.html?card=wands-09>.

Os arquivos antigos permanecem no repositório. As contagens anteriores eram 7 no Seis, 9 no Oito, 8 no Nove e 11 no Dez de Paus. As variantes count-v3 mostram respectivamente 6, 8, 9 e 10. O Cinco também ganhou cinco bastões com continuidade e extremidades legíveis, pois a arte anterior não permitia contagem conclusiva. A estrela integrada à chave do Dez de Ouros continua como décimo emblema estrelado, sem alteração dessa carta.
