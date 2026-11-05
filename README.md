# Portfólio Deni

Site estático com Vite. Todas as imagens ficam em public/gallery. Não usa API, chave ou Google Drive.

Execute npm.cmd install e npm.cmd run dev. Abra http://localhost:3000.

## Estrutura

    public/gallery/
      DND.png
      DND/
        01.png
        02.jpg
      Zumbi1.png
      Zumbi1/
        01.png
      1.png
      1/
        01.png

A thumb fica na raiz de gallery. A pasta correspondente deve ter exatamente o mesmo nome sem a extensão, incluindo maiúsculas e espaços. O clique exibe todas as imagens dessa pasta, com rolagem e carregamento lazy. Se a pasta estiver vazia ou não existir, exibe a thumb. São aceitos PNG, JPG, JPEG, WebP, AVIF e GIF, ordenados pelo nome com ordem numérica. Use 01, 02 etc. Não há conversão nem criação de cópias.

O Vite identifica os arquivos no desenvolvimento e ao gerar o build. Adicionar ou remover arquivos atualiza o site durante o desenvolvimento. Após adicionar arquivos para produção, gere o build e publique novamente.

A galeria começa com três capas e carrega mais três por vez pelo botão ou scroll. Cada linha exibe três imagens. As setas do detalhe navegam entre trabalhos e Escape fecha.

Os filtros classificam nomes com Sasuke, Gardevoir e Heather como fan art; os demais são personagens originais. Ajuste category em src/main.js conforme necessário. Revise textos e contatos provisórios antes de publicar.

## Publicação

Execute npm.cmd run build e publique dist em uma hospedagem estática. O site usa Google Fonts com fontes locais de reserva.
