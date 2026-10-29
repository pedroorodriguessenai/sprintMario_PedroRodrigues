<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Conheça a VORTEX, seus serviços e a história do Hero Jump: um jogo arcade para navegador com personagens, coletáveis e desafios progressivos.">
    <title>Sobre nós | VORTEX</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Press+Start+2P&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../css/styles.css?v=fundo-limpeza-1">
</head>
<body class="story-page">
    <div class="story-shell">
        <header class="story-header">
            <a class="story-wordmark" href="../index.php" aria-label="VORTEX — voltar ao jogo">VORTEX</a>
            <a class="story-back" href="../index.php">← Voltar ao jogo</a>
        </header>
        <main>
            <div class="story-intro">
                <span class="vortex-mark story-brandmark"><img src="../assets/brand/vortex.jpg" alt="Logotipo VORTEX" width="2814" height="1536"></span>
                <p class="story-eyebrow">SOBRE NÓS</p>
                <h1>De um primeiro salto<br>a um universo de ideias.</h1>
                <p class="story-lead">Somos a VORTEX, um estúdio fictício de jogos para navegador. Nossa história começou na sala de aula e ganhou forma com o Hero Jump.</p>
                <a class="story-shortcut" href="#requisitos">Ver tabela de requisitos ↓</a>
            </div>
            <section class="story-chapter" aria-labelledby="studio-history">
                <span class="story-chapter-label">01 / A EMPRESA</span>
                <h2 id="studio-history">Como nasceu a VORTEX</h2>
                <p>A <strong>VORTEX</strong> é uma empresa fictícia especializada no desenvolvimento de jogos digitais para navegador. Nosso foco são experiências arcade com controles simples, partidas rápidas e desafios que aumentam conforme o jogador aprende.</p>
                <p>Criada em 2026 por <strong>Rafael Azevedo</strong>, a empresa nasceu de um projeto individual de sala de aula. A ideia era ampliar um jogo de pulo: criar uma identidade visual, dar espaço a diferentes personagens e fazer cada nova tentativa trazer uma chance de melhorar.</p>
                <p>O nome VORTEX veio da imagem de um redemoinho, sempre em movimento. Ele representa o ciclo de criar, testar e recomeçar que acompanhou o desenvolvimento do nosso primeiro projeto: <strong>Hero Jump</strong>.</p>
                <h3>O que fazemos</h3>
                <p>Nossos serviços incluem o <strong>desenvolvimento de jogos web</strong>, a criação de interfaces, a programação das mecânicas e a personalização de personagens, cenários e obstáculos. Também realizamos testes de jogabilidade e adaptação da interface para computador e celular, buscando comandos claros e uma experiência consistente nas duas telas.</p>
            </section>
            <section class="story-chapter" aria-labelledby="game-history">
                <span class="story-chapter-label">02 / O JOGO</span>
                <h2 id="game-history">A jornada do Hero Jump</h2>
                <p><strong>Hero Jump</strong> começou como um exercício de pulo e desvio de obstáculos. A partir dessa base, o projeto passou a reunir Pikachu, Bart, Sasuke e Sonic em uma aventura arcade. Cada personagem recebeu seu próprio cenário, obstáculo e item temático.</p>
                <p>Os coletáveis acrescentaram uma escolha ao percurso: encontrar o momento de saltar para ganhar pontos e continuar longe dos obstáculos. Depois vieram o ranking com as dez maiores pontuações, os níveis <strong>Fácil, Médio e Difícil</strong> e o cenário em movimento. A evolução de Pikachu para Raichu trouxe uma surpresa durante a partida, acompanhada por um efeito elétrico.</p>
                <p>Hoje, a proposta continua direta: entrar na partida, aprender o ritmo dos saltos e tentar superar o próprio resultado. Cada rodada é uma oportunidade de reconhecer o que deu errado e testar uma nova tentativa.</p>
                <dl class="story-facts">
                    <div>
                        <dt>Para quem criamos</dt>
                        <dd>Jogadores casuais, estudantes e pessoas que procuram partidas rápidas no navegador, incluindo quem está começando a jogar. Os comandos por teclado ou toque permitem jogar no computador e no celular.</dd>
                    </div>
                    <div>
                        <dt>A proposta do Hero Jump</dt>
                        <dd>Um jogo arcade de corrida automática, com quatro personagens selecionáveis, itens temáticos e três níveis de dificuldade que avançam conforme o tempo de sobrevivência.</dd>
                    </div>
                    <div>
                        <dt>O objetivo de cada partida</dt>
                        <dd>Sobreviver pelo maior tempo possível, pular para desviar dos obstáculos, coletar itens para somar pontos e disputar uma posição entre os dez melhores resultados do ranking.</dd>
                    </div>
                </dl>
            </section>
            <section class="story-chapter" id="requisitos" aria-labelledby="requirements-title">
                <span class="story-chapter-label">03 / REQUISITOS</span>
                <h2 id="requirements-title">Requisitos do Hero Jump</h2>
                <p>Os requisitos funcionais (RF) descrevem o que o jogo oferece. Os requisitos não funcionais (RNF) definem características de interface, funcionamento, tecnologia e organização do projeto.</p>
                <div class="requirements-wrap">
                    <table class="requirements-table">
                        <caption>Requisitos funcionais e não funcionais do jogo</caption>
                        <colgroup>
                            <col class="requirements-code-column">
                            <col>
                            <col class="requirements-type-column">
                        </colgroup>
                        <thead>
                            <tr>
                                <th scope="col">Código</th>
                                <th scope="col">Descrição</th>
                                <th scope="col">Tipo</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <th scope="row">RF01</th>
                                <td>Permitir informar o nome do jogador antes de iniciar a partida.</td>
                                <td class="requirements-type">Funcional</td>
                            </tr>
                            <tr>
                                <th scope="row">RF02</th>
                                <td>Permitir selecionar Pikachu, Bart, Sasuke ou Sonic, com cenário, obstáculo e coletável próprios.</td>
                                <td class="requirements-type">Funcional</td>
                            </tr>
                            <tr>
                                <th scope="row">RF03</th>
                                <td>Permitir pular com Espaço, seta para cima ou clique/toque no cenário para desviar de obstáculos e coletar itens.</td>
                                <td class="requirements-type">Funcional</td>
                            </tr>
                            <tr>
                                <th scope="row">RF04</th>
                                <td>Fazer os itens aparecerem durante a partida, acrescentar 50 pontos por coleta e remover o item coletado da tela.</td>
                                <td class="requirements-type">Funcional</td>
                            </tr>
                            <tr>
                                <th scope="row">RF05</th>
                                <td>Iniciar no Fácil, avançar para o Médio aos 20 segundos e para o Difícil aos 45 segundos de partida ativa, exibir o nível e acelerar cenário e obstáculos gradualmente.</td>
                                <td class="requirements-type">Funcional</td>
                            </tr>
                            <tr>
                                <th scope="row">RF06</th>
                                <td>Salvar automaticamente o nome e a pontuação final no banco e exibir um ranking com as dez maiores pontuações em ordem decrescente.</td>
                                <td class="requirements-type">Funcional</td>
                            </tr>
                            <tr>
                                <th scope="row">RF07</th>
                                <td>Liberar a Pedra do Trovão para Pikachu a partir de 100 pontos. Ao coletá-la, evoluir para Raichu, mostrar os raios e pausar a partida por 1,2 segundo, descontando essa pausa do tempo dos níveis.</td>
                                <td class="requirements-type">Funcional</td>
                            </tr>
                            <tr>
                                <th scope="row">RF08</th>
                                <td>Acumular pontos por sobrevivência e atualizar automaticamente a pontuação e o contador de itens durante a partida.</td>
                                <td class="requirements-type">Funcional</td>
                            </tr>
                            <tr>
                                <th scope="row">RF09</th>
                                <td>Identificar colisões com a área de contato dos obstáculos, encerrar a partida e mostrar a pontuação final.</td>
                                <td class="requirements-type">Funcional</td>
                            </tr>
                            <tr>
                                <th scope="row">RF10</th>
                                <td>Permitir reiniciar sem atualizar a página, zerando a pontuação e os itens e restaurando o nível Fácil e o personagem sem evolução.</td>
                                <td class="requirements-type">Funcional</td>
                            </tr>
                            <tr>
                                <th scope="row">RF11</th>
                                <td>Informar o andamento do salvamento da pontuação e apresentar uma mensagem de sucesso ou erro ao jogador.</td>
                                <td class="requirements-type">Funcional</td>
                            </tr>
                            <tr>
                                <th scope="row">RF12</th>
                                <td>Reproduzir música de fundo após a interação do jogador, exceto no Sobre nós, e permitir silenciar ou ativar o áudio, mantendo a preferência nas próximas visitas.</td>
                                <td class="requirements-type">Funcional</td>
                            </tr>
                            <tr>
                                <th scope="row">RF13</th>
                                <td>Reproduzir os efeitos de coleta, Game Over e transformação de Pikachu nos respectivos eventos, destacando os sons de Game Over e evolução sobre a música.</td>
                                <td class="requirements-type">Funcional</td>
                            </tr>
                            <tr class="requirements-nonfunctional">
                                <th scope="row">RNF01</th>
                                <td>Adaptar a interface para computador e celular, mantendo textos, controles e informações do jogo legíveis.</td>
                                <td class="requirements-type">Não funcional</td>
                            </tr>
                            <tr class="requirements-nonfunctional">
                                <th scope="row">RNF02</th>
                                <td>Manter animações e colisões funcionais nos três níveis, inclusive na velocidade máxima, respeitando a preferência de movimento reduzido nos efeitos e no cenário.</td>
                                <td class="requirements-type">Não funcional</td>
                            </tr>
                            <tr class="requirements-nonfunctional">
                                <th scope="row">RNF03</th>
                                <td>Utilizar HTML, CSS e JavaScript no jogo, PHP na comunicação com o servidor e MySQL ou MariaDB para persistir as pontuações.</td>
                                <td class="requirements-type">Não funcional</td>
                            </tr>
                            <tr class="requirements-nonfunctional">
                                <th scope="row">RNF04</th>
                                <td>Organizar código, estilos, páginas e imagens em pastas próprias, com caminhos consistentes e sem arquivos antigos sem uso.</td>
                                <td class="requirements-type">Não funcional</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
        <footer class="story-footer">VORTEX · Hero Jump<br><span>Empresa, fundador e história de origem fictícios, criados para um projeto acadêmico.</span></footer>
    </div>
</body>
</html>
