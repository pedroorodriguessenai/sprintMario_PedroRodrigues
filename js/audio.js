/** Áudio do Hero Jump. Carregado apenas na página do jogo. */
(() => {
    const arquivos = {
        musica: { caminho: 'assets/audio/background.mp3', volume: 0.25 },
        coleta: { caminho: 'assets/audio/collect.mp3', volume: 0.6 },
        gameover: { caminho: 'assets/audio/game-over.mp3', volume: 0.8 },
        evolucao: { caminho: 'assets/audio/evolution.mp3', volume: 0.8 }
    };
    const botao = document.getElementById('audio-toggle');
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    let contexto = null;
    let volumeGeral = null;
    let volumeMusica = null;
    let musica = null;
    let versaoEfeitos = 0;
    let silenciado = false;
    const buffers = new Map();
    const decodificacoes = new Map();
    const efeitos = new Map();

    try {
        silenciado = localStorage.getItem('hero_jump_muted') === 'true';
    } catch (_) {
        // O áudio continua disponível se o navegador bloquear o armazenamento.
    }

    // Pré-carrega os MP3s; a reprodução só começa após interação do jogador.
    const carregamentos = new Map(Object.entries(arquivos).map(([tipo, arquivo]) => [
        tipo,
        fetch(arquivo.caminho)
            .then((resposta) => {
                if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
                return resposta.arrayBuffer();
            })
            .catch((erro) => {
                console.warn(`Não foi possível carregar o áudio ${tipo}:`, erro);
                return null;
            })
    ]));

    function atualizarBotao() {
        if (!botao) return;
        botao.textContent = silenciado ? 'Som: desligado' : 'Som: ligado';
        botao.setAttribute('aria-pressed', String(silenciado));
    }

    function obterBuffer(tipo) {
        if (!contexto) return Promise.resolve(null);
        if (buffers.has(tipo)) return Promise.resolve(buffers.get(tipo));
        if (!decodificacoes.has(tipo)) {
            const promessa = carregamentos.get(tipo).then(async (dados) => {
                if (!dados) return null;
                const buffer = await contexto.decodeAudioData(dados);
                buffers.set(tipo, buffer);
                return buffer;
            }).catch((erro) => {
                console.warn(`Não foi possível decodificar o áudio ${tipo}:`, erro);
                return null;
            });
            decodificacoes.set(tipo, promessa);
        }
        return decodificacoes.get(tipo);
    }

    function atualizarVolumeMusica() {
        if (!volumeMusica) return;
        const destaque = [...efeitos.values()].some((tipo) =>
            tipo === 'evolucao' || tipo === 'gameover'
        );
        const volume = destaque ? 0.06 : arquivos.musica.volume;
        volumeMusica.gain.setTargetAtTime(volume, contexto.currentTime, 0.08);
    }

    async function iniciarMusica() {
        const buffer = await obterBuffer('musica');
        if (!buffer || musica || contexto.state !== 'running' || document.hidden) return;
        musica = contexto.createBufferSource();
        musica.buffer = buffer;
        musica.loop = true;
        musica.connect(volumeMusica);
        musica.start();
    }

    async function ativar() {
        if (!AudioContextClass) return;
        try {
            if (!contexto) {
                contexto = new AudioContextClass();
                volumeGeral = contexto.createGain();
                volumeGeral.gain.value = silenciado ? 0 : 1;
                volumeGeral.connect(contexto.destination);
                volumeMusica = contexto.createGain();
                volumeMusica.gain.value = arquivos.musica.volume;
                volumeMusica.connect(volumeGeral);
                Object.keys(arquivos).forEach(obterBuffer);
            }
            // Chamado diretamente pelo clique/tecla para liberar áudio no celular.
            if (contexto.state !== 'running') await contexto.resume();
            await iniciarMusica();
        } catch (_) {
            // Se o navegador negar a reprodução, uma próxima interação tenta novamente.
        }
    }

    async function tocar(tipo) {
        if (!contexto || !arquivos[tipo] || tipo === 'musica' || silenciado || document.hidden) return;
        const versao = versaoEfeitos;
        const buffer = await obterBuffer(tipo);
        // Impede sons atrasados de uma partida anterior após carregar/decodificar.
        if (!buffer || versao !== versaoEfeitos || silenciado || document.hidden
            || contexto.state !== 'running') return;
        const fonte = contexto.createBufferSource();
        const volume = contexto.createGain();
        fonte.buffer = buffer;
        volume.gain.value = arquivos[tipo].volume;
        fonte.connect(volume);
        volume.connect(volumeGeral);
        efeitos.set(fonte, tipo);
        atualizarVolumeMusica();
        fonte.onended = () => {
            efeitos.delete(fonte);
            fonte.disconnect();
            volume.disconnect();
            atualizarVolumeMusica();
        };
        fonte.start();
    }

    function pararEfeitos() {
        versaoEfeitos++;
        const ativos = [...efeitos.keys()];
        efeitos.clear();
        ativos.forEach((fonte) => fonte.stop());
        atualizarVolumeMusica();
    }

    function iniciarPorInteracao(evento) {
        if (evento.target.closest?.('a[href], #audio-toggle')) return;
        if (evento.type === 'keydown' && (evento.ctrlKey || evento.metaKey || evento.altKey
            || ['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'Escape'].includes(evento.key))) return;
        ativar();
    }

    document.addEventListener('pointerdown', iniciarPorInteracao);
    document.addEventListener('keydown', iniciarPorInteracao);
    botao?.addEventListener('click', () => {
        silenciado = !silenciado;
        try {
            localStorage.setItem('hero_jump_muted', String(silenciado));
        } catch (_) { /* Preferência válida nesta visita. */ }
        if (volumeGeral) volumeGeral.gain.value = silenciado ? 0 : 1;
        if (silenciado) pararEfeitos();
        atualizarBotao();
        ativar();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            pararEfeitos();
            contexto?.suspend().catch(() => {});
        } else if (contexto) {
            ativar();
        }
    });
    window.addEventListener('pagehide', () => {
        pararEfeitos();
        contexto?.suspend().catch(() => {});
    });
    window.addEventListener('pageshow', () => {
        if (contexto && !document.hidden) ativar();
    });

    if (!AudioContextClass && botao) {
        botao.disabled = true;
        botao.textContent = 'Áudio indisponível';
    } else {
        atualizarBotao();
    }
    window.HeroJumpAudio = { tocar, pararEfeitos };
})();
