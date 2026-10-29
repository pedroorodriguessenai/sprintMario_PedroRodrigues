/**
 * Hero Jump - Lógica do Jogo e Integração com Ranking MySQL
 */

document.addEventListener('DOMContentLoaded', () => {
    const audio = window.HeroJumpAudio;
    // Elementos do Jogo
    const hero = document.querySelector('.hero');
    const pipe = document.querySelector('.pipe');
    const collectibleSprites = JSON.parse(document.getElementById('collectible-sprites').textContent);
    const gameBoard = document.getElementById('game-board');
    const hudPlayerName = document.getElementById('hud-player-name');
    const scoreDisplay = document.getElementById('score-display');
    const levelDisplay = document.getElementById('level-display');
    const levelInfo = document.getElementById('level-info');
    const levelNotice = document.getElementById('level-notice');
    const sceneryTrack = document.getElementById('scenery-track');
    const sceneryPanels = sceneryTrack.querySelectorAll('.scenery-panel');
    const collectDisplay = document.getElementById('collect-display');
    const collectFeedback = document.getElementById('collect-feedback');
    const jumpTip = document.getElementById('jump-tip');
    const evolutionOverlay = document.getElementById('raios-evolucao');
    const evolutionFrames = Array.from(evolutionOverlay.querySelectorAll('img'));
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    evolutionFrames.forEach((imagem) => {
        imagem.addEventListener('error', () => console.error('Não foi possível carregar o raio:', imagem.src));
    });
    const DURACAO_EVOLUCAO = 1200;

    // Modais e Telas
    const startModal = document.getElementById('start-modal');
    const startForm = document.getElementById('start-form');
    const playerInput = document.getElementById('player-input');
    const btnViewRanking = document.getElementById('btn-view-ranking');
    const characterInputs = document.querySelectorAll('input[name="character"]');

    const gameoverModal = document.getElementById('gameover-modal');
    const finalScoreValue = document.getElementById('final-score-value');
    const saveStatusMsg = document.getElementById('save-status-msg');
    const rankingBody = document.getElementById('ranking-body');
    const btnRestart = document.getElementById('btn-restart');
    const btnChangePlayer = document.getElementById('btn-change-player');

    // Tempo em segundos de partida ativa: a pausa da evolução é descontada.
    // A velocidade interpola entre os níveis, sem saltos nos obstáculos.
    const NIVEIS = [
        { numero: 1, nome: 'Fácil', inicio: 0, velocidade: 0.8 },
        { numero: 2, nome: 'Médio', inicio: 20, velocidade: 1.15 },
        { numero: 3, nome: 'Difícil', inicio: 45, velocidade: 1.6 }
    ];
    const VELOCIDADE_MAXIMA = 2;
    const TEMPO_VELOCIDADE_MAXIMA = 90;
    const PONTOS_POR_SEGUNDO_BASE = 10;
    const VELOCIDADE_CENARIO_BASE = 32; // pixels por segundo; mais lento que os obstáculos
    // Ignora as bordas do desenho para tolerar raspadas durante o salto.
    const HITBOX_OBSTACULO = { lateral: 0.18, superior: 0.30, inferior: 0.05 };

    // Cada coleta soma ao mesmo total usado pelo placar e pelo ranking.
    const PONTOS_POR_ITEM = 30;
    const PONTOS_PARA_EVOLUIR = 1500;
    const RAICHU_FRAMES = [1, 2, 3].map((numero) =>
        `assets/characters/raichu/corrida-0${numero}.png`
    );
    const RAICHU_SEQUENCE = [0, 1, 2, 1];
    const RAICHU_FRAME_MS = 100;
    const RAICHU_IMAGE = RAICHU_FRAMES[0];
    const raichuFrameImages = RAICHU_FRAMES.map((src) => {
        const imagem = new Image();
        imagem.src = src;
        return imagem;
    });
    const raichuImage = raichuFrameImages[0];
    const thunderstoneImage = new Image();
    thunderstoneImage.src = collectibleSprites.thunderstone.image;

    // Variáveis de Estado
    let currentPlayer = '';
    let currentCharacter = null;
    let score = 0;
    let isPlaying = false;
    let gameLoop = null;
    let scoreLoop = null;
    let multiplicadorVelocidade = NIVEIS[0].velocidade;
    let nivelAtual = NIVEIS[0];
    let avisoNivelTimeout = null;
    let deslocamentoCenario = 0;
    let ultimoTickCenario = 0;
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
    let inicioAnimacaoRaichu = 0;
    let quadroRaichu = 0;
    let evolutionTimeout = null;
    let evolutionFrameTimers = [];
    let evolutionCleanupTimeout = null;
    let evolutionSwapTimeout = null;
    let evolutionStartTime = 0;
    let isEvolutionAnimating = false;
    let jumpTimeout = null;
    let fimDoPulo = 0;
    let tempoRestantePulo = 0;

    /**
     * Lê o personagem marcado na tela de início
     */
    function getSelectedCharacter() {
        const selected = document.querySelector('input[name="character"]:checked');
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

    /**
     * Mostra no jogo o personagem escolhido, com o cenário e o obstáculo dele
     */
    function showCharacterOnBoard() {
        if (!currentCharacter) return;
        hero.src = currentCharacter.run;
        pipe.src = currentCharacter.obstaculo;
        sceneryPanels.forEach((panel) => {
            panel.style.backgroundImage = `url('${currentCharacter.cenario}')`;
        });
    }

    // Os GIFs dos personagens já são carregados pelos cards de seleção.
    // Pré-carrega os cenários, obstáculos e coletáveis para a troca ser instantânea.
    characterInputs.forEach((input) => {
        const imgColeta = new Image();
        imgColeta.src = collectibleSprites[input.dataset.coletaSprite]?.image || input.dataset.coleta;

        const imgCenario = new Image();
        imgCenario.src = input.dataset.cenario;

        const imgObstaculo = new Image();
        imgObstaculo.src = input.dataset.obstaculo;
    });

    // ===== Tela inicial: aparece ao entrar no site e ao voltar pelo botão do Game Over =====
    const splash = document.getElementById('splash-screen');
    const btnSplashPlay = document.getElementById('btn-splash-play');
    const btnHome = document.getElementById('btn-home');
    const splashRecord = document.getElementById('splash-record-text');

    const howtoModal = document.getElementById('howto-modal');
    const btnHowtoOk = document.getElementById('btn-howto-ok');

    // "Iniciar jogo" na tela inicial -> abre a tela "Como jogar"
    function irParaComoJogar() {
        if (!splash || !splash.classList.contains('active') || splash.classList.contains('leaving')) return;
        splash.classList.add('leaving');

        // Mostra o "Como jogar" por trás enquanto a tela inicial some
        howtoModal.classList.add('active');

        setTimeout(() => {
            splash.classList.remove('active', 'leaving');
            btnHowtoOk.focus();
        }, 400);
    }

    // "OK" no "Como jogar" -> segue para nome + personagem
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

    /**
     * Atualiza o recorde mostrado na tela inicial com o 1º lugar do ranking
     */
    function atualizarRecorde(list) {
        if (!splashRecord || !list || list.length === 0) return;
        splashRecord.textContent = `${list[0].nome} - ${parseInt(list[0].pontos, 10)} PTS`;
    }

    if (splash) {
        if (btnSplashPlay) btnSplashPlay.addEventListener('click', irParaComoJogar);

        document.addEventListener('keydown', (e) => {
            if (!splash.classList.contains('active') || e.repeat) return;
            // Links e botões mantêm sua ativação nativa por teclado.
            if (e.target.closest('a, button, input, select, textarea')) return;
            if (e.code === 'Enter' || e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                irParaComoJogar();
            }
        });
    }

    if (btnHowtoOk) {
        btnHowtoOk.addEventListener('click', confirmarComoJogar);
        // Segurar Enter não deve pular o "Como jogar" sem a pessoa ler
        btnHowtoOk.addEventListener('keydown', (e) => {
            if (e.repeat) e.preventDefault();
        });
    }

    if (btnHome) btnHome.addEventListener('click', abrirAbertura);

    // Recupera último nome utilizado caso exista
    const savedName = localStorage.getItem('hero_jump_player');
    if (savedName && playerInput) {
        playerInput.value = savedName;
    }

    // Recupera o último personagem escolhido caso exista
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

    // Ao escolher outro personagem, mostra ele no cenário
    characterInputs.forEach((input) => {
        input.addEventListener('change', () => {
            currentCharacter = getSelectedCharacter();
            if (currentCharacter) {
                showCharacterOnBoard();
                localStorage.setItem('hero_jump_character', currentCharacter.id);
            }
        });
    });

    /**
     * Inicia uma nova rodada
     */
    function startGame() {
        // Limpa loops anteriores se existirem
        clearInterval(gameLoop);
        clearInterval(scoreLoop);

        // Reseta posições e visuais
        resetElements();

        isPlaying = true;
        score = 0;
        scoreDisplay.textContent = '0';
        hudPlayerName.textContent = currentPlayer || 'Jogador';

        // Ativa animações CSS do jogo
        gameBoard.classList.add('running');

        // Toda nova partida começa no Fácil, em 0.8x.
        inicioPartida = performance.now();
        ultimoTickCenario = inicioPartida;
        ultimoTickItem = inicioPartida;
        proximoItemEm = inicioPartida;
        animacaoObstaculo = obterAnimacaoDoObstaculo();
        atualizarVelocidade();

        // A pontuação por sobrevivência acompanha a velocidade; cada item soma 30.
        pontosExatos = 0;
        ultimoTickPontos = performance.now();
        scoreLoop = setInterval(() => {
            if (!isPlaying) return;
            const agora = performance.now();
            if (isEvolutionAnimating) { ultimoTickPontos = agora; return; }
            const segundos = (agora - ultimoTickPontos) / 1000;
            ultimoTickPontos = agora;
            pontosExatos += PONTOS_POR_SEGUNDO_BASE * multiplicadorVelocidade * segundos;
            score = Math.floor(pontosExatos);
            scoreDisplay.textContent = score;
        }, 100);

        // Loop principal: acelera o jogo e checa colisão
        gameLoop = setInterval(() => {
            if (!isPlaying || isEvolutionAnimating) return;
            atualizarVelocidade();
            checkCollision();
            if (!isPlaying) return;
            atualizarAnimacaoRaichu();
            atualizarCenario();
            atualizarColetaveis();
        }, 10);
    }

    /**
     * Pega a animação CSS que move o obstáculo (para podermos acelerá-la sem "pulos")
     */
    function obterAnimacaoDoObstaculo() {
        if (typeof pipe.getAnimations !== 'function') return null;
        const animacoes = pipe.getAnimations();
        return animacoes.find((a) => a.animationName === 'pipe-animation') || animacoes[0] || null;
    }

    function obterDificuldade(msDecorridos) {
        const segundos = Math.max(0, msDecorridos / 1000);
        let indice = 0;
        for (let i = 1; i < NIVEIS.length; i++) {
            if (segundos >= NIVEIS[i].inicio) indice = i;
        }
        const nivel = NIVEIS[indice];
        const seguinte = NIVEIS[indice + 1];
        const fim = seguinte ? seguinte.inicio : TEMPO_VELOCIDADE_MAXIMA;
        const velocidadeFinal = seguinte ? seguinte.velocidade : VELOCIDADE_MAXIMA;
        const progresso = Math.min(1, (segundos - nivel.inicio) / (fim - nivel.inicio));
        return {
            nivel,
            multiplicador: nivel.velocidade + (velocidadeFinal - nivel.velocidade) * progresso
        };
    }

    function limparAvisoNivel() {
        clearTimeout(avisoNivelTimeout);
        avisoNivelTimeout = null;
        levelNotice.hidden = true;
        levelNotice.textContent = '';
    }

    function mostrarNivel(nivel, avisar = false) {
        nivelAtual = nivel;
        levelDisplay.textContent = `${nivel.numero} — ${nivel.nome.toUpperCase()}`;
        levelInfo.dataset.level = nivel.numero;
        gameBoard.dataset.level = nivel.numero;
        if (avisar) {
            limparAvisoNivel();
            levelNotice.textContent = `NÍVEL ${nivel.numero} — ${nivel.nome.toUpperCase()}`;
            levelNotice.hidden = false;
            avisoNivelTimeout = setTimeout(limparAvisoNivel, 2200);
        }
    }

    function atualizarVelocidade() {
        const dificuldade = obterDificuldade(performance.now() - inicioPartida);
        multiplicadorVelocidade = dificuldade.multiplicador;
        if (dificuldade.nivel.numero !== nivelAtual.numero) {
            mostrarNivel(dificuldade.nivel, true);
        }

        // playbackRate muda a velocidade da animação mantendo a posição atual (sem saltos)
        if (animacaoObstaculo) {
            animacaoObstaculo.playbackRate = multiplicadorVelocidade;
        }
    }

    function atualizarCenario() {
        const agora = performance.now();
        const segundos = Math.min((agora - ultimoTickCenario) / 1000, 0.1);
        ultimoTickCenario = agora;
        if (motionPreference.matches) return;
        const ciclo = gameBoard.clientWidth * 2;
        if (!ciclo) return;
        deslocamentoCenario = (deslocamentoCenario
            + VELOCIDADE_CENARIO_BASE * multiplicadorVelocidade * segundos) % ciclo;
        sceneryTrack.style.transform = `translate3d(${-deslocamentoCenario}px, 0, 0)`;
    }
    // Os quadros de Evolution Thunder cobrem a viewport inteira.
    // O preto das imagens desaparece pelo modo de mesclagem "screen" no CSS.
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
        evolutionFrames.forEach((frame) => { frame.hidden = true; });
    }

    function tocarAnimacaoEvolucao() {
        limparAnimacaoEvolucao();
        // Movimento reduzido mantém um raio estático com entrada e saída suaves.
        const sequencia = motionPreference.matches ? [0] : [0, 1, 2, 3];
        evolutionFrames[0].hidden = false;
        evolutionOverlay.hidden = false;
        // Registra o estado inicial antes de iniciar a transição de opacidade.
        void evolutionOverlay.offsetWidth;
        evolutionOverlay.classList.add('active');
        sequencia.slice(1).forEach((indice, passo) => {
            evolutionFrameTimers.push(setTimeout(() => {
                evolutionFrames.forEach((frame, atual) => { frame.hidden = atual !== indice; });
            }, (passo + 1) * 210));
        });
        evolutionCleanupTimeout = setTimeout(() => {
            evolutionOverlay.classList.add('finishing');
        }, DURACAO_EVOLUCAO - 240);
    }

    function trocarSpriteParaRaichu() {
        if (!isPlaying || !evoluiuParaRaichu) return;
        // Usa a proporção do Raichu, sem comprimi-lo na caixa do Pikachu.
        hero.style.aspectRatio = `${raichuImage.naturalWidth} / ${raichuImage.naturalHeight}`;
        hero.src = RAICHU_IMAGE;
        hero.classList.add('is-evolved');
        hero.alt = 'Raichu';
        quadroRaichu = 0;
        inicioAnimacaoRaichu = performance.now();
    }

    function atualizarAnimacaoRaichu() {
        if (!evoluiuParaRaichu || !hero.classList.contains('is-evolved')) return;
        const passo = Math.floor((performance.now() - inicioAnimacaoRaichu) / RAICHU_FRAME_MS);
        const quadro = RAICHU_SEQUENCE[passo % RAICHU_SEQUENCE.length];
        if (quadro === quadroRaichu) return;
        hero.src = RAICHU_FRAMES[quadro];
        quadroRaichu = quadro;
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
        const pausa = isEvolutionAnimating ? agora - evolutionStartTime : 0;
        limparAnimacaoEvolucao();
        inicioPartida += pausa;
        proximoItemEm += pausa;
        if (coletavel) coletavel.inicio += pausa;
        ultimoTickItem = agora;
        ultimoTickPontos = agora;
        ultimoTickCenario = agora;
        // A corrida começa quando a partida retoma, mantendo o personagem parado nos raios.
        inicioAnimacaoRaichu = agora;
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
        const sprite = collectibleSprites[especial ? 'thunderstone' : currentCharacter.coletaSprite] || null;
        const elemento = document.createElement(sprite ? 'span' : 'img');
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
            // Sonic já possui um GIF animado próprio.
            elemento.src = currentCharacter.coleta;
            elemento.alt = '';
            elemento.draggable = false;
        }
        elemento.style.bottom = `${Math.max(110, hero.offsetHeight + 15) + Math.random() * 25}px`;
        gameBoard.appendChild(elemento);
        const largura = elemento.offsetWidth;
        coletavel = { elemento, visual, sprite, largura, especial,
            x: gameBoard.clientWidth + largura, inicio: performance.now(), quadro: -1, altura: 0 };
        elemento.style.transform = `translateX(${coletavel.x}px)`;
        atualizarQuadroColetavel();
    }

    function atualizarQuadroColetavel() {
        if (!coletavel?.sprite) return;
        const { sprite, elemento, visual } = coletavel;
        const indice = Math.floor((performance.now() - coletavel.inicio) / 1000
            * sprite.fps * Math.sqrt(multiplicadorVelocidade)) % sprite.frames.length;
        if (indice === coletavel.quadro && coletavel.altura === elemento.offsetHeight) return;
        const quadro = sprite.frames[indice];
        const escala = elemento.offsetHeight / sprite.maxHeight;
        visual.style.width = `${quadro.w * escala}px`;
        visual.style.height = `${quadro.h * escala}px`;
        visual.style.backgroundSize = `${sprite.width * escala}px ${sprite.height * escala}px`;
        visual.style.backgroundPosition = `${-quadro.x * escala}px ${-quadro.y * escala}px`;
        visual.style.clipPath = quadro.clip;
        coletavel.quadro = indice;
        coletavel.altura = elemento.offsetHeight;
    }

    function atualizarColetaveis() {
        if (!isPlaying || isEvolutionAnimating || !currentCharacter) return;
        const agora = performance.now();
        // O gatilho depende da pontuação real, nunca do texto exibido no painel.
        if (currentCharacter.id === 'pikachu' && !pedraLiberada && !evoluiuParaRaichu
            && score >= PONTOS_PARA_EVOLUIR
            && raichuFrameImages.every((imagem) => imagem.complete && imagem.naturalWidth > 0)
            && thunderstoneImage.complete && thunderstoneImage.naturalWidth > 0) {
            pedraLiberada = true;
            removerColetavel();
            proximoItemEm = agora;
            clearTimeout(feedbackTimeout);
            collectFeedback.dataset.kind = 'evolution';
            collectFeedback.textContent = 'A Pedra do Trovão apareceu!';
            feedbackTimeout = setTimeout(() => { collectFeedback.textContent = ''; }, 1600);
        }
        const segundos = Math.min((agora - ultimoTickItem) / 1000, 0.1);
        ultimoTickItem = agora;
        if (!coletavel) {
            if (agora >= proximoItemEm) criarColetavel();
            return;
        }

        atualizarQuadroColetavel();

        // Mesma distância e duração base da animação do obstáculo.
        const pixelsPorSegundo = (gameBoard.clientWidth + 150) / 1.6;
        coletavel.x -= pixelsPorSegundo * multiplicadorVelocidade * segundos;
        coletavel.elemento.style.transform = `translateX(${coletavel.x}px)`;
        const item = coletavel.elemento.getBoundingClientRect();
        const personagem = hero.getBoundingClientRect();
        // Margens evitam coletar apenas por encostar no espaço vazio do GIF.
        const margemX = personagem.width * 0.18;
        const margemY = personagem.height * 0.12;
        const margemItemX = item.width * (currentCharacter.id === 'bart' ? 0.25 : 0.1);
        const margemItemY = item.height * 0.08;
        const tocou = personagem.right - margemX > item.left + margemItemX
            && personagem.left + margemX < item.right - margemItemX
            && personagem.bottom - margemY > item.top + margemItemY
            && personagem.top + margemY < item.bottom - margemItemY;

        if (tocou) {
            pontosExatos += PONTOS_POR_ITEM;
            score = Math.floor(pontosExatos);
            scoreDisplay.textContent = score;
            itensColetados++;
            collectDisplay.textContent = itensColetados;
            audio?.tocar('coleta');
            clearTimeout(feedbackTimeout);
            if (coletavel.especial) {
                evoluirParaRaichu();
            } else {
                collectFeedback.dataset.kind = 'normal';
                collectFeedback.textContent = `+${PONTOS_POR_ITEM} pontos!`;
                feedbackTimeout = setTimeout(() => { collectFeedback.textContent = ''; }, 800);
            }
            removerColetavel();
            proximoItemEm = agora + 700 + Math.random() * 800;
        } else if (coletavel.x < -coletavel.largura) {
            // Item perdido não rende pontos e não encerra a partida.
            removerColetavel();
            proximoItemEm = agora + 700 + Math.random() * 800;
        }
    }

    function evoluirParaRaichu() {
        if (currentCharacter.id !== 'pikachu' || evoluiuParaRaichu) return;
        evoluiuParaRaichu = true;
        pedraLiberada = false;
        clearTimeout(feedbackTimeout);
        collectFeedback.dataset.kind = 'evolution';
        collectFeedback.textContent = 'PIKACHU EVOLUIU PARA RAICHU!';
        feedbackTimeout = setTimeout(() => { collectFeedback.textContent = ''; }, 2800);

        // Pausa pontuação, colisões, aceleração, itens, obstáculo e pulo.
        evolutionStartTime = performance.now();
        isEvolutionAnimating = true;
        tempoRestantePulo = hero.classList.contains('jump')
            ? Math.max(0, fimDoPulo - evolutionStartTime) : 0;
        clearTimeout(jumpTimeout);
        jumpTimeout = null;
        gameBoard.classList.add('evolving');
        tocarAnimacaoEvolucao();
        audio?.tocar('evolucao');
        evolutionSwapTimeout = setTimeout(trocarSpriteParaRaichu, 600);
        evolutionTimeout = setTimeout(finalizarAnimacaoEvolucao, DURACAO_EVOLUCAO);
    }

    function resetElements() {
        audio?.pararEfeitos();
        limparAvisoNivel();
        mostrarNivel(NIVEIS[0]);
        multiplicadorVelocidade = NIVEIS[0].velocidade;
        deslocamentoCenario = 0;
        ultimoTickCenario = performance.now();
        sceneryTrack.style.transform = 'translate3d(0, 0, 0)';
        clearTimeout(jumpTimeout);
        jumpTimeout = null;
        fimDoPulo = 0;
        tempoRestantePulo = 0;
        pedraLiberada = false;
        evoluiuParaRaichu = false;
        quadroRaichu = 0;
        inicioAnimacaoRaichu = 0;
        isEvolutionAnimating = false;
        limparAnimacaoEvolucao();
        gameBoard.classList.remove('evolving');
        hero.classList.remove('is-evolved');
        hero.style.aspectRatio = '';
        hero.alt = 'Personagem';
        limparColetaveis();
        itensColetados = 0;
        collectDisplay.textContent = '0';
        // Reseta obstáculo
        pipe.style.animation = '';
        pipe.style.left = '';

        // Reseta personagem
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
        const margemObstaculo = obstaculo.width * HITBOX_OBSTACULO.lateral;
        const topoObstaculo = obstaculo.top + obstaculo.height * HITBOX_OBSTACULO.superior;
        const baseObstaculo = obstaculo.bottom - obstaculo.height * HITBOX_OBSTACULO.inferior;
        const tocou = personagem.right - margemHeroi > obstaculo.left + margemObstaculo
            && personagem.left + margemHeroi < obstaculo.right - margemObstaculo
            && personagem.bottom > topoObstaculo
            && personagem.top + personagem.height * 0.12 < baseObstaculo;
        if (tocou) {
            const heroPosition = parseFloat(window.getComputedStyle(hero).bottom);
            triggerGameOver(pipe.offsetLeft, heroPosition);
        }
    }

    function triggerGameOver(pipePosition, heroPosition) {
        if (!isPlaying) return;
        isPlaying = false;
        audio?.pararEfeitos();
        audio?.tocar('gameover');
        limparAvisoNivel();
        clearTimeout(jumpTimeout);
        jumpTimeout = null;
        limparColetaveis();
        clearInterval(gameLoop);
        clearInterval(scoreLoop);

        
        gameBoard.classList.remove('running');

        
        pipe.style.animation = 'none';
        pipe.style.left = `${pipePosition}px`;

        // Congela o personagem na altura exata e muda para a imagem de Game Over
        hero.style.animation = 'none';
        hero.style.bottom = `${heroPosition}px`;
        if (currentCharacter) {
            hero.src = evoluiuParaRaichu ? RAICHU_IMAGE : currentCharacter.dead;
        }
        limparAnimacaoEvolucao();
        isEvolutionAnimating = false;
        gameBoard.classList.remove('evolving');

        // Atualiza modal de Game Over
        finalScoreValue.textContent = score;
        saveStatusMsg.textContent = 'Salvando pontuação no banco...';
        saveStatusMsg.style.color = '#ffcc00';

        // Abre modal de Game Over
        gameoverModal.classList.add('active');

        // Salva a pontuação no banco MySQL via PHP
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
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                saveStatusMsg.textContent = 'Pontuação registrada no banco!';
                saveStatusMsg.style.color = '#10b981';
                if (data.ranking) {
                    renderRanking(data.ranking, playerName, finalScore);
                }
            } else {
                saveStatusMsg.textContent = '⚠️ ' + (data.message || 'Erro ao registrar.');
                saveStatusMsg.style.color = '#ef4444';
            }
        })
        .catch(err => {
            console.error('Erro na requisição:', err);
            saveStatusMsg.textContent = '⚠️ Erro ao conectar ao servidor.';
            saveStatusMsg.style.color = '#ef4444';
        });
    }

    /**
     * Busca o ranking atualizado no banco
     */
    function fetchRanking() {
        fetch('php/obter-ranking.php')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success' && data.ranking) {
                    renderRanking(data.ranking);
                }
            })
            .catch(err => console.error('Erro ao buscar ranking:', err));
    }

    /**
     * Atualiza a tabela HTML do ranking
     */
    function renderRanking(list, highlightName = null, highlightScore = null) {
        atualizarRecorde(list);
        if (!rankingBody) return;
        rankingBody.innerHTML = '';

        if (!list || list.length === 0) {
            rankingBody.innerHTML = '<tr><td colspan="3" class="loading-cell">Nenhuma pontuação gravada ainda. Jogue para ser o 1º!</td></tr>';
            return;
        }

        let highlighted = false;

        list.forEach((item, index) => {
            const tr = document.createElement('tr');

            // Destaca a pontuação atual recém-salva se coincidir
            if (!highlighted && highlightName && item.nome === highlightName && parseInt(item.pontos, 10) === highlightScore) {
                tr.classList.add('highlight-current');
                highlighted = true;
            }

            let medal = `${index + 1}º`;
            if (index === 0) medal = '🥇 1º';
            else if (index === 1) medal = '🥈 2º';
            else if (index === 2) medal = '🥉 3º';

            tr.innerHTML = `
                <td class="ranking-pos">${medal}</td>
                <td><strong>${escapeHtml(item.nome)}</strong></td>
                <td>${parseInt(item.pontos, 10)} pts</td>
            `;

            rankingBody.appendChild(tr);
        });
    }

    /**
     * Função auxiliar para sanitizar strings no HTML
     */
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Submit do Formulário de Início (INICIAR JOGO)
    startForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Impede o recarregamento da página

        const nameValue = playerInput.value.trim();
        if (!nameValue) {
            playerInput.focus();
            return;
        }

        currentPlayer = nameValue;
        localStorage.setItem('hero_jump_player', currentPlayer);

        currentCharacter = getSelectedCharacter();
        if (currentCharacter) {
            localStorage.setItem('hero_jump_character', currentCharacter.id);
        }

        // Fecha tela de início e começa o jogo
        startModal.classList.remove('active');
        startGame();
    });

    // Botão "VER RANKING" na tela inicial
    btnViewRanking.addEventListener('click', () => {
        fetchRanking();
        finalScoreValue.textContent = '---';
        saveStatusMsg.textContent = '';
        startModal.classList.remove('active');
        gameoverModal.classList.add('active');
    });

    // Botão "JOGAR NOVAMENTE" no Game Over
    btnRestart.addEventListener('click', () => {
        gameoverModal.classList.remove('active');
        if (!currentPlayer) {
            startModal.classList.add('active');
            playerInput.focus();
        } else {
            startGame();
        }
    });

    // 4. Botão "TROCAR JOGADOR" no Game Over
    btnChangePlayer.addEventListener('click', () => {
        gameoverModal.classList.remove('active');
        resetElements();
        startModal.classList.add('active');
        playerInput.value = '';
        playerInput.focus();
    });

    // 5. Controle do Pulo por Teclado (Espaço ou Seta para Cima)
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ' || e.code === 'ArrowUp') {
            if (isPlaying) {
                e.preventDefault();
                jump();
            }
        }
    });

    // 6. Controle do Pulo por clique/toque no cenário (como diz a dica na tela)
    gameBoard.addEventListener('pointerdown', (e) => {
        if (isPlaying) {
            e.preventDefault();
            jump();
        }
    });
});
