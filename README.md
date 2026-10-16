# Bíblia 📖

App de leitura da Bíblia — simples, amigável e bonito. Versão atual: v0.3.0, feito como PWA em HTML, CSS e JavaScript puro, sem etapa de build.

![Telas do app](docs/screenshot.png)

O visual segue uma linguagem de cinzas suaves, cards em grafite e acento azul, com cantos bem arredondados e a fonte Poppins.

## Funcionalidades

- **Atividade semanal**: capítulos lidos em cada dia da semana, com navegação entre semanas e comparação com a anterior
- **Início** com saudação, *versículo do dia*, sequência de dias de leitura e atalhos (continuar lendo, livros, favoritos, plano ativo)
- **Planos de leitura**: Evangelhos, Salmos e Provérbios, Novo Testamento e Bíblia completa, com progresso
- **66 livros** organizados por Antigo/Novo Testamento e por grupo, com busca (ignora acentos) e seletor de capítulos
- **Leitor** com chips de capítulos, marcação automática de capítulo lido ao chegar ao fim, anterior/próximo
- **Versículos** um por linha; toque para selecionar um ou vários e favoritar, copiar ou compartilhar
- **Versões**: Almeida, ARA, ARC, ACF, NAA, NVT, NTLH e King James Atualizada
- **Aparência**: controle circular do tamanho da letra, espaçamento entre linhas e temas Auto, Sépia, Dia e Noite
- **Favoritos** e **Perfil** com estatísticas
- Gesto de voltar do Android navega entre as telas; para sair, é preciso voltar duas vezes na tela inicial
- Funciona offline depois de aberto (service worker + cache local dos capítulos já lidos)

Todo o progresso fica salvo no próprio aparelho (localStorage).

## Texto bíblico

A versão padrão é a **João Ferreira de Almeida** (domínio público), carregada da API gratuita [bible-api.com](https://bible-api.com). As demais versões vêm da API pública do [bolls.life](https://bolls.life) e pertencem aos seus detentores de direitos.

## Como rodar

Qualquer servidor estático serve. Por exemplo:

```bash
python3 -m http.server 8080
# ou
npx serve .
```

Depois abra `http://localhost:8080` (de preferência no modo celular do DevTools). No celular, use "Adicionar à tela inicial" para instalar como app.

Para publicar de graça, ative o **GitHub Pages** no repositório (Settings → Pages → branch `main`, pasta `/`).

## Estrutura

```
index.html            casca do app (navegação, sheet, barra de ações)
css/styles.css        tema e componentes (variáveis para Dia/Noite/Sépia)
js/app.js             rotas, telas e interações
js/versions.js        versões da Bíblia disponíveis
js/books.js           livros, versículos do dia e planos de leitura
js/store.js           estado persistido (progresso, favoritos, preferências)
js/api.js             busca e cache dos capítulos
js/icons.js           ícones SVG
sw.js                 service worker (offline)
manifest.webmanifest  instalação como PWA
```

## Próximos passos

- Busca por palavras no texto
- Anotações e marca-texto com cores
- Outras traduções e modo totalmente offline
- Lembrete diário de leitura

## APK para Android

A cada push na `main`, o GitHub Actions empacota o app com [Capacitor](https://capacitorjs.com) e publica o `biblia.apk` na aba **Releases**. Baixe o arquivo no celular e permita "instalar apps desconhecidos" para instalar.
