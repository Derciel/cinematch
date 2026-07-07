// CineMatch - Lógica Interativa do Sistema

// Atribuir base de dados do escopo do window (carregado via Astro build/fallback)
const MOVIE_DATABASE = window.MOVIE_DATABASE || [];

// Normalização do ecossistema de streaming do casal
if (MOVIE_DATABASE && MOVIE_DATABASE.length > 0) {
  MOVIE_DATABASE.forEach(movie => {
    const customPlatforms = [];
    movie.platforms.forEach(p => {
      if (!customPlatforms.includes(p)) {
        customPlatforms.push(p);
      }
    });
    if (!customPlatforms.includes("On-Demand")) {
      customPlatforms.push("On-Demand");
    }
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
  diary: [],        // Diário de Encontros salvos no localStorage
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
  loadDiaryFromStorage();
  initSetupUI();
  initNavigation();
  initButtons();
  initKeyboardShortcuts();
  initNFCSync();
  initWinesScreen();
  initDiaryUI();
  updateAnniversaryCounter();
  initSplashScreen();
  initMusicToggle();
  
  // Atualizar o contador com precisão de segundos a cada 1 segundo
  setInterval(updateAnniversaryCounter, 1000);
});

// ==================== NAV E TELAS ====================
function initNavigation() {
  const links = document.querySelectorAll(".nav-link");
  links.forEach(link => {
    link.addEventListener("click", (e) => {
      const targetScreen = link.getAttribute("data-screen");
      
      // Se tentar navegar sem ter configurado o jogo, força voltar ao setup (exceto se for para a aba de ideias, vinhos ou diário)
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

  const logo = document.getElementById("header-logo");
  if (logo) {
    logo.addEventListener("click", () => {
      switchScreen("setup-screen");
      updateActiveNavLink("");
    });
  }
}

function switchScreen(screenId) {
  const screens = document.querySelectorAll(".screen");
  screens.forEach(s => s.classList.remove("active"));
  
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add("active");
    
    // Lógicas específicas ao carregar certas de telas
    if (screenId === "history-screen") {
      renderMatchesGrid();
    } else if (screenId === "diary-screen") {
      renderDiaryTimeline();
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
  const startBtn = document.getElementById("start-match-btn");
  if (startBtn) {
    startBtn.addEventListener("click", startCineMatch);
  }
}

// Parser auxiliar de duração ("2h 15m" -> 135)
function parseDurationToMinutes(durationStr) {
  if (!durationStr) return 120;
  const match = durationStr.match(/(?:(\d+)h)?\s*(?:(\d+)m)?/);
  if (!match) return 120;
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  return hours * 60 + minutes;
}

function startCineMatch() {
  const nameA = document.getElementById("partner-a-input").value.trim();
  const nameB = document.getElementById("partner-b-input").value.trim();
  
  state.partnerA = nameA || "Derci";
  state.partnerB = nameB || "Isa";
  
  // Guardar nomes locais
  localStorage.setItem("partnerA", state.partnerA);
  localStorage.setItem("partnerB", state.partnerB);

  // Carregar filtros selecionados
  const durationFilter = document.getElementById("filter-duration")?.value || "all";
  const eraFilter = document.getElementById("filter-era")?.value || "all";

  // Filtrar filmes baseado nos gêneros selecionados, duração e época
  state.moviesToSwipe = MOVIE_DATABASE.filter(movie => {
    // 1. Gênero
    const genreMatch = movie.genres.some(genre => state.selectedGenres.includes(genre));
    if (!genreMatch) return false;

    // 2. Duração
    if (durationFilter === "short") {
      const minutes = parseDurationToMinutes(movie.duration);
      if (minutes >= 110) return false; // menos de 1h50m (110 mins)
    } else if (durationFilter === "long") {
      const minutes = parseDurationToMinutes(movie.duration);
      if (minutes < 110) return false; // 1h50m ou mais
    }

    // 3. Época
    if (eraFilter === "modern") {
      if (movie.year < 2015) return false;
    } else if (eraFilter === "classic") {
      if (movie.year >= 2015) return false;
    }

    return true;
  });
  
  // Embaralhar aleatoriamente os filmes selecionados para dinâmica de jogo
  state.moviesToSwipe.sort(() => Math.random() - 0.5);
  
  if (state.moviesToSwipe.length === 0) {
    alert("Nenhum filme disponível para os filtros selecionados. Altere a duração ou época e tente novamente!");
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
  if (!container) return;
  
  // Limpar cartas anteriores
  const previousCards = container.querySelectorAll(".movie-card");
  previousCards.forEach(c => c.remove());

  const transitionOverlay = container.querySelector(".round-transition-overlay");
  
  // Inserir cards de trás para a frente
  const listToRender = [...state.moviesToSwipe];
  
  if (listToRender.length === 0) {
    renderEmptyDeck(container);
    return;
  }

  listToRender.reverse().forEach((movie, index) => {
    const card = document.createElement("div");
    card.className = "movie-card glass";
    card.setAttribute("data-id", movie.id);
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
  let actionBtnText = "Ir para Matches";
  let actionFn = () => switchScreen("history-screen");

  if (state.gameMode === "turn" && state.currentTurn === "A") {
    actionBtnText = `Passar para ${state.partnerB}`;
    actionFn = () => triggerTurnTransition();
  } else if (state.gameMode === "turn" && state.currentTurn === "B") {
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
  
  const stampLike = card.querySelector(".card-stamp-like");
  const stampDislike = card.querySelector(".card-stamp-dislike");
  const stampSuper = card.querySelector(".card-stamp-super");

  const dragStart = (e) => {
    if (e.target.closest("button") || e.target.closest("a")) return;
    
    isDragging = true;
    card.classList.add("swiping");
    
    startX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
    startY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY;
  };

  const dragMove = (e) => {
    if (!isDragging) return;
    
    currentX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
    currentY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY;
    
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;
    
    const rotation = deltaX / 15;
    
    card.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) rotate(${rotation}deg)`;
    
    if (deltaX > 20) {
      stampLike.style.opacity = Math.min(deltaX / SWIPE_THRESHOLD, 0.9);
      stampDislike.style.opacity = 0;
      stampSuper.style.opacity = 0;
    } else if (deltaX < -20) {
      stampDislike.style.opacity = Math.min(Math.abs(deltaX) / SWIPE_THRESHOLD, 0.9);
      stampLike.style.opacity = 0;
      stampSuper.style.opacity = 0;
    } else if (deltaY < -20 && Math.abs(deltaX) < 40) {
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
    
    if (deltaX > SWIPE_THRESHOLD) {
      swipeCard(card, "right", side);
    } else if (deltaX < -SWIPE_THRESHOLD) {
      swipeCard(card, "left", side);
    } else if (deltaY < -SWIPE_SUPER_THRESHOLD && Math.abs(deltaX) < SWIPE_THRESHOLD / 2) {
      swipeCard(card, "up", side);
    } else {
      card.style.transform = "";
      stampLike.style.opacity = 0;
      stampDislike.style.opacity = 0;
      stampSuper.style.opacity = 0;
    }
    
    startX = startY = currentX = currentY = 0;
  };

  card.addEventListener("mousedown", dragStart);
  window.addEventListener("mousemove", dragMove);
  window.addEventListener("mouseup", dragEnd);
  
  card.addEventListener("touchstart", dragStart, { passive: true });
  card.addEventListener("touchmove", dragMove, { passive: true });
  card.addEventListener("touchend", dragEnd, { passive: true });
}

function swipeCard(card, direction, side) {
  card.classList.add("dismissed");
  const movieId = card.getAttribute("data-id");
  
  let xMove = 0;
  let yMove = 0;
  let rotate = 0;
  
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
  
  card.style.transform = `translate3d(${xMove}px, ${yMove}px, 0) rotate(${rotate}deg)`;
  card.style.opacity = "0";

  setTimeout(() => {
    card.remove();
    registerVote(movieId, direction, side);
  }, 400);
}

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

function checkDeckProgress(side) {
  if (side === "A") {
    const deck = document.getElementById("cards-deck");
    const activeCards = deck ? deck.querySelectorAll(".movie-card") : [];
    if (activeCards.length === 0) {
      triggerTurnTransition();
    }
  } else if (side === "B") {
    const deck = document.getElementById("cards-deck");
    const activeCards = deck ? deck.querySelectorAll(".movie-card") : [];
    if (activeCards.length === 0) {
      finishTurnBasedMatch();
    }
  } else if (side.startsWith("split")) {
    const deckA = document.getElementById("cards-deck-a");
    const deckB = document.getElementById("cards-deck-b");
    const cardsA = deckA ? deckA.querySelectorAll(".movie-card").length : 0;
    const cardsB = deckB ? deckB.querySelectorAll(".movie-card").length : 0;
    
    if (cardsA === 0 && cardsB === 0) {
      setTimeout(() => {
        switchScreen("history-screen");
      }, 500);
    }
  }
}

function triggerTurnTransition() {
  state.currentTurn = "B";
  
  const turnName = document.getElementById("turn-indicator-name");
  if (turnName) {
    turnName.textContent = `Turno de ${state.partnerB}`;
    turnName.className = "player-turn-indicator secondary";
    turnName.style.color = "var(--secondary)";
    turnName.style.boxShadow = "var(--shadow-neon-secondary)";
    turnName.style.border = "1px solid rgba(139, 92, 246, 0.2)";
    turnName.style.background = "rgba(139, 92, 246, 0.08)";
  }
  
  const instrText = document.getElementById("transition-instruction-text");
  if (instrText) {
    instrText.textContent = `Passe o dispositivo para ${state.partnerB}. Os palpites de ${state.partnerA} foram ocultados por segurança!`;
  }
  
  const overlay = document.getElementById("round-transition-screen");
  if (overlay) overlay.classList.add("active");
}

// ==================== INTERATIVE BUTTONS CONTROLS ====================
function initButtons() {
  const dislikeBtn = document.getElementById("action-dislike");
  if (dislikeBtn) dislikeBtn.addEventListener("click", () => triggerButtonSwipe("left"));
  
  const likeBtn = document.getElementById("action-like");
  if (likeBtn) likeBtn.addEventListener("click", () => triggerButtonSwipe("right"));
  
  const superBtn = document.getElementById("action-superlike");
  if (superBtn) superBtn.addEventListener("click", () => triggerButtonSwipe("up"));

  const readyBtn = document.getElementById("next-turn-ready-btn");
  if (readyBtn) {
    readyBtn.addEventListener("click", () => {
      const transScreen = document.getElementById("round-transition-screen");
      if (transScreen) transScreen.classList.remove("active");
      renderDeck("cards-deck", "B");
    });
  }

  const sDislikeA = document.getElementById("action-split-dislike-a");
  if (sDislikeA) sDislikeA.addEventListener("click", () => triggerSplitButtonSwipe("left", "split-A"));
  
  const sLikeA = document.getElementById("action-split-like-a");
  if (sLikeA) sLikeA.addEventListener("click", () => triggerSplitButtonSwipe("right", "split-A"));
  
  const sDislikeB = document.getElementById("action-split-dislike-b");
  if (sDislikeB) sDislikeB.addEventListener("click", () => triggerSplitButtonSwipe("left", "split-B"));
  
  const sLikeB = document.getElementById("action-split-like-b");
  if (sLikeB) sLikeB.addEventListener("click", () => triggerSplitButtonSwipe("right", "split-B"));

  const keepSwiping = document.getElementById("match-keep-swiping-btn");
  if (keepSwiping) {
    keepSwiping.addEventListener("click", () => {
      const celScreen = document.getElementById("match-celebration-screen");
      if (celScreen) celScreen.classList.remove("active");
      stopConfetti();
    });
  }

  const watchNow = document.getElementById("match-watch-now-btn");
  if (watchNow) {
    watchNow.addEventListener("click", () => {
      const movieTitle = document.getElementById("match-movie-title").textContent;
      window.open(`https://www.google.com/search?q=onde+assistir+filme+${encodeURIComponent(movieTitle)}`, "_blank");
    });
  }

  const spinBtn = document.getElementById("spin-wheel-btn");
  if (spinBtn) spinBtn.addEventListener("click", spinRouletteWheel);
}

function triggerButtonSwipe(direction) {
  const deck = document.getElementById("cards-deck");
  if (!deck) return;
  const cards = Array.from(deck.querySelectorAll(".movie-card"));
  
  if (cards.length > 0) {
    const topCard = cards[cards.length - 1];
    const side = state.currentTurn;
    
    const stampName = direction === "right" ? "like" : (direction === "left" ? "dislike" : "super");
    const stamp = topCard.querySelector(`.card-stamp-${stampName}`);
    if (stamp) stamp.style.opacity = "0.9";
    
    swipeCard(topCard, direction, side);
    
    const isLike = direction === "right" || direction === "up";
    if (isLike) {
      setTimeout(() => {
        if (state.currentTurn !== side) return;
        
        if (side === "A") {
          state.currentTurn = "B";
          const indicator = document.getElementById("turn-indicator-name");
          if (indicator) {
            indicator.textContent = `Turno de ${state.partnerB}`;
            indicator.className = "player-turn-indicator secondary";
            indicator.style.color = "var(--secondary)";
            indicator.style.boxShadow = "var(--shadow-neon-secondary)";
            indicator.style.border = "1px solid rgba(139, 92, 246, 0.2)";
            indicator.style.background = "rgba(139, 92, 246, 0.08)";
          }
          renderDeck("cards-deck", "B");
        } else if (side === "B") {
          finishTurnBasedMatch();
        }
      }, 420);
    }
  }
}

function triggerSplitButtonSwipe(direction, side) {
  const containerId = side === "split-A" ? "cards-deck-a" : "cards-deck-b";
  const deck = document.getElementById(containerId);
  if (!deck) return;
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
    const splitPlayEl = document.getElementById("split-screen-play");
    const playEl = document.getElementById("play-screen");
    const matchEl = document.getElementById("match-celebration-screen");
    
    const splitPlayVisible = splitPlayEl && splitPlayEl.classList.contains("active");
    const playVisible = playEl && playEl.classList.contains("active");
    const matchCelebrationActive = matchEl && matchEl.classList.contains("active");
    
    if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;
    
    if (matchCelebrationActive && (e.key === "Escape" || e.key === " ")) {
      if (matchEl) matchEl.classList.remove("active");
      stopConfetti();
      return;
    }

    if (splitPlayVisible) {
      switch (e.key.toLowerCase()) {
        case "q":
          triggerSplitButtonSwipe("left", "split-A");
          break;
        case "w":
          triggerSplitButtonSwipe("right", "split-A");
          break;
        case "o":
          triggerSplitButtonSwipe("left", "split-B");
          break;
        case "p":
          triggerSplitButtonSwipe("right", "split-B");
          break;
      }
    } else if (playVisible) {
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
function checkInstantSplitMatch(movieId) {
  if (state.likesA.has(movieId) && state.likesB.has(movieId)) {
    triggerMatchCelebration(movieId, "Tela Dividida");
  }
}

function finishTurnBasedMatch() {
  const commonLikes = [...state.likesA].filter(id => state.likesB.has(id));
  
  if (commonLikes.length > 0) {
    commonLikes.forEach(id => {
      saveMatch(id, "Turnos");
    });
    triggerMatchCelebration(commonLikes[0], "Modo Turnos");
  } else {
    alert("Infelizmente não tivemos nenhum match de filmes em comum nessa rodada. Que tal tentar novamente ativando outros gêneros ou modificando a duração?");
    switchScreen("setup-screen");
  }
}

function saveMatch(movieId, modeName) {
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
  saveMatch(movieId, modeName);
  
  const movie = MOVIE_DATABASE.find(m => m.id === movieId);
  if (!movie) return;

  const congrats = document.getElementById("match-congrats-names");
  if (congrats) congrats.textContent = `${state.partnerA} e ${state.partnerB} combinaram!`;
  
  const poster = document.getElementById("match-movie-poster");
  if (poster) {
    poster.src = movie.poster;
    poster.alt = `Poster do filme ${movie.title}`;
  }
  
  const title = document.getElementById("match-movie-title");
  if (title) title.textContent = movie.title;
  
  const mYear = document.getElementById("match-movie-year");
  if (mYear) mYear.textContent = movie.year;
  
  const mDur = document.getElementById("match-movie-duration");
  if (mDur) mDur.textContent = movie.duration;
  
  const mRat = document.getElementById("match-movie-rating");
  if (mRat) mRat.textContent = `⭐ ${movie.rating.toFixed(1)}`;
  
  const syn = document.getElementById("match-movie-synopsis");
  if (syn) syn.textContent = movie.synopsis;
  
  const platDisplay = document.getElementById("match-movie-platforms");
  if (platDisplay) {
    platDisplay.innerHTML = movie.platforms.map(p => `<span class="platform-tag">${p}</span>`).join("");
  }
  
  const celScreen = document.getElementById("match-celebration-screen");
  if (celScreen) celScreen.classList.add("active");
  
  startConfetti();
}

function renderMatchesGrid() {
  const grid = document.getElementById("matches-display-grid");
  if (!grid) return;
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
    if (rouletteSection) rouletteSection.style.display = "none";
    return;
  }

  if (state.matches.length >= 2) {
    if (rouletteSection) {
      rouletteSection.style.display = "flex";
      drawWheel();
    }
  } else {
    if (rouletteSection) rouletteSection.style.display = "none";
  }

  grid.innerHTML = "";
  state.matches.forEach(match => {
    const card = document.createElement("div");
    card.className = "match-history-card glass";
    
    const genresBadges = match.genres.map(g => `<span class="match-history-genre-badge">${g}</span>`).join("");
    
    // Verificar se o match já está no diário
    const isMatchedInDiary = state.diary.some(d => d.movieId === match.movieId);
    const diaryButtonHTML = isMatchedInDiary 
      ? `<span style="font-size: 0.72rem; color: #10b981; font-weight: 700; display: flex; align-items: center; gap: 0.2rem;">✓ Assistido ❤️</span>`
      : `<button class="btn-secondary btn-diary" onclick="openDiaryModal('${match.movieId}')" style="padding: 0.35rem 0.65rem; font-size: 0.72rem; display: flex; align-items: center; gap: 0.25rem; margin-top: 0.5rem; background:rgba(217, 70, 239, 0.08); border-color: rgba(217, 70, 239, 0.2); font-weight:700;">📝 Registrar Encontro</button>`;

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
        <div class="match-history-actions" style="display:flex; flex-direction:column; align-items: flex-start; justify-content: flex-end; gap:0.25rem;">
          <div style="display:flex; width: 100%; justify-content: space-between; align-items: center;">
            <span class="match-history-type" style="font-size:0.65rem;">${match.gameMode}</span>
            <button class="btn-icon-link" onclick="deleteMatch('${match.movieId}')" aria-label="Remover match">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
              </svg>
            </button>
          </div>
          ${diaryButtonHTML}
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Remover Match
window.deleteMatch = function(movieId) {
  if (confirm("Remover este match do histórico?")) {
    state.matches = state.matches.filter(m => m.movieId !== movieId);
    saveMatchesToStorage();
    renderMatchesGrid();
  }
};

function saveMatchesToStorage() {
  localStorage.setItem("cinematch_matches", JSON.stringify(state.matches));
}

function loadMatchesFromStorage() {
  const data = localStorage.getItem("cinematch_matches");
  if (data) {
    try {
      state.matches = JSON.parse(data);
    } catch (err) {
      state.matches = [];
    }
  }
}

// ==================== LÓGICA DO DIÁRIO ("NOSSAS MEMÓRIAS") ====================
function loadDiaryFromStorage() {
  const data = localStorage.getItem("cinematch_diary");
  if (data) {
    try {
      state.diary = JSON.parse(data);
    } catch (err) {
      state.diary = [];
    }
  }
}

function saveDiaryToStorage() {
  localStorage.setItem("cinematch_diary", JSON.stringify(state.diary));
}

function initDiaryUI() {
  const closeBtn = document.getElementById("btn-close-diary-modal");
  if (closeBtn) closeBtn.addEventListener("click", closeDiaryModal);
  
  const form = document.getElementById("diary-form");
  if (form) form.addEventListener("submit", saveDiaryEntry);

  // Setup click listeners para os corações de avaliação
  const hearts = document.querySelectorAll("#heart-rating-container .heart-star");
  hearts.forEach(heart => {
    heart.addEventListener("click", () => {
      const ratingValue = parseInt(heart.getAttribute("data-rating"));
      document.getElementById("diary-rating-value").value = ratingValue;
      
      // Destacar corações selecionados
      hearts.forEach(h => {
        const val = parseInt(h.getAttribute("data-rating"));
        if (val <= ratingValue) {
          h.classList.add("selected");
        } else {
          h.classList.remove("selected");
        }
      });
    });
  });
}

window.openDiaryModal = function(movieId) {
  const movie = MOVIE_DATABASE.find(m => m.id === movieId) || state.matches.find(m => m.movieId === movieId);
  if (!movie) return;

  const title = movie.title || movie.movieTitle;

  document.getElementById("diary-movie-id").value = movieId;
  document.getElementById("diary-modal-movie-title").textContent = `Filme: ${title}`;
  
  // Data padrão: hoje
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("diary-date").value = today;
  
  // Resetar avaliação para 5 corações
  document.getElementById("diary-rating-value").value = "5";
  const hearts = document.querySelectorAll("#heart-rating-container .heart-star");
  hearts.forEach(h => h.classList.add("selected"));

  // Resetar notas
  document.getElementById("diary-notes").value = "";

  // Abrir modal
  const modal = document.getElementById("diary-modal");
  if (modal) modal.classList.add("active");
};

function closeDiaryModal() {
  const modal = document.getElementById("diary-modal");
  if (modal) modal.classList.remove("active");
}

function saveDiaryEntry(e) {
  e.preventDefault();

  const movieId = document.getElementById("diary-movie-id").value;
  const dateVal = document.getElementById("diary-date").value;
  const ratingVal = parseInt(document.getElementById("diary-rating-value").value);
  const notesVal = document.getElementById("diary-notes").value.trim();

  const movie = MOVIE_DATABASE.find(m => m.id === movieId) || state.matches.find(m => m.movieId === movieId);
  if (!movie) return;

  const title = movie.title || movie.movieTitle;
  const poster = movie.poster;

  // Criar ou atualizar
  const existingIndex = state.diary.findIndex(d => d.movieId === movieId);
  
  // Format data
  const formattedDate = dateVal.split("-").reverse().join("/");

  const diaryEntry = {
    movieId: movieId,
    movieTitle: title,
    poster: poster,
    watchDate: formattedDate,
    watchDateRaw: dateVal,
    rating: ratingVal,
    notes: notesVal
  };

  if (existingIndex > -1) {
    state.diary[existingIndex] = diaryEntry;
  } else {
    state.diary.unshift(diaryEntry);
  }

  // Ordenar timeline por data (mais recente no topo)
  state.diary.sort((a, b) => new Date(b.watchDateRaw) - new Date(a.watchDateRaw));

  saveDiaryToStorage();
  closeDiaryModal();
  renderDiaryTimeline();
  renderMatchesGrid();
}

function renderDiaryTimeline() {
  const timeline = document.getElementById("diary-timeline");
  if (!timeline) return;

  if (state.diary.length === 0) {
    timeline.innerHTML = `
      <div class="diary-empty-state">
        <p>Vocês ainda não registraram encontros na linha do tempo. Marquem um filme como assistido nos Matches! 📝❤️</p>
      </div>
    `;
    return;
  }

  timeline.innerHTML = "";
  state.diary.forEach(entry => {
    const item = document.createElement("div");
    item.className = "diary-item";

    const ratingHearts = "❤️".repeat(entry.rating);

    item.innerHTML = `
      <div class="diary-item-node"></div>
      <div class="diary-card glass">
        <img class="diary-card-img" src="${entry.poster}" alt="Poster de ${entry.movieTitle}">
        <div class="diary-card-body">
          <div>
            <div class="diary-card-header">
              <h3 class="diary-card-title">${entry.movieTitle}</h3>
              <span class="diary-card-date">${entry.watchDate}</span>
            </div>
            <div class="diary-card-rating">
              ${ratingHearts}
            </div>
            <p class="diary-card-notes">
              "${entry.notes}"
            </p>
          </div>
          <div style="display:flex; justify-content: flex-end; margin-top:0.75rem;">
            <button class="btn-icon-link" onclick="deleteDiaryEntry('${entry.movieId}')" style="font-size:0.75rem; display:flex; align-items:center; gap:0.25rem;" aria-label="Remover do diário">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
              </svg>
              Excluir Registro
            </button>
          </div>
        </div>
      </div>
    `;
    timeline.appendChild(item);
  });
}

window.deleteDiaryEntry = function(movieId) {
  if (confirm("Remover este registro do diário de encontros?")) {
    state.diary = state.diary.filter(d => d.movieId !== movieId);
    saveDiaryToStorage();
    renderDiaryTimeline();
    renderMatchesGrid();
  }
};

// ==================== CONFETES E ANIMAÇÕES ====================
let confettiCanvas = null;
let confettiCtx = null;
let confettiInterval = null;
let confettiParticles = [];

function resizeConfettiCanvas() {
  confettiCanvas = document.getElementById("confetti-canvas");
  if (!confettiCanvas) return;
  confettiCtx = confettiCanvas.getContext("2d");
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
  if (!confettiCanvas) return;
  confettiCtx = confettiCanvas.getContext("2d");
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
  setTimeout(stopConfetti, 8000);
}

function stopConfetti() {
  if (confettiInterval) {
    cancelAnimationFrame(confettiInterval);
    confettiInterval = null;
  }
  if (confettiCanvas) {
    confettiCtx = confettiCanvas.getContext("2d");
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

// ==================== RODA DA FORTUNA ====================
let isSpinning = false;

function drawWheel() {
  const canvas = document.getElementById("wheel-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const radius = canvas.width / 2;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const numSegments = Math.min(state.matches.length, 8);
  const angle = (2 * Math.PI) / numSegments;
  const colors = ["#d946ef", "#8b5cf6", "#6366f1", "#4f46e5", "#0284c7", "#0369a1", "#059669", "#047857"];

  for (let i = 0; i < numSegments; i++) {
    const movie = state.matches[i];
    const startAngle = i * angle;
    const endAngle = startAngle + angle;
    
    ctx.beginPath();
    ctx.moveTo(radius, radius);
    ctx.arc(radius, radius, radius - 6, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(19, 25, 38, 0.4)";
    ctx.stroke();
    
    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(startAngle + angle / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px 'Plus Jakarta Sans'";
    
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
  
  if (!wheel || !btn || !popup) return;

  btn.disabled = true;
  popup.classList.remove("active");
  
  const numSegments = Math.min(state.matches.length, 8);
  const selectedIndex = Math.floor(Math.random() * numSegments);
  const angle = 360 / numSegments;
  const targetRotation = 360 * 6 - (selectedIndex * angle) - (angle / 2) + 270;
  
  wheel.style.transform = `rotate(${targetRotation}deg)`;
  
  setTimeout(() => {
    isSpinning = false;
    btn.disabled = false;
    
    const chosenMovie = state.matches[selectedIndex];
    
    popup.textContent = chosenMovie.movieTitle;
    popup.classList.add("active");
    
    startConfetti();
    setTimeout(stopConfetti, 2500);
    
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

    const partnerAInput = document.getElementById("partner-a-input");
    if (partnerAInput) {
      partnerAInput.value = state.partnerA;
      partnerAInput.disabled = true;
      partnerAInput.style.opacity = "0.7";
      partnerAInput.style.border = "1px solid #10b981";
    }

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

  renderWinePairing("popcorn");
}

function renderWinePairing(key) {
  const card = document.getElementById("wine-result-card");
  if (!card) return;

  const data = WINE_PAIRINGS[key];
  if (!data) return;

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
      
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 0.75rem 1rem; border-radius: 12px; width: 100%; text-align: left; margin-bottom: 1.25rem;">
        <p style="font-size: 0.75rem; color: var(--text-main); line-height: 1.4;">
          💡 <strong>Dica de Serviço:</strong> ${data.tip}
        </p>
      </div>

      <!-- Atalho de Delivery (Botões iFood / Rappi) -->
      <div class="delivery-shortcuts" style="display: flex; gap: 0.75rem; justify-content: center; width: 100%; margin-top: 0.5rem; flex-wrap: wrap;">
        <a href="https://www.ifood.com.br/busca?q=${encodeURIComponent(data.food)}" target="_blank" class="btn-delivery btn-ifood" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: #ea1d2c; color: #fff; padding: 0.65rem 1.25rem; border-radius: 12px; font-size: 0.85rem; font-weight: 700; text-decoration: none; transition: transform 0.2s ease, box-shadow 0.2s ease; flex: 1; min-width: 140px; box-shadow: 0 4px 12px rgba(234, 29, 44, 0.25);">
          <span style="font-size: 1.1rem;">🛵</span> Pedir no iFood
        </a>
        <a href="https://www.rappi.com.br/busca?q=${encodeURIComponent(data.food)}" target="_blank" class="btn-delivery btn-rappi" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: #ff5a5f; color: #fff; padding: 0.65rem 1.25rem; border-radius: 12px; font-size: 0.85rem; font-weight: 700; text-decoration: none; transition: transform 0.2s ease, box-shadow 0.2s ease; flex: 1; min-width: 140px; box-shadow: 0 4px 12px rgba(255, 90, 95, 0.25);">
          <span style="font-size: 1.1rem;">🍔</span> Pedir no Rappi
        </a>
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

  const startYear = 2026; 
  const startDate = new Date(startYear, 3, 9, 0, 0, 0); // 9 de Abril de 2026 às 00:00:00
  const now = new Date();

  // Calcular diferença bruta em anos, meses e dias
  let years = now.getFullYear() - startDate.getFullYear();
  let months = now.getMonth() - startDate.getMonth();
  let days = now.getDate() - startDate.getDate();
  let hours = now.getHours() - startDate.getHours();
  let minutes = now.getMinutes() - startDate.getMinutes();
  let seconds = now.getSeconds() - startDate.getSeconds();

  // Ajustes de tempo
  if (seconds < 0) {
    seconds += 60;
    minutes--;
  }
  if (minutes < 0) {
    minutes += 60;
    hours--;
  }
  if (hours < 0) {
    hours += 24;
    days--;
  }
  if (days < 0) {
    months--;
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    months += 12;
    years--;
  }

  // 1. Versão compacta para o banner da página de Setup
  let compactParts = [];
  if (years > 0) compactParts.push(`${years} ${years === 1 ? 'ano' : 'anos'}`);
  if (months > 0) compactParts.push(`${months} ${months === 1 ? 'mês' : 'meses'}`);
  if (days > 0 || compactParts.length === 0) compactParts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);
  
  let compactTime = compactParts.length === 2 ? compactParts.join(" e ") : compactParts.join(", ");
  counterEl.textContent = `Nos conhecemos há ${compactTime} • Desde 09/04/${startYear}`;

  // 2. Versão completa em tempo real para o Splash Screen
  let fullParts = [];
  if (years > 0) {
    fullParts.push(`${years} ${years === 1 ? 'ano' : 'anos'}`);
  }
  if (months > 0) {
    fullParts.push(`${months} ${months === 1 ? 'mês' : 'meses'}`);
  }
  if (days > 0) {
    fullParts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);
  }
  
  fullParts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
  fullParts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`);
  fullParts.push(`${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`);

  let fullTime = "";
  if (fullParts.length > 1) {
    const lastPart = fullParts.pop();
    fullTime = fullParts.join(", ") + " e " + lastPart;
  } else {
    fullTime = fullParts[0];
  }

  const splashCounterEl = document.getElementById("splash-time-counter");
  if (splashCounterEl) {
    splashCounterEl.textContent = fullTime;
  }

  const partnerAName = localStorage.getItem("partnerA") || "Derci";
  const partnerBName = localStorage.getItem("partnerB") || "Isa";
  const splashCoupleNames = document.getElementById("splash-couple-names");
  if (splashCoupleNames) {
    splashCoupleNames.textContent = `${partnerAName} & ${partnerBName}`;
  }
}

// Controle de estado de reprodução da música
let isMusicPlaying = false;

// Inicializar e configurar a tela de Splash Romântico
function initSplashScreen() {
  const btn = document.getElementById("btn-enter-app");
  const splash = document.getElementById("romantic-splash");
  if (!btn || !splash) return;

  btn.addEventListener("click", () => {
    splash.classList.add("fade-out");

    const player = document.getElementById("bg-music-player");
    const iconOn = document.getElementById("music-icon-on");
    const iconOff = document.getElementById("music-icon-off");

    if (player && !isMusicPlaying) {
      player.volume = 0.5;
      player.play().then(() => {
        isMusicPlaying = true;
        if (iconOn) iconOn.style.display = "block";
        if (iconOff) iconOff.style.display = "none";
      }).catch(err => {
        console.warn("Autoplay bloqueado pelo navegador:", err);
      });
    }
  });
}

// Inicializar e configurar o botão de Mute/Unmute no Header
function initMusicToggle() {
  const btn = document.getElementById("btn-toggle-music");
  const player = document.getElementById("bg-music-player");
  const iconOn = document.getElementById("music-icon-on");
  const iconOff = document.getElementById("music-icon-off");

  if (!btn || !player) return;

  btn.addEventListener("click", () => {
    if (isMusicPlaying) {
      player.pause();
      if (iconOn) iconOn.style.display = "none";
      if (iconOff) iconOff.style.display = "block";
      isMusicPlaying = false;
    } else {
      player.play().then(() => {
        if (iconOn) iconOn.style.display = "block";
        if (iconOff) iconOff.style.display = "none";
        isMusicPlaying = true;
      }).catch(err => {
        console.warn("Erro ao tocar música:", err);
      });
    }
  });
}
