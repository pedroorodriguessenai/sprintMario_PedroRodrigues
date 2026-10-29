document.addEventListener('DOMContentLoaded', () => {
    const hero = document.querySelector('.hero');
    const pipe = document.querySelector('.pipe');
    const collectibleSprites = JSON.parse(
        document.getElementById('collectible-sprites').textContent
    );
    const gameBoard = document.getElementById('game-board');
    const hudPlayerName = document.getElementById('hud-player-name');
    const scoreDisplay = document.getElementById('score-display');
    const speedDisplay = document.getElementById('speed-display');
    const collectDisplay = document.getElementById('collect-display');
    const collectFeedback = document.getElementById('collect-feedback');
    const jumpTip = document.getElementById('jump-tip');

    // O visual do efeito fica neste arquivo para evitar conflitos
    // com as regras antigas de evolução no CSS.
    const estiloEvolucao = document.createElement('style');

    estiloEvolucao.textContent = `
        #raios-evolucao {
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: 99999;
            pointer-events: none;
            mix-blend-mode: screen;
            opacity: 0;
            transition: opacity 240ms ease-out;
        }

        #raios-evolucao[hidden],
        #raios-evolucao img[hidden] {
            display: none !important;
        }

        #raios-evolucao:not([hidden]) {
            display: block !important;
        }

        #raios-evolucao img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: fill;
            image-rendering: pixelated;
        }

        #raios-evolucao.active {
            opacity: 0.95;
        }

        #raios-evolucao.finishing {
            opacity: 0;
        }

        #game-board.evolving .pipe,
        #game-board.evolving .hero {
            animation-play-state: paused !important;
        }
    `;

    document.head.appendChild(estiloEvolucao);

    const evolutionOverlay =
        document.getElementById('raios-evolucao') ||
        document.createElement('div');

    evolutionOverlay.id = 'raios-evolucao';
    evolutionOverlay.className = 'raios-evolucao';
    evolutionOverlay.hidden = true;
    evolutionOverlay.setAttribute('aria-hidden', 'true');
    evolutionOverlay.replaceChildren();

    // Fora do tabuleiro: o efeito cobre toda a janela.
    document.body.appendChild(evolutionOverlay);

    const motionPreference = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
    );

    const evolutionFrames = [1, 2, 3, 4].map((numero) => {
        const imagem = new Image();

        imagem.src = `assets/effects/evolution-thunder-${numero}.jpg`;
        imagem.alt = '';
        imagem.hidden = true;

        imagem.addEventListener('error', () => {
            console.error(
                'Não foi possível carregar o raio:',
                imagem.src
            );
        });

        evolutionOverlay.appendChild(imagem);
        return imagem;
    });

    const DURACAO_EVOLUCAO = 1200;

    const startModal = document.getElementById('start-modal');
    const startForm = document.getElementById('start-form');
    const playerInput = document.getElementById('player-input');
    const btnViewRanking = document.getElementById('btn-view-ranking');
    const characterInputs = document.querySelectorAll(
        'input[name="character"]'
    );

    const gameoverModal = document.getElementById('gameover-modal');
    const finalScoreValue = document.getElementById('final-score-value');
    const saveStatusMsg = document.getElementById('save-status-msg');
    const rankingBody = document.getElementById('ranking-body');
    const btnRestart = document.getElementById('btn-restart');
    const btnChangePlayer = document.getElementById('btn-change-player');

    const VELOCIDADE_INICIAL = 6;
    const VELOCIDADE_MAXIMA = 13;
    const ACELERACAO = 0.001;
    const FPS_REFERENCIA = 60;
    const PONTOS_POR_SEGUNDO_BASE = 10;

    const PONTOS_POR_ITEM = 50;

    // Altere somente este valor para mudar a pontuação da pedra.
    const PONTOS_PARA_EVOLUIR = 100;

    const RAICHU_IMAGE = 'assets/characters/raichu.gif';

    const raichuImage = new Image();
    raichuImage.src = RAICHU_IMAGE;

    const thunderstoneImage = new Image();
    thunderstoneImage.src = collectibleSprites.thunderstone.image;

    let currentPlayer = '';
    let currentCharacter = null;
    let score = 0;
    let isPlaying = false;
    let gameLoop = null;
    let scoreLoop = null;

    let multiplicadorVelocidade = 1;
    let inicioPartida = 0;
    let pontosExatos = 0;
    let ultimoTickPontos = 0;
    let animacaoObstaculo = null;

    let coletavel = null;
    let itensColetados = 0;
    let proximoItemEm = 0;
    let ultimoTickItem = 0;
    let feedbackTimeout = null;

    let pedraLiberada = false;
    let evoluiuParaRaichu = false;
    let evolutionTimeout = null;
    let evolutionFrameTimers = [];
    let evolutionCleanupTimeout = null;
    let evolutionSwapTimeout = null;
    let evolutionStartTime = 0;
    let isEvolutionAnimating = false;

    let jumpTimeout = null;
    let fimDoPulo = 0;
    let tempoRestantePulo = 0;

    function getSelectedCharacter() {
        const selected = document.querySelector(
            'input[name="character"]:checked'
        );

        if (!selected) return null;

        return {
            id: selected.value,
            coleta: selected.dataset.coleta,
            run: selected.dataset.run,
            dead: selected.dataset.dead,
            cenario: selected.dataset.cenario,
            coletaSprite: selected.dataset.coletaSprite,
            obstaculo: selected.dataset.obstaculo
        };
    }

    function showCharacterOnBoard() {
        if (!currentCharacter) return;

        hero.src = currentCharacter.run;
        pipe.src = currentCharacter.obstaculo;

        gameBoard.style.backgroundImage =
            `url('${currentCharacter.cenario}')`;
    }

    characterInputs.forEach((input) => {
        const imgColeta = new Image();

        imgColeta.src =
            collectibleSprites[input.dataset.coletaSprite]?.image ||
            input.dataset.coleta;

        const imgDead = new Image();
        imgDead.src = input.dataset.dead;

        const imgCenario = new Image();
        imgCenario.src = input.dataset.cenario;

        const imgObstaculo = new Image();
        imgObstaculo.src = input.dataset.obstaculo;
    });

    const splash = document.getElementById('splash-screen');
    const btnSplashPlay = document.getElementById('btn-splash-play');
    const btnHome = document.getElementById('btn-home');
    const splashRecord = document.getElementById('splash-record-text');

    const howtoModal = document.getElementById('howto-modal');
    const btnHowtoOk = document.getElementById('btn-howto-ok');

    function irParaComoJogar() {
        if (
            !splash ||
            !splash.classList.contains('active') ||
            splash.classList.contains('leaving')
        ) {
            return;
        }

        splash.classList.add('leaving');
        howtoModal.classList.add('active');

        setTimeout(() => {
            splash.classList.remove('active', 'leaving');
            btnHowtoOk.focus();
        }, 400);
    }

    function confirmarComoJogar() {
        howtoModal.classList.remove('active');
        startModal.classList.add('active');
        playerInput.focus();
    }

    function abrirAbertura() {
        if (!splash) return;

        gameoverModal.classList.remove('active');
        howtoModal.classList.remove('active');
        startModal.classList.remove('active');

        resetElements();

        splash.classList.remove('leaving');
        splash.classList.add('active');

        if (btnSplashPlay) btnSplashPlay.focus();
    }

    function atualizarRecorde(list) {
        if (!splashRecord || !list || list.length === 0) return;

        splashRecord.textContent =
            `${list[0].nome} - ${parseInt(list[0].pontos, 10)} PTS`;
    }

    if (splash) {
        if (btnSplashPlay) {
            btnSplashPlay.addEventListener('click', irParaComoJogar);
        }

        document.addEventListener('keydown', (e) => {
            if (!splash.classList.contains('active') || e.repeat) return;

            if (
                e.target.closest(
                    'a, button, input, select, textarea'
                )
            ) {
                return;
            }

            if (
                e.code === 'Enter' ||
                e.code === 'Space' ||
                e.key === ' '
            ) {
                e.preventDefault();
                irParaComoJogar();
            }
        });
    }

    if (btnHowtoOk) {
        btnHowtoOk.addEventListener('click', confirmarComoJogar);

        btnHowtoOk.addEventListener('keydown', (e) => {
            if (e.repeat) e.preventDefault();
        });
    }

    if (btnHome) {
        btnHome.addEventListener('click', abrirAbertura);
    }

    const savedName = localStorage.getItem('hero_jump_player');

    if (savedName && playerInput) {
        playerInput.value = savedName;
    }

    const savedCharacter = localStorage.getItem('hero_jump_character');

    if (savedCharacter) {
        characterInputs.forEach((input) => {
            if (input.value === savedCharacter) {
                input.checked = true;
            }
        });
    }

    currentCharacter = getSelectedCharacter();
    showCharacterOnBoard();

    characterInputs.forEach((input) => {
        input.addEventListener('change', () => {
            currentCharacter = getSelectedCharacter();

            if (currentCharacter) {
                showCharacterOnBoard();

                localStorage.setItem(
                    'hero_jump_character',
                    currentCharacter.id
                );
            }
        });
    });

    function startGame() {
        clearInterval(gameLoop);
        clearInterval(scoreLoop);

        resetElements();

        isPlaying = true;
        score = 0;
        scoreDisplay.textContent = '0';
        hudPlayerName.textContent = currentPlayer || 'Jogador';

        gameBoard.classList.add('running');

        inicioPartida = performance.now();
        multiplicadorVelocidade = 1;
        speedDisplay.textContent = '1.0x';

        ultimoTickItem = inicioPartida;
        proximoItemEm = inicioPartida;
        animacaoObstaculo = obterAnimacaoDoObstaculo();

        pontosExatos = 0;
        ultimoTickPontos = performance.now();

        scoreLoop = setInterval(() => {
            if (!isPlaying) return;

            const agora = performance.now();

            if (isEvolutionAnimating) {
                ultimoTickPontos = agora;
                return;
            }

            const segundos = (agora - ultimoTickPontos) / 1000;
            ultimoTickPontos = agora;

            pontosExatos +=
                PONTOS_POR_SEGUNDO_BASE *
                multiplicadorVelocidade *
                segundos;

            score = Math.floor(pontosExatos);
            scoreDisplay.textContent = score;
        }, 100);

        gameLoop = setInterval(() => {
            if (!isPlaying || isEvolutionAnimating) return;

            atualizarVelocidade();
            checkCollision();
            atualizarColetaveis();
        }, 10);
    }

    function obterAnimacaoDoObstaculo() {
        if (typeof pipe.getAnimations !== 'function') return null;

        const animacoes = pipe.getAnimations();

        return (
            animacoes.find(
                (animacao) =>
                    animacao.animationName === 'pipe-animation'
            ) ||
            animacoes[0] ||
            null
        );
    }

    function calcularMultiplicador(msDecorridos) {
        const frames = (msDecorridos / 1000) * FPS_REFERENCIA;

        const velocidade = Math.min(
            VELOCIDADE_INICIAL + ACELERACAO * frames,
            VELOCIDADE_MAXIMA
        );

        return velocidade / VELOCIDADE_INICIAL;
    }

    function atualizarVelocidade() {
        multiplicadorVelocidade = calcularMultiplicador(
            performance.now() - inicioPartida
        );

        if (animacaoObstaculo) {
            animacaoObstaculo.playbackRate =
                multiplicadorVelocidade;
        }

        const texto = multiplicadorVelocidade.toFixed(1) + 'x';

        if (speedDisplay.textContent !== texto) {
            speedDisplay.textContent = texto;
        }
    }

    function limparAnimacaoEvolucao() {
        evolutionFrameTimers.forEach(clearTimeout);
        evolutionFrameTimers = [];

        clearTimeout(evolutionCleanupTimeout);
        clearTimeout(evolutionSwapTimeout);
        clearTimeout(evolutionTimeout);

        evolutionCleanupTimeout = null;
        evolutionSwapTimeout = null;
        evolutionTimeout = null;

        evolutionOverlay.classList.remove('active', 'finishing');
        evolutionOverlay.hidden = true;

        evolutionFrames.forEach((frame) => {
            frame.hidden = true;
        });
    }

    function tocarAnimacaoEvolucao() {
        limparAnimacaoEvolucao();

        // Com movimento reduzido, mostra um quadro estático.
        const sequencia = motionPreference.matches
            ? [0]
            : [0, 1, 2, 3];

        evolutionFrames[0].hidden = false;
        evolutionOverlay.hidden = false;

        // Permite que o navegador registre a opacidade inicial.
        void evolutionOverlay.offsetWidth;

        evolutionOverlay.classList.add('active');

        sequencia.slice(1).forEach((indice, passo) => {
            const timer = setTimeout(() => {
                evolutionFrames.forEach((frame, atual) => {
                    frame.hidden = atual !== indice;
                });
            }, (passo + 1) * 210);

            evolutionFrameTimers.push(timer);
        });

        evolutionCleanupTimeout = setTimeout(() => {
            evolutionOverlay.classList.add('finishing');
        }, DURACAO_EVOLUCAO - 240);
    }

    function trocarSpriteParaRaichu() {
        if (!isPlaying || !evoluiuParaRaichu) return;

        // Usa a proporção original do Raichu.
        hero.style.aspectRatio =
            `${raichuImage.naturalWidth} / ${raichuImage.naturalHeight}`;

        hero.src = RAICHU_IMAGE;
        hero.classList.add('is-evolved');
        hero.alt = 'Raichu';
    }


    function agendarFimDoPulo(duracao) {
        clearTimeout(jumpTimeout);

        fimDoPulo = performance.now() + duracao;

        jumpTimeout = setTimeout(() => {
            hero.classList.remove('jump');
            jumpTimeout = null;
            fimDoPulo = 0;
        }, duracao);
    }

    function finalizarAnimacaoEvolucao() {
        const agora = performance.now();

        const pausa = isEvolutionAnimating
            ? agora - evolutionStartTime
            : 0;

        limparAnimacaoEvolucao();

        // Desconta a pausa dos relógios usados pela partida.
        inicioPartida += pausa;
        proximoItemEm += pausa;

        if (coletavel) {
            coletavel.inicio += pausa;
        }

        ultimoTickItem = agora;
        ultimoTickPontos = agora;

        isEvolutionAnimating = false;
        gameBoard.classList.remove('evolving');

        if (isPlaying && hero.classList.contains('jump')) {
            agendarFimDoPulo(tempoRestantePulo);
        }

        tempoRestantePulo = 0;
    }

    function removerColetavel() {
        if (!coletavel) return;

        coletavel.elemento.remove();
        coletavel = null;
    }

    function limparColetaveis() {
        removerColetavel();
        clearTimeout(feedbackTimeout);

        collectFeedback.textContent = '';
        delete collectFeedback.dataset.kind;
    }

    function criarColetavel() {
        const especial = pedraLiberada && !evoluiuParaRaichu;

        const sprite =
            collectibleSprites[
            especial
                ? 'thunderstone'
                : currentCharacter.coletaSprite
            ] || null;

        const elemento = document.createElement(
            sprite ? 'span' : 'img'
        );

        elemento.className = 'collectible';
        elemento.dataset.character = currentCharacter.id;
        elemento.dataset.kind = especial ? 'evolution' : 'normal';
        elemento.setAttribute('aria-hidden', 'true');

        let visual = null;

        if (sprite) {
            visual = document.createElement('span');
            visual.className = 'collectible-visual';
            visual.style.backgroundImage = `url('${sprite.image}')`;

            elemento.appendChild(visual);
        } else {
            elemento.src = currentCharacter.coleta;
            elemento.alt = '';
            elemento.draggable = false;
        }

        elemento.style.bottom =
            `${Math.max(110, hero.offsetHeight + 15) +
            Math.random() * 25}px`;

        gameBoard.appendChild(elemento);

        const largura = elemento.offsetWidth;

        coletavel = {
            elemento,
            visual,
            sprite,
            largura,
            especial,
            x: gameBoard.clientWidth + largura,
            inicio: performance.now(),
            quadro: -1,
            altura: 0
        };

        elemento.style.transform =
            `translateX(${coletavel.x}px)`;

        atualizarQuadroColetavel();
    }

    function atualizarQuadroColetavel() {
        if (!coletavel?.sprite) return;

        const { sprite, elemento, visual } = coletavel;

        const indice =
            Math.floor(
                ((performance.now() - coletavel.inicio) / 1000) *
                sprite.fps *
                Math.sqrt(multiplicadorVelocidade)
            ) % sprite.frames.length;

        if (
            indice === coletavel.quadro &&
            coletavel.altura === elemento.offsetHeight
        ) {
            return;
        }

        const quadro = sprite.frames[indice];
        const escala = elemento.offsetHeight / sprite.maxHeight;

        visual.style.width = `${quadro.w * escala}px`;
        visual.style.height = `${quadro.h * escala}px`;

        visual.style.backgroundSize =
            `${sprite.width * escala}px ` +
            `${sprite.height * escala}px`;

        visual.style.backgroundPosition =
            `${-quadro.x * escala}px ` +
            `${-quadro.y * escala}px`;

        visual.style.clipPath = quadro.clip;
        visual.dataset.frame = indice;

        coletavel.quadro = indice;
        coletavel.altura = elemento.offsetHeight;
    }

    function atualizarColetaveis() {
        if (
            !isPlaying ||
            isEvolutionAnimating ||
            !currentCharacter
        ) {
            return;
        }

        const agora = performance.now();

        if (
            currentCharacter.id === 'pikachu' &&
            !pedraLiberada &&
            !evoluiuParaRaichu &&
            score >= PONTOS_PARA_EVOLUIR &&
            raichuImage.complete &&
            raichuImage.naturalWidth > 0 &&
            thunderstoneImage.complete &&
            thunderstoneImage.naturalWidth > 0
        ) {
            pedraLiberada = true;

            removerColetavel();
            proximoItemEm = agora;

            clearTimeout(feedbackTimeout);

            collectFeedback.dataset.kind = 'evolution';
            collectFeedback.textContent =
                'A Pedra do Trovão apareceu!';

            feedbackTimeout = setTimeout(() => {
                collectFeedback.textContent = '';
            }, 1600);
        }

        const segundos = Math.min(
            (agora - ultimoTickItem) / 1000,
            0.1
        );

        ultimoTickItem = agora;

        if (!coletavel) {
            if (agora >= proximoItemEm) {
                criarColetavel();
            }

            return;
        }

        atualizarQuadroColetavel();

        const pixelsPorSegundo =
            (gameBoard.clientWidth + 150) / 1.6;

        coletavel.x -=
            pixelsPorSegundo *
            multiplicadorVelocidade *
            segundos;

        coletavel.elemento.style.transform =
            `translateX(${coletavel.x}px)`;

        const item = coletavel.elemento.getBoundingClientRect();
        const personagem = hero.getBoundingClientRect();

        const margemX = personagem.width * 0.18;
        const margemY = personagem.height * 0.12;

        const margemItemX =
            item.width *
            (currentCharacter.id === 'bart' ? 0.25 : 0.1);

        const margemItemY = item.height * 0.08;

        const tocou =
            personagem.right - margemX >
            item.left + margemItemX &&
            personagem.left + margemX <
            item.right - margemItemX &&
            personagem.bottom - margemY >
            item.top + margemItemY &&
            personagem.top + margemY <
            item.bottom - margemItemY;

        if (tocou) {
            pontosExatos += PONTOS_POR_ITEM;
            score = Math.floor(pontosExatos);
            scoreDisplay.textContent = score;

            itensColetados++;
            collectDisplay.textContent = itensColetados;

            clearTimeout(feedbackTimeout);

            if (coletavel.especial) {
                evoluirParaRaichu();
            } else {
                collectFeedback.dataset.kind = 'normal';
                collectFeedback.textContent =
                    `+${PONTOS_POR_ITEM} pontos!`;

                feedbackTimeout = setTimeout(() => {
                    collectFeedback.textContent = '';
                }, 800);
            }

            removerColetavel();
            proximoItemEm =
                agora + 700 + Math.random() * 800;
        } else if (coletavel.x < -coletavel.largura) {
            removerColetavel();

            proximoItemEm =
                agora + 700 + Math.random() * 800;
        }
    }

    function evoluirParaRaichu() {
        if (
            currentCharacter.id !== 'pikachu' ||
            evoluiuParaRaichu
        ) {
            return;
        }

        evoluiuParaRaichu = true;
        pedraLiberada = false;

        clearTimeout(evolutionTimeout);
        clearTimeout(feedbackTimeout);

        collectFeedback.dataset.kind = 'evolution';
        collectFeedback.textContent =
            'PIKACHU EVOLUIU PARA RAICHU!';

        feedbackTimeout = setTimeout(() => {
            collectFeedback.textContent = '';
        }, 2800);

        evolutionStartTime = performance.now();
        isEvolutionAnimating = true;

        tempoRestantePulo = hero.classList.contains('jump')
            ? Math.max(0, fimDoPulo - evolutionStartTime)
            : 0;

        clearTimeout(jumpTimeout);
        jumpTimeout = null;

        gameBoard.classList.add('evolving');

        tocarAnimacaoEvolucao();

        // Troca o personagem durante o efeito.
        evolutionSwapTimeout = setTimeout(
            trocarSpriteParaRaichu,
            600
        );

        evolutionTimeout = setTimeout(
            finalizarAnimacaoEvolucao,
            DURACAO_EVOLUCAO
        );
    }

    function resetElements() {
        clearTimeout(jumpTimeout);

        jumpTimeout = null;
        fimDoPulo = 0;
        tempoRestantePulo = 0;

        pedraLiberada = false;
        evoluiuParaRaichu = false;
        isEvolutionAnimating = false;

        clearTimeout(evolutionTimeout);
        limparAnimacaoEvolucao();

        gameBoard.classList.remove('evolving');

        hero.classList.remove('is-evolved');
        hero.style.aspectRatio = '';
        hero.alt = 'Personagem';

        limparColetaveis();

        itensColetados = 0;
        collectDisplay.textContent = '0';

        pipe.style.animation = '';
        pipe.style.left = '';

        if (currentCharacter) {
            hero.src = currentCharacter.run;
        }

        hero.style.animation = '';
        hero.style.bottom = '0px';
        hero.classList.remove('jump');

        if (jumpTip) {
            jumpTip.style.opacity = '1';
        }
    }

    function jump() {
        if (!isPlaying || isEvolutionAnimating) return;
        if (hero.classList.contains('jump')) return;

        hero.classList.add('jump');

        if (jumpTip) {
            jumpTip.style.opacity = '0';
        }

        agendarFimDoPulo(500);
    }

    function checkCollision() {
        if (!isPlaying || isEvolutionAnimating) return;

        const personagem = hero.getBoundingClientRect();
        const obstaculo = pipe.getBoundingClientRect();

        const margemHeroi = personagem.width * 0.18;
        const margemObstaculo = obstaculo.width * 0.1;

        const tocou =
            personagem.right - margemHeroi >
            obstaculo.left + margemObstaculo &&
            personagem.left + margemHeroi <
            obstaculo.right - margemObstaculo &&
            personagem.bottom >
            obstaculo.top + obstaculo.height * 0.2 &&
            personagem.top + personagem.height * 0.12 <
            obstaculo.bottom;

        if (tocou) {
            const heroPosition = parseFloat(
                window.getComputedStyle(hero).bottom
            );

            triggerGameOver(
                pipe.offsetLeft,
                heroPosition
            );
        }
    }

    function triggerGameOver(pipePosition, heroPosition) {
        isPlaying = false;

        clearTimeout(jumpTimeout);
        jumpTimeout = null;

        limparColetaveis();

        clearInterval(gameLoop);
        clearInterval(scoreLoop);

        gameBoard.classList.remove('running');

        pipe.style.animation = 'none';
        pipe.style.left = `${pipePosition}px`;

        hero.style.animation = 'none';
        hero.style.bottom = `${heroPosition}px`;

        if (currentCharacter) {
            hero.src = evoluiuParaRaichu
                ? RAICHU_IMAGE
                : currentCharacter.dead;
        }

        clearTimeout(evolutionTimeout);
        limparAnimacaoEvolucao();

        isEvolutionAnimating = false;
        gameBoard.classList.remove('evolving');

        finalScoreValue.textContent = score;

        saveStatusMsg.textContent =
            'Salvando pontuação no banco...';

        saveStatusMsg.style.color = '#ffcc00';

        gameoverModal.classList.add('active');

        saveScore(currentPlayer, score);
    }

    function saveScore(playerName, finalScore) {
        fetch('php/salvar-ranking.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: playerName,
                pontos: finalScore
            })
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.status === 'success') {
                    saveStatusMsg.textContent =
                        'Pontuação registrada no banco!';

                    saveStatusMsg.style.color = '#10b981';

                    if (data.ranking) {
                        renderRanking(
                            data.ranking,
                            playerName,
                            finalScore
                        );
                    }
                } else {
                    saveStatusMsg.textContent =
                        '⚠️ ' +
                        (data.message || 'Erro ao registrar.');

                    saveStatusMsg.style.color = '#ef4444';
                }
            })
            .catch((err) => {
                console.error('Erro na requisição:', err);

                saveStatusMsg.textContent =
                    '⚠️ Erro ao conectar ao servidor.';

                saveStatusMsg.style.color = '#ef4444';
            });
    }

    function fetchRanking() {
        fetch('php/obter-ranking.php')
            .then((res) => res.json())
            .then((data) => {
                if (
                    data.status === 'success' &&
                    data.ranking
                ) {
                    renderRanking(data.ranking);
                }
            })
            .catch((err) => {
                console.error(
                    'Erro ao buscar ranking:',
                    err
                );
            });
    }

    function renderRanking(
        list,
        highlightName = null,
        highlightScore = null
    ) {
        atualizarRecorde(list);

        if (!rankingBody) return;

        rankingBody.innerHTML = '';

        if (!list || list.length === 0) {
            rankingBody.innerHTML =
                '<tr><td colspan="3" class="loading-cell">' +
                'Nenhuma pontuação gravada ainda. Jogue para ser o 1º!' +
                '</td></tr>';

            return;
        }

        let highlighted = false;

        list.forEach((item, index) => {
            const tr = document.createElement('tr');

            if (
                !highlighted &&
                highlightName &&
                item.nome === highlightName &&
                parseInt(item.pontos, 10) === highlightScore
            ) {
                tr.classList.add('highlight-current');
                highlighted = true;
            }

            let medal = `${index + 1}º`;

            if (index === 0) {
                medal = '🥇 1º';
            } else if (index === 1) {
                medal = '🥈 2º';
            } else if (index === 2) {
                medal = '🥉 3º';
            }

            tr.innerHTML = `
                <td class="ranking-pos">${medal}</td>
                <td><strong>${escapeHtml(item.nome)}</strong></td>
                <td>${parseInt(item.pontos, 10)} pts</td>
            `;

            rankingBody.appendChild(tr);
        });
    }

    function escapeHtml(str) {
        if (!str) return '';

        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    startForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const nameValue = playerInput.value.trim();

        if (!nameValue) {
            playerInput.focus();
            return;
        }

        currentPlayer = nameValue;

        localStorage.setItem(
            'hero_jump_player',
            currentPlayer
        );

        currentCharacter = getSelectedCharacter();

        if (currentCharacter) {
            localStorage.setItem(
                'hero_jump_character',
                currentCharacter.id
            );
        }

        startModal.classList.remove('active');
        startGame();
    });

    btnViewRanking.addEventListener('click', () => {
        fetchRanking();

        finalScoreValue.textContent = '---';
        saveStatusMsg.textContent = '';

        startModal.classList.remove('active');
        gameoverModal.classList.add('active');
    });

    btnRestart.addEventListener('click', () => {
        gameoverModal.classList.remove('active');

        if (!currentPlayer) {
            startModal.classList.add('active');
            playerInput.focus();
        } else {
            startGame();
        }
    });

    btnChangePlayer.addEventListener('click', () => {
        gameoverModal.classList.remove('active');

        resetElements();

        startModal.classList.add('active');
        playerInput.value = '';
        playerInput.focus();
    });

    document.addEventListener('keydown', (e) => {
        if (
            e.code === 'Space' ||
            e.key === ' ' ||
            e.code === 'ArrowUp'
        ) {
            if (isPlaying) {
                e.preventDefault();
                jump();
            }
        }
    });

    gameBoard.addEventListener('pointerdown', (e) => {
        if (isPlaying) {
            e.preventDefault();
            jump();
        }
    });
});