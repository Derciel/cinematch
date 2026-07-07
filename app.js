// CineMatch - Lógica Interativa do Sistema

// Normalização do ecossistema de streaming do casal
// Eles têm Prime Video, Max e On-Demand (que contém todos os filmes).
// Filtramos para destacar Prime Video e Max quando disponíveis, e adicionamos sempre "On-Demand".
if (typeof MOVIE_DATABASE !== 'undefined') {
  MOVIE_DATABASE.forEach(movie => {
    const customPlatforms = [];
    if (movie.platforms.includes("Prime Video")) {
      customPlatforms.push("Prime Video");
    }
    if (movie.platforms.includes("Max") || movie.platforms.includes("HBO Max")) {
      customPlatforms.push("Max");
    }
    // Adicionar On-Demand como opção garantida para todos os filmes
    customPlatforms.push("On-Demand");
    movie.platforms = customPlatforms;
  });
}

// Gerenciamento de Estado Global
const state = {
  partnerA: "Parceiro A",
  partnerB: "Parceiro B",
  selectedGenres: ["Ficção Científica", "Terror", "Ação", "Aventura"],
  gameMode: "turn", // "turn" ou "split"
  
  // Dados de Jogo
  moviesToSwipe: [], // Lista filtrada de hoje
  likesA: new Set(), // IDs de filmes curtidos pelo Parceiro A
  likesB: new Set(), // IDs de filmes curtidos pelo Parceiro B
  superLikesA: new Set(),
  superLikesB: new Set(),
  
  // Estado das Rodadas
  currentTurn: "A", // "A" ou "B"
  matches: [],      // Matches históricos salvos no localStorage
  syncedPartnerA: false, // Flag se os likes do Parceiro A vieram de sincronização externa
  
  // Controle de Cartas Ativas
  cardInstancesA: [],
  cardInstancesB: []
};

// Configurações do Gesto de Swipe
const SWIPE_THRESHOLD = 120; // px para registrar o swipe
const SWIPE_SUPER_THRESHOLD = 100; // px vertical para superlike

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  loadMatchesFromStorage();
  initSetupUI();
  initNavigation();
  initButtons();
  initKeyboardShortcuts();
  initNFCSync();
  initWinesScreen();
  updateAnniversaryCounter();
  initSplashScreen();
});

// ==================== NAV E TELAS ====================
function initNavigation() {
  const links = document.querySelectorAll(".nav-link");
  links.forEach(link => {
    link.addEventListener("click", (e) => {
      const targetScreen = link.getAttribute("data-screen");
      
      // Se tentar navegar sem ter configurado o jogo, força voltar ao setup (exceto se for para a aba de ideias)
      if (targetScreen === "play-screen" && state.moviesToSwipe.length === 0) {
        if (state.gameMode === "split") {
          switchScreen("split-screen-play");
          return;
        }
        switchScreen("setup-screen");
        return;
      }
      
      if (targetScreen === "play-screen" && state.gameMode === "split") {
        switchScreen("split-screen-play");
        updateActiveNavLink("play-screen");
      } else {
        switchScreen(targetScreen);
        updateActiveNavLink(targetScreen);
      }
    });
  });

  document.getElementById("header-logo").addEventListener("click", () => {
    switchScreen("setup-screen");
    updateActiveNavLink("");
  });
}

function switchScreen(screenId) {
  const screens = document.querySelectorAll(".screen");
  screens.forEach(s => s.classList.remove("active"));
  
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add("active");
    
    // Lógicas específicas ao carregar certas telas
    if (screenId === "history-screen") {
      renderMatchesGrid();
    }
  }
}

function updateActiveNavLink(screenId) {
  const links = document.querySelectorAll(".nav-link");
  links.forEach(link => {
    const dataScreen = link.getAttribute("data-screen");
    if (dataScreen === screenId || (screenId === "split-screen-play" && dataScreen === "play-screen")) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

// ==================== SETUP MENU ====================
function initSetupUI() {
  // Gêneros Pills
  const genrePills = document.querySelectorAll(".genre-pill");
  genrePills.forEach(pill => {
    pill.addEventListener("click", () => {
      const genre = pill.getAttribute("data-genre");
      if (pill.classList.contains("selected")) {
        // Garantir que pelo menos um gênero fique selecionado
        const selectedCount = document.querySelectorAll(".genre-pill.selected").length;
        if (selectedCount > 1) {
          pill.classList.remove("selected");
          state.selectedGenres = state.selectedGenres.filter(g => g !== genre);
        } else {
          alert("Escolha pelo menos 1 gênero para podermos recomendar!");
        }
      } else {
        pill.classList.add("selected");
        state.selectedGenres.push(genre);
      }
    });
  });

  // Opções de Modo
  const modeOptions = document.querySelectorAll(".mode-option");
  modeOptions.forEach(opt => {
    opt.addEventListener("click", () => {
      modeOptions.forEach(o => o.classList.remove("selected"));
      opt.classList.add("selected");
      state.gameMode = opt.getAttribute("data-mode");
    });
  });

  // Botão Iniciar
  document.getElementById("start-match-btn").addEventListener("click", startCineMatch);
}

function startCineMatch() {
  const nameA = document.getElementById("partner-a-input").value.trim();
  const nameB = document.getElementById("partner-b-input").value.trim();
  
  state.partnerA = nameA || "Parceiro A";
  state.partnerB = nameB || "Parceiro B";
  
  // Filtrar filmes baseado nos gêneros selecionados
  // Um filme é selecionado se contiver pelo menos um dos gêneros favoritos de hoje
  state.moviesToSwipe = MOVIE_DATABASE.filter(movie => {
    return movie.genres.some(genre => state.selectedGenres.includes(genre));
  });
  
  // Embaralhar aleatoriamente os filmes selecionados para dinâmica de jogo
  state.moviesToSwipe.sort(() => Math.random() - 0.5);
  
  if (state.moviesToSwipe.length === 0) {
    alert("Nenhum filme disponível para estes gêneros. Selecione outros!");
    return;
  }

  // Se já veio sincronizado do parceiro A, mantém os likes dele e inicia no turno B
  if (state.syncedPartnerA) {
    state.likesB.clear();
    state.superLikesA.clear();
    state.superLikesB.clear();
    state.currentTurn = "B";
  } else {
    // Limpar estados anteriores de swiping
    state.likesA.clear();
    state.likesB.clear();
    state.superLikesA.clear();
    state.superLikesB.clear();
    state.currentTurn = "A";
  }
  
  // Mostrar o menu de abas superior
  document.getElementById("nav-menu").style.display = "flex";

  // Iniciar conforme o modo
  if (state.gameMode === "turn") {
    if (state.currentTurn === "B") {
      // Configurar indicador de Turno para o Parceiro B diretamente
      const indicator = document.getElementById("turn-indicator-name");
      indicator.textContent = `Turno de ${state.partnerB}`;
      indicator.className = "player-turn-indicator secondary";
      indicator.style.color = "var(--secondary)";
      indicator.style.boxShadow = "var(--shadow-neon-secondary)";
      indicator.style.border = "1px solid rgba(139, 92, 246, 0.2)";
      indicator.style.background = "rgba(139, 92, 246, 0.08)";
      
      // Renderizar direto o deck de B
      renderDeck("cards-deck", "B");
    } else {
      // Configurar indicador de Turno do Parceiro A
      const indicator = document.getElementById("turn-indicator-name");
      indicator.textContent = `Turno de ${state.partnerA}`;
      indicator.className = "player-turn-indicator";
      indicator.style.color = "";
      indicator.style.boxShadow = "";
      indicator.style.border = "";
      indicator.style.background = "";
      
      // Renderizar deck para o Parceiro A
      renderDeck("cards-deck", "A");
    }
    switchScreen("play-screen");
    updateActiveNavLink("play-screen");
  } else {
    // Modo Tela Dividida
    document.getElementById("split-tag-a").textContent = state.partnerA;
    document.getElementById("split-tag-b").textContent = state.partnerB;
    
    // Renderizar decks paralelos
    renderDeck("cards-deck-a", "split-A");
    renderDeck("cards-deck-b", "split-B");
    
    switchScreen("split-screen-play");
    updateActiveNavLink("play-screen");
  }
}

// ==================== CARD RENDERING ====================
function renderDeck(deckContainerId, side) {
  const container = document.getElementById(deckContainerId);
  
  // Limpar cartas anteriores (mantendo apenas transições se houver)
  const previousCards = container.querySelectorAll(".movie-card");
  previousCards.forEach(c => c.remove());

  const transitionOverlay = container.querySelector(".round-transition-overlay");
  
  // Inserir cards de trás para a frente (para que o primeiro da lista fique no topo)
  const listToRender = [...state.moviesToSwipe];
  
  if (listToRender.length === 0) {
    renderEmptyDeck(container);
    return;
  }

  listToRender.reverse().forEach((movie, index) => {
    const card = document.createElement("div");
    card.className = "movie-card glass";
    card.setAttribute("data-id", movie.id);
    // Z-index progressivo
    card.style.zIndex = index + 1;
    
    // Formatar plataforma HTML
    const platformsHTML = movie.platforms.map(p => `<span class="platform-tag">${p}</span>`).join("");
    
    card.innerHTML = `
      <div class="movie-poster-container">
        <!-- Visual Cue Stamps -->
        <div class="card-stamp card-stamp-like">GOSTEI</div>
        <div class="card-stamp card-stamp-dislike">NOPE</div>
        <div class="card-stamp card-stamp-super">SUPER</div>
        
        <img class="movie-poster" src="${movie.poster}" alt="Poster de ${movie.title}">
        <span class="movie-badge-genre">${movie.genres[0]}</span>
        <span class="movie-badge-rating">
          <svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
          ${movie.rating.toFixed(1)}
        </span>
      </div>
      
      <div class="movie-details">
        <div class="movie-title-row">
          <h3 class="movie-title">${movie.title}</h3>
          <span class="movie-year">${movie.year}</span>
        </div>
        <div class="movie-meta">
          <span>${movie.director}</span>
          <span>•</span>
          <span>${movie.duration}</span>
        </div>
        <p class="movie-synopsis">${movie.synopsis}</p>
        <div class="movie-platforms-row">
          <span class="movie-platforms-title">Streaming:</span>
          ${platformsHTML}
        </div>
      </div>
    `;
    
    // Anexar eventos de arrastar (Swipe)
    attachDragEvents(card, side);
    
    // Inserir antes da tela de transição se existir
    if (transitionOverlay) {
      container.insertBefore(card, transitionOverlay);
    } else {
      container.appendChild(card);
    }
  });

  // Guardar referência das instâncias ativas
  if (side === "A" || side === "B") {
    state.cardInstancesA = Array.from(container.querySelectorAll(".movie-card"));
  } else if (side === "split-A") {
    state.cardInstancesA = Array.from(container.querySelectorAll(".movie-card"));
  } else if (side === "split-B") {
    state.cardInstancesB = Array.from(container.querySelectorAll(".movie-card"));
  }
}

function renderEmptyDeck(container) {
  // Se for o painel principal
  const isSplitSide = container.closest(".split-side");
  let actionBtnText = "Ir para Matches";
  let actionFn = () => switchScreen("history-screen");

  if (state.gameMode === "turn" && state.currentTurn === "A") {
    // Se for fim do turno de A no modo turnos
    actionBtnText = `Passar para ${state.partnerB}`;
    actionFn = () => triggerTurnTransition();
  } else if (state.gameMode === "turn" && state.currentTurn === "B") {
    // Turno B acabou
    actionBtnText = "Ver Matches";
    actionFn = () => finishTurnBasedMatch();
  }

  const emptyDiv = document.createElement("div");
  emptyDiv.className = "deck-empty glass";
  emptyDiv.innerHTML = `
    <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
      <path d="M8 12h8"/>
    </svg>
    <h3 class="deck-empty-title">Você chegou ao fim!</h3>
    <p class="deck-empty-desc">Todos os filmes selecionados foram avaliados nesta rodada.</p>
    <button class="btn-cta" style="width: auto; margin-top: 1rem;">${actionBtnText}</button>
  `;
  
  emptyDiv.querySelector("button").addEventListener("click", actionFn);
  container.appendChild(emptyDiv);
}

// ==================== GESTOS DE SWIPE (MOUSE / TOQUE) ====================
function attachDragEvents(card, side) {
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let isDragging = false;
  
  // Elementos internos dos carimbos (stamps)
  const stampLike = card.querySelector(".card-stamp-like");
  const stampDislike = card.querySelector(".card-stamp-dislike");
  const stampSuper = card.querySelector(".card-stamp-super");

  // Handlers comuns
  const dragStart = (e) => {
    // Ignorar cliques normais em botões ou links internos se houver
    if (e.target.closest("button") || e.target.closest("a")) return;
    
    isDragging = true;
    card.classList.add("swiping");
    
    // Coordenadas iniciais
    startX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
    startY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY;
  };

  const dragMove = (e) => {
    if (!isDragging) return;
    
    // Coordenadas atuais
    currentX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
    currentY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY;
    
    // Diferencial
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;
    
    // Calcular rotação proporcional ao deslocamento lateral
    const rotation = deltaX / 15;
    
    // Mover o elemento fisicamente com aceleração por hardware (3D)
    card.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) rotate(${rotation}deg)`;
    
    // Opacidade dos stamps baseada no deslocamento
    if (deltaX > 20) {
      // Like (Gostei) -> Direita
      stampLike.style.opacity = Math.min(deltaX / SWIPE_THRESHOLD, 0.9);
      stampDislike.style.opacity = 0;
      stampSuper.style.opacity = 0;
    } else if (deltaX < -20) {
      // Dislike (Nope) -> Esquerda
      stampDislike.style.opacity = Math.min(Math.abs(deltaX) / SWIPE_THRESHOLD, 0.9);
      stampLike.style.opacity = 0;
      stampSuper.style.opacity = 0;
    } else if (deltaY < -20 && Math.abs(deltaX) < 40) {
      // Superlike -> Cima
      stampSuper.style.opacity = Math.min(Math.abs(deltaY) / SWIPE_SUPER_THRESHOLD, 0.9);
      stampLike.style.opacity = 0;
      stampDislike.style.opacity = 0;
    } else {
      stampLike.style.opacity = 0;
      stampDislike.style.opacity = 0;
      stampSuper.style.opacity = 0;
    }
  };

  const dragEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    card.classList.remove("swiping");
    
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;
    
    // Decisão final baseada no arraste
    if (deltaX > SWIPE_THRESHOLD) {
      // Swipe Direita (LIKE)
      swipeCard(card, "right", side);
    } else if (deltaX < -SWIPE_THRESHOLD) {
      // Swipe Esquerda (DISLIKE)
      swipeCard(card, "left", side);
    } else if (deltaY < -SWIPE_SUPER_THRESHOLD && Math.abs(deltaX) < SWIPE_THRESHOLD / 2) {
      // Swipe Cima (SUPERLIKE)
      swipeCard(card, "up", side);
    } else {
      // Resetar posição
      card.style.transform = "";
      stampLike.style.opacity = 0;
      stampDislike.style.opacity = 0;
      stampSuper.style.opacity = 0;
    }
    
    // Zerar deltas
    startX = startY = currentX = currentY = 0;
  };

  // Eventos de Mouse
  card.addEventListener("mousedown", dragStart);
  window.addEventListener("mousemove", dragMove);
  window.addEventListener("mouseup", dragEnd);
  
  // Eventos de Toque (Mobile)
  card.addEventListener("touchstart", dragStart, { passive: true });
  card.addEventListener("touchmove", dragMove, { passive: true });
  card.addEventListener("touchend", dragEnd, { passive: true });
}

// Executa a animação de deslizar e processa o voto
function swipeCard(card, direction, side) {
  card.classList.add("dismissed");
  const movieId = card.getAttribute("data-id");
  
  let xMove = 0;
  let yMove = 0;
  let rotate = 0;
  
  // Direções físicas de saída
  if (direction === "right") {
    xMove = window.innerWidth;
    rotate = 35;
  } else if (direction === "left") {
    xMove = -window.innerWidth;
    rotate = -35;
  } else if (direction === "up") {
    yMove = -window.innerHeight;
    rotate = 5;
  }
  
  // Aplicar transformação final de saída com aceleração por hardware (3D)
  card.style.transform = `translate3d(${xMove}px, ${yMove}px, 0) rotate(${rotate}deg)`;
  card.style.opacity = "0";

  // Remover carta física do DOM após a transição terminar
  setTimeout(() => {
    card.remove();
    // Registrar o voto
    registerVote(movieId, direction, side);
  }, 400);
}

// Registrar o Voto no State
function registerVote(movieId, direction, side) {
  const isSuper = (direction === "up");
  const isLike = (direction === "right" || isSuper);
  
  if (side === "A") {
    if (isLike) {
      state.likesA.add(movieId);
      if (isSuper) state.superLikesA.add(movieId);
    }
    checkDeckProgress("A");
  } else if (side === "B") {
    if (isLike) {
      state.likesB.add(movieId);
      if (isSuper) state.superLikesB.add(movieId);
      
      // Se o parceiro A já curtiu este filme, comemora o Match instantaneamente!
      if (state.likesA.has(movieId)) {
        triggerMatchCelebration(movieId, "Modo Turnos");
      }
    }
    checkDeckProgress("B");
  } else if (side === "split-A") {
    if (isLike) {
      state.likesA.add(movieId);
      if (isSuper) state.superLikesA.add(movieId);
      checkInstantSplitMatch(movieId);
    }
    checkDeckProgress("split-A");
  } else if (side === "split-B") {
    if (isLike) {
      state.likesB.add(movieId);
      if (isSuper) state.superLikesB.add(movieId);
      checkInstantSplitMatch(movieId);
    }
    checkDeckProgress("split-B");
  }
}

// Verificar se as cartas do deck atual acabaram
function checkDeckProgress(side) {
  if (side === "A") {
    const deck = document.getElementById("cards-deck");
    const activeCards = deck.querySelectorAll(".movie-card");
    if (activeCards.length === 0) {
      triggerTurnTransition();
    }
  } else if (side === "B") {
    const deck = document.getElementById("cards-deck");
    const activeCards = deck.querySelectorAll(".movie-card");
    if (activeCards.length === 0) {
      finishTurnBasedMatch();
    }
  } else if (side.startsWith("split")) {
    const deckA = document.getElementById("cards-deck-a");
    const deckB = document.getElementById("cards-deck-b");
    const cardsA = deckA.querySelectorAll(".movie-card").length;
    const cardsB = deckB.querySelectorAll(".movie-card").length;
    
    // Se ambos acabaram, ir para histórico/matches
    if (cardsA === 0 && cardsB === 0) {
      setTimeout(() => {
        switchScreen("history-screen");
      }, 500);
    }
  }
}

// Transição no Modo Turnos (Bloqueio "Passa o celular")
function triggerTurnTransition() {
  state.currentTurn = "B";
  
  document.getElementById("turn-indicator-name").textContent = `Turno de ${state.partnerB}`;
  document.getElementById("turn-indicator-name").className = "player-turn-indicator secondary";
  document.getElementById("turn-indicator-name").style.color = "var(--secondary)";
  document.getElementById("turn-indicator-name").style.boxShadow = "var(--shadow-neon-secondary)";
  document.getElementById("turn-indicator-name").style.border = "1px solid rgba(139, 92, 246, 0.2)";
  document.getElementById("turn-indicator-name").style.background = "rgba(139, 92, 246, 0.08)";
  
  // Alterar texto instrucional
  document.getElementById("transition-instruction-text").textContent = `Passe o dispositivo para ${state.partnerB}. Os palpites de ${state.partnerA} foram ocultados por segurança!`;
  
  // Ativar overlay de bloqueio
  const overlay = document.getElementById("round-transition-screen");
  overlay.classList.add("active");
}

// ==================== INTERATIVE BUTTONS CONTROLS ====================
function initButtons() {
  // Controles de Ação de Botões (Interface Regular)
  document.getElementById("action-dislike").addEventListener("click", () => {
    triggerButtonSwipe("left");
  });
  document.getElementById("action-like").addEventListener("click", () => {
    triggerButtonSwipe("right");
  });
  document.getElementById("action-superlike").addEventListener("click", () => {
    triggerButtonSwipe("up");
  });

  // Botão "Pronto para rodada B"
  document.getElementById("next-turn-ready-btn").addEventListener("click", () => {
    document.getElementById("round-transition-screen").classList.remove("active");
    // Renderiza novamente o deck de cartas para o Turno B
    renderDeck("cards-deck", "B");
  });

  // Botões de Ação na Tela Dividida
  document.getElementById("action-split-dislike-a").addEventListener("click", () => triggerSplitButtonSwipe("left", "split-A"));
  document.getElementById("action-split-like-a").addEventListener("click", () => triggerSplitButtonSwipe("right", "split-A"));
  document.getElementById("action-split-dislike-b").addEventListener("click", () => triggerSplitButtonSwipe("left", "split-B"));
  document.getElementById("action-split-like-b").addEventListener("click", () => triggerSplitButtonSwipe("right", "split-B"));

  // Botões da Tela de Celebração de Match
  document.getElementById("match-keep-swiping-btn").addEventListener("click", () => {
    document.getElementById("match-celebration-screen").classList.remove("active");
    stopConfetti();
  });

  document.getElementById("match-watch-now-btn").addEventListener("click", () => {
    const movieTitle = document.getElementById("match-movie-title").textContent;
    // Abre pesquisa do google indicando onde assistir ao filme
    window.open(`https://www.google.com/search?q=onde+assistir+filme+${encodeURIComponent(movieTitle)}`, "_blank");
  });

  // Botão Roleta
  document.getElementById("spin-wheel-btn").addEventListener("click", spinRouletteWheel);
}

// Simular o swipe de carta através dos botões circulares da interface principal
function triggerButtonSwipe(direction) {
  const deck = document.getElementById("cards-deck");
  const cards = Array.from(deck.querySelectorAll(".movie-card"));
  
  if (cards.length > 0) {
    // A última carta no DOM é a do topo (z-index maior)
    const topCard = cards[cards.length - 1];
    const side = state.currentTurn; // "A" ou "B"
    
    // Aplicar classe e carimbo apropriado antes de sair
    const stampName = direction === "right" ? "like" : (direction === "left" ? "dislike" : "super");
    const stamp = topCard.querySelector(`.card-stamp-${stampName}`);
    if (stamp) stamp.style.opacity = "0.9";
    
    swipeCard(topCard, direction, side);
  }
}

// Simular o swipe na Tela Dividida
function triggerSplitButtonSwipe(direction, side) {
  const containerId = side === "split-A" ? "cards-deck-a" : "cards-deck-b";
  const deck = document.getElementById(containerId);
  const cards = Array.from(deck.querySelectorAll(".movie-card"));
  
  if (cards.length > 0) {
    const topCard = cards[cards.length - 1];
    const stampName = direction === "right" ? "like" : "dislike";
    const stamp = topCard.querySelector(`.card-stamp-${stampName}`);
    if (stamp) stamp.style.opacity = "0.9";
    
    swipeCard(topCard, direction, side);
  }
}

// ==================== SHORTCUTS DE TECLADO ====================
function initKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Apenas rodar atalhos se a tela estiver visível
    const splitPlayVisible = document.getElementById("split-screen-play").classList.contains("active");
    const playVisible = document.getElementById("play-screen").classList.contains("active");
    const matchCelebrationActive = document.getElementById("match-celebration-screen").classList.contains("active");
    
    // Ignorar se estiver em algum input (ex: tela de setup)
    if (document.activeElement.tagName === "INPUT") return;
    
    // Fechar tela de match com Esc ou Espaço
    if (matchCelebrationActive && (e.key === "Escape" || e.key === " ")) {
      document.getElementById("match-celebration-screen").classList.remove("active");
      stopConfetti();
      return;
    }

    if (splitPlayVisible) {
      // Split Screen Controles de Teclado
      switch (e.key.toLowerCase()) {
        // Player A (Esquerda): Q / W
        case "q":
          triggerSplitButtonSwipe("left", "split-A");
          break;
        case "w":
          triggerSplitButtonSwipe("right", "split-A");
          break;
          
        // Player B (Direita): O / P
        case "o":
          triggerSplitButtonSwipe("left", "split-B");
          break;
        case "p":
          triggerSplitButtonSwipe("right", "split-B");
          break;
      }
    } else if (playVisible) {
      // Turn-based Controles de Teclado
      switch (e.key) {
        case "ArrowLeft":
          triggerButtonSwipe("left");
          break;
        case "ArrowRight":
          triggerButtonSwipe("right");
          break;
        case "ArrowUp":
          triggerButtonSwipe("up");
          break;
      }
    }
  });
}

// ==================== LÓGICA DE MATCHES E CRUZAMENTO ====================

// Checa match instantâneo no modo Tela Dividida
function checkInstantSplitMatch(movieId) {
  if (state.likesA.has(movieId) && state.likesB.has(movieId)) {
    // É um MATCH!
    triggerMatchCelebration(movieId, "Tela Dividida");
  }
}

// Finaliza a rodada por turnos e cruza os dados
function finishTurnBasedMatch() {
  // Achar interseção de likes dos dois
  const commonLikes = [...state.likesA].filter(id => state.likesB.has(id));
  
  if (commonLikes.length > 0) {
    // Salvar todos os matches
    commonLikes.forEach(id => {
      saveMatch(id, "Turnos");
    });
    
    // Celebrar com o primeiro match encontrado
    triggerMatchCelebration(commonLikes[0], "Modo Turnos");
  } else {
    // Sem matches comuns
    alert("Infelizmente não tivemos nenhum match de filmes em comum nessa rodada. Que tal tentar novamente ativando outros gêneros?");
    switchScreen("setup-screen");
  }
}

// Salvar um Match Histórico
function saveMatch(movieId, modeName) {
  // Evitar duplicados
  if (state.matches.some(m => m.movieId === movieId)) return;
  
  const movie = MOVIE_DATABASE.find(m => m.id === movieId);
  if (!movie) return;

  const newMatch = {
    movieId: movieId,
    movieTitle: movie.title,
    movieYear: movie.year,
    genres: movie.genres,
    poster: movie.poster,
    rating: movie.rating,
    matchedAt: new Date().toLocaleDateString("pt-BR"),
    gameMode: modeName
  };

  state.matches.unshift(newMatch);
  saveMatchesToStorage();
}

function triggerMatchCelebration(movieId, modeName) {
  // Salvar no storage
  saveMatch(movieId, modeName);
  
  const movie = MOVIE_DATABASE.find(m => m.id === movieId);
  if (!movie) return;

  // Atualizar dados da tela de match
  document.getElementById("match-congrats-names").textContent = `${state.partnerA} e ${state.partnerB} combinaram!`;
  document.getElementById("match-movie-poster").src = movie.poster;
  document.getElementById("match-movie-poster").alt = `Poster do filme ${movie.title}`;
  document.getElementById("match-movie-title").textContent = movie.title;
  document.getElementById("match-movie-year").textContent = movie.year;
  document.getElementById("match-movie-duration").textContent = movie.duration;
  document.getElementById("match-movie-rating").textContent = `⭐ ${movie.rating.toFixed(1)}`;
  document.getElementById("match-movie-synopsis").textContent = movie.synopsis;
  
  // Plataformas
  const platDisplay = document.getElementById("match-movie-platforms");
  platDisplay.innerHTML = movie.platforms.map(p => `<span class="platform-tag">${p}</span>`).join("");
  
  // Ativar overlay
  document.getElementById("match-celebration-screen").classList.add("active");
  
  // Iniciar Confetes
  startConfetti();
}

// RENDERIZAR MATCHES SALVOS
function renderMatchesGrid() {
  const grid = document.getElementById("matches-display-grid");
  const rouletteSection = document.getElementById("roulette-section");
  
  if (state.matches.length === 0) {
    grid.innerHTML = `
      <div class="empty-matches">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 12h8M12 8v8"/>
        </svg>
        <h3>Nenhum match ainda</h3>
        <p>Comecem a jogar para encontrar filmes em comum!</p>
      </div>
    `;
    rouletteSection.style.display = "none";
    return;
  }

  // Exibir a roleta caso tenhamos pelo menos 2 matches
  if (state.matches.length >= 2) {
    rouletteSection.style.display = "flex";
    drawWheel();
  } else {
    rouletteSection.style.display = "none";
  }

  grid.innerHTML = "";
  state.matches.forEach(match => {
    const card = document.createElement("div");
    card.className = "match-history-card glass";
    
    const genresBadges = match.genres.map(g => `<span class="match-history-genre-badge">${g}</span>`).join("");
    
    card.innerHTML = `
      <img class="match-history-img" src="${match.poster}" alt="Poster de ${match.movieTitle}">
      <div class="match-history-details">
        <div>
          <h3 class="match-history-name">${match.movieTitle}</h3>
          <div class="match-history-meta">
            <span>${match.movieYear}</span> • <span>⭐ ${match.rating.toFixed(1)}</span>
          </div>
          <div class="match-history-genres">
            ${genresBadges}
          </div>
        </div>
        <div class="match-history-actions">
          <span class="match-history-type">${match.gameMode}</span>
          <button class="btn-icon-link" onclick="deleteMatch('${match.movieId}')" aria-label="Remover match">
            <!-- Trash SVG Icon -->
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Remover Match
window.deleteMatch = function(movieId) {
  if (confirm("Deseja realmente remover este filme da lista de matches?")) {
    state.matches = state.matches.filter(m => m.movieId !== movieId);
    saveMatchesToStorage();
    renderMatchesGrid();
  }
};

// LocalStorage helpers
function saveMatchesToStorage() {
  localStorage.setItem("cinematch_matches", JSON.stringify(state.matches));
}

function loadMatchesFromStorage() {
  const data = localStorage.getItem("cinematch_matches");
  if (data) {
    try {
      state.matches = JSON.parse(data);
    } catch (e) {
      state.matches = [];
    }
  }
}

// ==================== ANIMAÇÃO DE CONFETES EM CANVAS ====================
let confettiInterval = null;
let confettiParticles = [];
const confettiCanvas = document.getElementById("confetti-canvas");
const confettiCtx = confettiCanvas.getContext("2d");

function resizeConfettiCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeConfettiCanvas);

class ConfettiParticle {
  constructor() {
    this.x = Math.random() * confettiCanvas.width;
    this.y = Math.random() * confettiCanvas.height - confettiCanvas.height;
    this.size = Math.random() * 8 + 6;
    this.color = ["#d946ef", "#8b5cf6", "#10b981", "#0ea5e9", "#fbbf24"][Math.floor(Math.random() * 5)];
    this.speedX = Math.random() * 3 - 1.5;
    this.speedY = Math.random() * 5 + 3;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 4 - 2;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.rotation += this.rotationSpeed;
    
    if (this.y > confettiCanvas.height) {
      this.y = -20;
      this.x = Math.random() * confettiCanvas.width;
    }
  }

  draw() {
    confettiCtx.save();
    confettiCtx.translate(this.x, this.y);
    confettiCtx.rotate((this.rotation * Math.PI) / 180);
    confettiCtx.fillStyle = this.color;
    confettiCtx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    confettiCtx.restore();
  }
}

function startConfetti() {
  resizeConfettiCanvas();
  confettiParticles = Array.from({ length: 120 }, () => new ConfettiParticle());
  
  if (confettiInterval) cancelAnimationFrame(confettiInterval);
  
  function animate() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiParticles.forEach(p => {
      p.update();
      p.draw();
    });
    confettiInterval = requestAnimationFrame(animate);
  }
  
  animate();
  
  // Parar confetes automaticamente depois de 8 segundos para performance
  setTimeout(stopConfetti, 8000);
}

function stopConfetti() {
  if (confettiInterval) {
    cancelAnimationFrame(confettiInterval);
    confettiInterval = null;
  }
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}


// ==================== RODA DA FORTUNA (ROBÚSTA) ====================
let isSpinning = false;
let currentRotation = 0;

function drawWheel() {
  const canvas = document.getElementById("wheel-canvas");
  const ctx = canvas.getContext("2d");
  const radius = canvas.width / 2;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const numSegments = Math.min(state.matches.length, 8); // Máximo de 8 fatias na roda
  const angle = (2 * Math.PI) / numSegments;
  
  // Cores alternadas para a roleta
  const colors = ["#d946ef", "#8b5cf6", "#6366f1", "#4f46e5", "#0284c7", "#0369a1", "#059669", "#047857"];

  for (let i = 0; i < numSegments; i++) {
    const movie = state.matches[i];
    const startAngle = i * angle;
    const endAngle = startAngle + angle;
    
    // Fatia
    ctx.beginPath();
    ctx.moveTo(radius, radius);
    ctx.arc(radius, radius, radius - 6, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(19, 25, 38, 0.4)";
    ctx.stroke();
    
    // Texto do filme na fatia
    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(startAngle + angle / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px 'Plus Jakarta Sans'";
    
    // Truncar o título se for muito longo
    let title = movie.movieTitle;
    if (title.length > 14) title = title.substring(0, 12) + "...";
    
    ctx.fillText(title, radius - 15, 3);
    ctx.restore();
  }
}

function spinRouletteWheel() {
  if (isSpinning || state.matches.length < 2) return;
  
  isSpinning = true;
  const wheel = document.getElementById("spinning-wheel");
  const btn = document.getElementById("spin-wheel-btn");
  const popup = document.getElementById("wheel-result-popup");
  
  btn.disabled = true;
  popup.classList.remove("active");
  
  // Limitar a roleta às primeiras 8 opções renderizadas
  const numSegments = Math.min(state.matches.length, 8);
  const selectedIndex = Math.floor(Math.random() * numSegments);
  
  const angle = 360 / numSegments;
  // O ponteiro aponta para o topo (270 graus).
  // A fatia sorteada deve parar apontando para o topo.
  // Rotacionar de volta: - (index * fatia_angle + meia_fatia_angle) + rotações extras
  const targetRotation = 360 * 6 - (selectedIndex * angle) - (angle / 2) + 270;
  
  // Aplicar rotação com animação CSS
  wheel.style.transform = `rotate(${targetRotation}deg)`;
  
  // Tocar o som/feedback visual quando parar (4 segundos combinando com transition-slow do CSS)
  setTimeout(() => {
    isSpinning = false;
    btn.disabled = false;
    
    const chosenMovie = state.matches[selectedIndex];
    
    // Mostrar PopUp
    popup.textContent = chosenMovie.movieTitle;
    popup.classList.add("active");
    
    // Pequena comemoração com confete
    startConfetti();
    setTimeout(stopConfetti, 2500);
    
    // Perguntar se quer ver o filme
    setTimeout(() => {
      if (confirm(`A roleta escolheu: "${chosenMovie.movieTitle}"! Gostariam de ver os detalhes deste filme agora?`)) {
        triggerMatchCelebration(chosenMovie.movieId, "Sorteio da Roleta");
      }
    }, 500);
  }, 4000);
}

// ==================== LÓGICA DE SINCRONIZAÇÃO E NFC ====================

let ndefReader = null;

function initNFCSync() {
  const nfcReadBtn = document.getElementById("nfc-read-btn");
  const linkReadBtn = document.getElementById("link-read-btn");
  const nfcWriteBtn = document.getElementById("nfc-write-btn");
  const linkShareBtn = document.getElementById("link-share-btn");

  if (nfcReadBtn) nfcReadBtn.addEventListener("click", handleNFCRead);
  if (linkReadBtn) linkReadBtn.addEventListener("click", handleLinkRead);
  if (nfcWriteBtn) nfcWriteBtn.addEventListener("click", handleNFCWrite);
  if (linkShareBtn) linkShareBtn.addEventListener("click", handleLinkShare);

  // Verificar se há dados de sincronização na URL
  checkURLSearchParams();
}

function checkURLSearchParams() {
  const params = new URLSearchParams(window.location.search);
  const likesA = params.get("likesA");
  const nameA = params.get("nameA");

  if (likesA && nameA) {
    try {
      const ids = likesA.split(",");
      state.likesA = new Set(ids);
      state.partnerA = decodeURIComponent(nameA);
      state.syncedPartnerA = true;

      // Preencher o input do parceiro A na interface
      const partnerAInput = document.getElementById("partner-a-input");
      if (partnerAInput) {
        partnerAInput.value = state.partnerA;
        partnerAInput.disabled = true;
        partnerAInput.style.opacity = "0.7";
        partnerAInput.style.border = "1px solid #10b981";
      }

      showSyncMessage(`Conectado! Palpites de "${state.partnerA}" carregados com sucesso. Insira seu nome em "${state.partnerB}" e inicie o jogo!`, "success");
    } catch (err) {
      console.error("Erro ao analisar dados da URL:", err);
      showSyncMessage("Erro ao carregar dados do link de sincronização.", "error");
    }
  }
}

function showSyncMessage(msg, type = "success") {
  const statusEl = document.getElementById("sync-status-msg");
  if (statusEl) {
    statusEl.textContent = msg;
    statusEl.style.display = "block";
    statusEl.style.color = type === "success" ? "#10b981" : (type === "error" ? "#f43f5e" : "#d946ef");
    
    if (type !== "instruction") {
      setTimeout(() => {
        statusEl.style.display = "none";
      }, 10000);
    }
  }

  const transStatusEl = document.getElementById("transition-sync-status");
  if (transStatusEl) {
    transStatusEl.textContent = msg;
    transStatusEl.style.display = "block";
    transStatusEl.style.color = type === "success" ? "#10b981" : (type === "error" ? "#f43f5e" : "#d946ef");
  }
}

async function handleNFCRead() {
  if (!("NDEFReader" in window)) {
    alert("Seu navegador ou celular não suporta Web NFC. Por favor, utilize o botão 'Colar Link de Palpites' como alternativa!");
    return;
  }

  showSyncMessage("Aproxime a parte de trás do seu celular de uma Tag NFC gravada para ler os palpites do parceiro...", "instruction");

  try {
    if (!ndefReader) {
      ndefReader = new NDEFReader();
    }
    await ndefReader.scan();
    console.log("Scanner NFC ativado.");

    ndefReader.addEventListener("readingerror", () => {
      showSyncMessage("Erro de leitura na Tag NFC. Tente aproximar novamente.", "error");
    });

    ndefReader.addEventListener("reading", ({ message }) => {
      for (const record of message.records) {
        if (record.recordType === "text") {
          const textDecoder = new TextDecoder(record.encoding);
          const text = textDecoder.decode(record.data);
          
          if (text.startsWith("cinematch:likes:")) {
            parseNFCContent(text);
            break;
          }
        }
      }
    });

  } catch (error) {
    console.error("NFC Scan failed: ", error);
    showSyncMessage(`Erro ao acessar o leitor NFC: ${error.message || error}. Certifique-se de usar HTTPS ou localhost/127.0.0.1 e conceder as permissões.`, "error");
  }
}

function parseNFCContent(text) {
  try {
    const parts = text.split(";");
    const likesPart = parts[0].replace("cinematch:likes:", "");
    const namePart = parts[1] ? parts[1].replace("name:", "") : "Parceiro A";

    const ids = likesPart ? likesPart.split(",") : [];
    state.likesA = new Set(ids);
    state.partnerA = decodeURIComponent(namePart);
    state.syncedPartnerA = true;

    // Atualizar UI
    const partnerAInput = document.getElementById("partner-a-input");
    if (partnerAInput) {
      partnerAInput.value = state.partnerA;
      partnerAInput.disabled = true;
      partnerAInput.style.opacity = "0.7";
      partnerAInput.style.border = "1px solid #10b981";
    }

    // Atualizar a URL no navegador sem recarregar a página para resiliência a atualizações de tela
    const shareUrl = `${window.location.origin}${window.location.pathname}?likesA=${[...state.likesA].join(',')}&nameA=${encodeURIComponent(state.partnerA)}`;
    window.history.replaceState(null, "", shareUrl);

    showSyncMessage(`✓ Sincronizado via NFC! Palpites de "${state.partnerA}" carregados com sucesso.`, "success");
  } catch (err) {
    showSyncMessage("Erro ao decodificar os dados da Tag NFC.", "error");
  }
}

async function handleNFCWrite() {
  if (!("NDEFReader" in window)) {
    alert("Seu navegador ou celular não suporta gravação via Web NFC. Por favor, utilize o botão 'Copiar Link / WhatsApp'!");
    return;
  }

  const payload = `cinematch:likes:${[...state.likesA].join(',')};name:${encodeURIComponent(state.partnerA)}`;
  showSyncMessage("Aproxime a parte de trás do seu celular de uma Tag NFC gravável para gravar seus palpites...", "instruction");

  try {
    const writer = new NDEFReader();
    await writer.write({
      records: [{ recordType: "text", data: payload }]
    });
    showSyncMessage("✓ Sucesso! Tag NFC gravada. Agora seu parceiro pode aproximar o celular dele desta tag para sincronizar!", "success");
  } catch (error) {
    console.error("NFC Write failed: ", error);
    showSyncMessage(`Falha ao gravar NFC: ${error.message || error}. Certifique-se de estar jogando de forma segura (localhost/HTTPS) e dê permissão de NFC.`, "error");
  }
}

function handleLinkShare() {
  // Gerar o link de sincronização
  const origin = window.location.origin;
  const path = window.location.pathname;
  const likesStr = [...state.likesA].join(',');
  const nameStr = encodeURIComponent(state.partnerA);
  
  const shareUrl = `${origin}${path}?likesA=${likesStr}&nameA=${nameStr}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        showSyncMessage("✓ Link de sincronização copiado! Envie pelo WhatsApp para o seu parceiro.", "success");
      })
      .catch(err => {
        promptForLinkCopy(shareUrl);
      });
  } else {
    promptForLinkCopy(shareUrl);
  }
}

function promptForLinkCopy(url) {
  const copyArea = document.createElement("textarea");
  copyArea.value = url;
  document.body.appendChild(copyArea);
  copyArea.select();
  try {
    document.execCommand("copy");
    showSyncMessage("✓ Link de sincronização copiado!", "success");
  } catch (err) {
    prompt("Copie o link abaixo para enviar ao parceiro:", url);
  }
  document.body.removeChild(copyArea);
}

function handleLinkRead() {
  const pastedLink = prompt("Cole o link de sincronização completo enviado pelo parceiro:");
  if (!pastedLink) return;

  try {
    const urlObj = new URL(pastedLink);
    const params = new URLSearchParams(urlObj.search);
    const likesA = params.get("likesA");
    const nameA = params.get("nameA");

    if (likesA && nameA) {
      const ids = likesA.split(",");
      state.likesA = new Set(ids);
      state.partnerA = decodeURIComponent(nameA);
      state.syncedPartnerA = true;

      const partnerAInput = document.getElementById("partner-a-input");
      if (partnerAInput) {
        partnerAInput.value = state.partnerA;
        partnerAInput.disabled = true;
        partnerAInput.style.opacity = "0.7";
        partnerAInput.style.border = "1px solid #10b981";
      }

      // Atualizar a URL no navegador sem recarregar a página para resiliência a atualizações de tela
      const shareUrl = `${window.location.origin}${window.location.pathname}?likesA=${[...state.likesA].join(',')}&nameA=${encodeURIComponent(state.partnerA)}`;
      window.history.replaceState(null, "", shareUrl);

      showSyncMessage(`✓ Conectado! Palpites de "${state.partnerA}" importados com sucesso.`, "success");
    } else {
      alert("O link colado não parece ser uma URL válida do CineMatch.");
    }
  } catch (err) {
    alert("Erro ao ler o link. Certifique-se de colar a URL exatamente como copiada.");
  }
}

// ==================== LÓGICA DA CARTA DE VINHOS ====================

const WINE_PAIRINGS = {
  popcorn: {
    emoji: "🍿",
    food: "Pipoca & Snacks Salgados",
    wine: "Chardonnay ou Espumante Brut",
    type: "Branco Amanteigado ou Espumante Fresco",
    desc: "A acidez vibrante e as borbulhas do Espumante Brut cortam o sal e a gordura da manteiga da pipoca. Se preferirem um vinho tranquilo, o Chardonnay com passagem por barrica traz notas amanteigadas que combinam perfeitamente com a pipoca de cinema.",
    tip: "Sirva bem gelado (6°C a 10°C) em taças de espumante ou taças normais de vinho branco.",
    color: "#D4AF37"
  },
  pizza: {
    emoji: "🍕",
    food: "Pizza Margherita, Pepperoni ou Calabresa",
    wine: "Chianti (Sangiovese) ou Merlot",
    type: "Tinto de Médio Corpo",
    desc: "O molho de tomate tem acidez alta, e queijo derretido tem bastante gordura. A uva Sangiovese (típica do Chianti) possui a acidez ideal para casar com o tomate e a estrutura perfeita para cortar o queijo sem pesar.",
    tip: "Sirva em taças de vinho tinto a cerca de 16°C (um pouco abaixo da temperatura ambiente).",
    color: "#e11d48"
  },
  burger: {
    emoji: "🍔",
    food: "Hambúrguer, Fritas e Cheddar",
    wine: "Malbec ou Cabernet Sauvignon",
    type: "Tinto Encorpado e Robusto",
    desc: "A carne bovina e o queijo forte exigem um vinho com estrutura. Os taninos marcantes do Malbec ajudam a quebrar as proteínas da carne e limpam a gordura do queijo cheddar a cada gole, preparando a boca para a próxima mordida.",
    tip: "Abra a garrafa de 15 a 20 minutos antes de consumir para que o vinho respire um pouco (17°C a 18°C).",
    color: "#722F37"
  },
  sushi: {
    emoji: "🍣",
    food: "Sushi, Temaki e Sashimi",
    wine: "Sauvignon Blanc ou Vinho Verde",
    type: "Branco Seco, Aromático e Jovem",
    desc: "Peixes crus e frutos do mar têm sabores muito delicados que seriam totalmente abafados por vinhos tintos. Brancos leves e cítricos realçam o frescor do peixe e sua acidez limpa a boca do shoyu salgado.",
    tip: "Sirva gelado (8°C a 10°C). Evite vinhos brancos muito encorpados ou doces.",
    color: "#10b981"
  },
  pasta: {
    emoji: "🍝",
    food: "Massa ao Molho Branco, Fondue ou Risoto",
    wine: "Pinot Noir ou Chardonnay",
    type: "Tinto Leve / Branco Estruturado",
    desc: "Pratos cremosos e à base de queijos brancos ou creme de leite pedem vinhos que acompanhem essa textura. O Chardonnay traz o peso ideal para o molho branco. Se preferirem tinto, a leveza e a alta acidez do Pinot Noir harmonizam sem brigar com o prato.",
    tip: "Se optar pelo Pinot Noir, sirva-o ligeiramente resfriado (14°C a 15°C) para ressaltar as notas de frutas vermelhas.",
    color: "#c084fc"
  },
  chocolate: {
    emoji: "🍫",
    food: "Chocolate Meio Amargo, Brownies ou Trufas",
    wine: "Vinho do Porto Tawny ou Ruby",
    type: "Tinto Licoroso / Fortificado Doce",
    desc: "O chocolate comum costuma amargar vinhos secos convencionais devido ao açúcar. O Vinho do Porto é fortificado e doce, possuindo teor alcoólico e dulçor na medida exata para abraçar a intensidade do cacau e fechar a noite em grande estilo.",
    tip: "Sirva em pequenas doses (cálices) acompanhando a sobremesa no final do filme.",
    color: "#be185d"
  }
};

function initWinesScreen() {
  const selectButtons = document.getElementById("food-select-buttons");
  if (!selectButtons) return;

  const buttons = selectButtons.querySelectorAll("button");
  
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const foodKey = btn.getAttribute("data-food");
      renderWinePairing(foodKey);
    });
  });

  // Renderizar o primeiro emparelhamento (Pipoca) por padrão
  renderWinePairing("popcorn");
}

function renderWinePairing(key) {
  const card = document.getElementById("wine-result-card");
  if (!card) return;

  const data = WINE_PAIRINGS[key];
  if (!data) return;

  // Efeito de fade suave na transição
  card.style.opacity = "0";
  card.style.transform = "scale(0.96)";
  card.style.transition = "opacity 0.2s ease, transform 0.2s ease";

  setTimeout(() => {
    card.innerHTML = `
      <div style="font-size: 3rem; margin-bottom: 1rem; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));">${data.emoji}</div>
      <h4 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 0.25rem;">Combinação para:</h4>
      <p style="font-size: 1rem; color: var(--text-muted); font-weight: 600; margin-bottom: 1rem; text-align: center;">${data.food}</p>
      
      <div style="width: 100%; border-top: 1px dashed rgba(255,255,255,0.08); margin: 0.75rem 0; padding-top: 1rem; text-align: center;">
        <span style="font-size: 0.7rem; letter-spacing: 1px; text-transform: uppercase; color: ${data.color}; font-weight: 700;">Recomendação</span>
        <h3 style="font-size: 1.4rem; font-family: var(--font-serif); font-weight: 700; margin-top: 0.25rem; color: ${data.color}; text-shadow: 0 0 10px rgba(0,0,0,0.5);">${data.wine}</h3>
        <p style="font-size: 0.8rem; color: var(--text-muted); font-style: italic; margin-bottom: 1rem;">${data.type}</p>
      </div>
      
      <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; text-align: center; margin-bottom: 1.25rem;">
        ${data.desc}
      </p>
      
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 0.75rem 1rem; border-radius: 12px; width: 100%; text-align: left;">
        <p style="font-size: 0.75rem; color: var(--text-main); line-height: 1.4;">
          💡 <strong>Dica de Serviço:</strong> ${data.tip}
        </p>
      </div>
    `;
    card.style.opacity = "1";
    card.style.transform = "scale(1)";
  }, 150);
}

// ==================== CONTADOR DE ANIVERSÁRIO ====================

function updateAnniversaryCounter() {
  const counterEl = document.getElementById("time-together-counter");
  if (!counterEl) return;

  // IMPORTANTE: Defina abaixo o ano correto em que vocês se conheceram (ex: 2026, 2025, 2024...)
  const startYear = 2026; 
  const startDate = new Date(startYear, 4, 9); // 9 de Maio (Mês 4 em JS, já que Janeiro é 0)
  const now = new Date();

  let years = now.getFullYear() - startDate.getFullYear();
  let months = now.getMonth() - startDate.getMonth();
  let days = now.getDate() - startDate.getDate();

  // Ajustar se o dia atual for menor que o dia de início do namoro
  if (days < 0) {
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
    // Removido months-- para adequar à contagem humana do casal (quase 3 meses)
  }

  // Ajustar se o mês atual for menor que o mês de início do namoro
  if (months < 0) {
    months += 12;
    years--;
  }

  // Formatar o texto de forma humanizada e elegante
  let timeString = [];
  if (years > 0) {
    timeString.push(`${years} ${years === 1 ? 'ano' : 'anos'}`);
  }
  if (months > 0) {
    timeString.push(`${months} ${months === 1 ? 'mês' : 'meses'}`);
  }
  if (days > 0 || timeString.length === 0) {
    timeString.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);
  }

  let formattedTime = "";
  if (timeString.length === 3) {
    formattedTime = `${timeString[0]}, ${timeString[1]} e ${timeString[2]}`;
  } else if (timeString.length === 2) {
    formattedTime = `${timeString[0]} e ${timeString[1]}`;
  } else {
    formattedTime = timeString[0];
  }

  counterEl.textContent = `Nos conhecemos há ${formattedTime} • Desde 09/05/${startYear}`;

  // Atualizar o contador no Splash Screen
  const splashCounterEl = document.getElementById("splash-time-counter");
  if (splashCounterEl) {
    splashCounterEl.textContent = formattedTime;
  }

  // Atualizar os nomes no Splash Screen com dados do localStorage ou padrões
  const partnerAName = localStorage.getItem("partnerA") || "Dercio";
  const partnerBName = localStorage.getItem("partnerB") || "Parceira";
  const splashCoupleNames = document.getElementById("splash-couple-names");
  if (splashCoupleNames) {
    splashCoupleNames.textContent = `${partnerAName} & ${partnerBName}`;
  }
}

// Inicializar e configurar a tela de Splash Romântico
function initSplashScreen() {
  const btn = document.getElementById("btn-enter-app");
  const splash = document.getElementById("romantic-splash");
  if (!btn || !splash) return;

  btn.addEventListener("click", () => {
    // Transição suave de fade-out
    splash.classList.add("fade-out");
  });
}
