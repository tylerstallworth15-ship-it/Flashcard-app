// LocalStorage-backed Flashcards SPA
// - Fixed sidebar
// - Search bar top-right (filters cards in active deck)
// - Accessible modals with focus trap + ESC
// - LocalStorage with versioning + safe defaults
// - 3D flip animation toggled by button or Space
// - ArrowLeft/Right navigation with cleanup

(() => {
  const STORAGE_KEY = "flashcards-app-state";
  const STORAGE_VERSION = 1;

  const defaultState = {
    version: STORAGE_VERSION,
    decks: [],
    cardsByDeckId: {}, // deckId -> array of cards
    activeDeckId: null,
    ui: {
      activeCardIndex: 0,
      isFlipped: false,
      searchQuery: ""
    }
  };

  let appState = loadAppState();

  // ---------- DOM ----------
  const deckListElement = document.getElementById("deck-list");
  const deckListEmptyElement = document.getElementById("deck-list-empty");
  const sidebarCardListElement = document.getElementById("sidebar-card-list");

  const mainContentElement = document.getElementById("main-content");
  const noDeckStateElement = document.getElementById("no-deck-state");
  const deckViewElement = document.getElementById("deck-view");

  const deckTitleElement = document.getElementById("deck-title");
  const deckMetaElement = document.getElementById("deck-meta");
  const searchStatusElement = document.getElementById("search-status");

  const cardInnerElement = document.getElementById("card-inner");
  const cardFrontTextElement = document.getElementById("card-front-text");
  const cardBackTextElement = document.getElementById("card-back-text");
  const cardPositionElement = document.getElementById("card-position");
  const noCardsMessageElement = document.getElementById("no-cards-message");

  const previousCardButton = document.getElementById("prev-card-btn");
  const nextCardButton = document.getElementById("next-card-btn");
  const flipCardButton = document.getElementById("flip-card-btn");
  const shuffleButton = document.getElementById("shuffle-btn");
  const newCardButton = document.getElementById("new-card-btn");
  const editCardButton = document.getElementById("edit-card-btn");
  const deleteCardButton = document.getElementById("delete-card-btn");

  const newDeckHeaderButton = document.getElementById("new-deck-btn");
  const newDeckEmptyButton = document.getElementById("empty-new-deck-btn");
  const editDeckButton = document.getElementById("edit-deck-btn");
  const deleteDeckButton = document.getElementById("delete-deck-btn");

  const headerSearchInput = document.getElementById("header-search");
  const themeToggleButton = document.getElementById("theme-toggle");

  // Modals
  const deckModalElement = document.getElementById("deck-modal");
  const deckModalTitleElement = document.getElementById("deck-modal-title");
  const deckFormElement = document.getElementById("deck-form");
  const deckNameInputElement = document.getElementById("deck-name-input");

  const cardModalElement = document.getElementById("card-modal");
  const cardModalTitleElement = document.getElementById("card-modal-title");
  const cardFormElement = document.getElementById("card-form");
  const cardFrontInputElement = document.getElementById("card-front-input");
  const cardBackInputElement = document.getElementById("card-back-input");

  let currentModalElement = null;
  let elementFocusedBeforeModal = null;

  // ---------- INITIAL DATA SEED (if empty) ----------
  if (appState.decks.length === 0) {
    seedInitialData();
    saveAppState();
  }

  // ---------- INIT ----------
  document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    applyStoredThemePreference();
    renderApp();
    mainContentElement.focus();
  });

  // ---------- STORAGE HELPERS ----------
  function loadAppState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return clone(defaultState);
      }

      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== STORAGE_VERSION) {
        return clone(defaultState);
      }

      return {
        ...clone(defaultState),
        ...parsed,
        ui: {
          ...clone(defaultState.ui),
          ...(parsed.ui || {})
        }
      };
    } catch {
      return clone(defaultState);
    }
  }

  function saveAppState() {
    try {
      const toSave = { ...appState, version: STORAGE_VERSION };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // Ignore storage errors
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  // ---------- INITIAL SEED ----------
  function seedInitialData() {
    const deckSpanishId = createId("deck");
    const deckMathId = createId("deck");

    appState.decks = [
      { id: deckSpanishId, name: "Spanish Vocab", createdAt: Date.now() },
      { id: deckMathId, name: "Math Formulas", createdAt: Date.now() }
    ];

    appState.cardsByDeckId[deckSpanishId] = [
      { id: createId("card"), front: "Hola", back: "Hello", updatedAt: Date.now() },
      { id: createId("card"), front: "Adiós", back: "Goodbye", updatedAt: Date.now() },
      { id: createId("card"), front: "Gracias", back: "Thank you", updatedAt: Date.now() }
    ];

    appState.cardsByDeckId[deckMathId] = [
      { id: createId("card"), front: "Area of circle", back: "πr²", updatedAt: Date.now() },
      { id: createId("card"), front: "Pythagorean theorem", back: "a² + b² = c²", updatedAt: Date.now() }
    ];

    appState.activeDeckId = deckSpanishId;
    appState.ui.activeCardIndex = 0;
    appState.ui.isFlipped = false;
    appState.ui.searchQuery = "";
  }

  function createId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  // ---------- STATE HELPERS ----------
  function getActiveDeck() {
    return appState.decks.find((deck) => deck.id === appState.activeDeckId) || null;
  }

  function getCardsForDeck(deckId) {
    return appState.cardsByDeckId[deckId] || [];
  }

  function getFilteredCards() {
    const activeDeck = getActiveDeck();
    if (!activeDeck) return [];
    const allCards = getCardsForDeck(activeDeck.id);
    const trimmedQuery = appState.ui.searchQuery.trim().toLowerCase();
    if (!trimmedQuery) return allCards;

    return allCards.filter((card) => {
      return (
        card.front.toLowerCase().includes(trimmedQuery) ||
        card.back.toLowerCase().includes(trimmedQuery)
      );
    });
  }

  function setActiveDeck(deckId) {
    if (!deckId) {
      appState.activeDeckId = null;
      appState.ui.activeCardIndex = 0;
      appState.ui.isFlipped = false;
      appState.ui.searchQuery = "";
      saveAppState();
      renderApp();
      return;
    }

    appState.activeDeckId = deckId;
    appState.ui.activeCardIndex = 0;
    appState.ui.isFlipped = false;
    appState.ui.searchQuery = "";
    headerSearchInput.value = "";
    saveAppState();
    renderApp();
  }

  // ---------- RENDER ----------
  function renderApp() {
    renderDeckList();
    renderSidebarCards();
    renderMainArea();
  }

  function renderDeckList() {
    const { decks } = appState;
    deckListElement.innerHTML = "";

    if (!decks.length) {
      deckListEmptyElement.hidden = false;
      return;
    }

    deckListEmptyElement.hidden = true;

    decks.forEach((deck) => {
      const listItem = document.createElement("li");
      listItem.className = "sidebar__item";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "sidebar__btn";
      button.dataset.deckId = deck.id;

      const nameSpan = document.createElement("span");
      nameSpan.textContent = deck.name || "Untitled Deck";

      const countSpan = document.createElement("span");
      const cardCount = getCardsForDeck(deck.id).length;
      countSpan.textContent = `${cardCount} card${cardCount === 1 ? "" : "s"}`;

      button.append(nameSpan, countSpan);

      if (deck.id === appState.activeDeckId) {
        listItem.classList.add("sidebar__item--active");
        button.setAttribute("aria-current", "page");
      }

      listItem.appendChild(button);
      deckListElement.appendChild(listItem);
    });
  }

  function renderSidebarCards() {
    sidebarCardListElement.innerHTML = "";
    const activeDeck = getActiveDeck();
    if (!activeDeck) return;

    const cards = getCardsForDeck(activeDeck.id);
    if (!cards.length) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "sidebar__card-item";
      emptyItem.textContent = "No cards yet.";
      sidebarCardListElement.appendChild(emptyItem);
      return;
    }

    cards.forEach((card, index) => {
      const item = document.createElement("li");
      item.className = "sidebar__card-item";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "sidebar__card-btn";
      button.dataset.cardId = card.id;

      const textSpan = document.createElement("span");
      textSpan.className = "sidebar__card-text";
      textSpan.textContent =
        card.front.length > 28 ? card.front.slice(0, 28) + "…" : card.front;

      const iconSpan = document.createElement("span");
      iconSpan.className = "sidebar__card-icon";
      iconSpan.setAttribute("aria-hidden", "true");
      iconSpan.textContent = "≡";

      button.append(textSpan, iconSpan);

      // Mark active card
      const filteredCards = getFilteredCards();
      const currentCard =
        filteredCards[appState.ui.activeCardIndex] ?? null;
      if (currentCard && currentCard.id === card.id) {
        button.classList.add("sidebar__card-btn--active");
      }

      item.appendChild(button);
      sidebarCardListElement.appendChild(item);
    });
  }

  function renderMainArea() {
    const activeDeck = getActiveDeck();

    if (!activeDeck) {
      noDeckStateElement.hidden = false;
      deckViewElement.hidden = true;
      return;
    }

    noDeckStateElement.hidden = true;
    deckViewElement.hidden = false;

    deckTitleElement.textContent = activeDeck.name || "Untitled Deck";

    const totalCards = getCardsForDeck(activeDeck.id).length;
    deckMetaElement.textContent = `${totalCards} card${
      totalCards === 1 ? "" : "s"
    } • Created ${formatDate(activeDeck.createdAt)}`;

    const filteredCards = getFilteredCards();
    const totalFiltered = filteredCards.length;

    // clamp index
    if (totalFiltered === 0) {
      appState.ui.activeCardIndex = 0;
    } else if (appState.ui.activeCardIndex >= totalFiltered) {
      appState.ui.activeCardIndex = totalFiltered - 1;
    }

    const currentIndex = appState.ui.activeCardIndex;
    const query = appState.ui.searchQuery.trim();

    if (!totalFiltered) {
      cardFrontTextElement.textContent = query
        ? "No cards match your search."
        : "No cards in this deck yet.";
      cardBackTextElement.textContent = query
        ? "Try another keyword or clear the search."
        : "Use “New Card” to add your first card.";
      cardPositionElement.textContent = `0 of ${totalCards}`;
      noCardsMessageElement.textContent = "";
      searchStatusElement.textContent = query
        ? `Search “${query}” — 0 matches.`
        : "";

      setStudyControlsDisabled(true);
      resetFlipAnimation();
      updateCardAriaLabel();

      renderSidebarCards();
      return;
    }

    const currentCard = filteredCards[currentIndex];
    cardFrontTextElement.textContent = currentCard.front;
    cardBackTextElement.textContent = currentCard.back;

    cardPositionElement.textContent = `Card ${currentIndex + 1} of ${totalFiltered}`;
    cardPositionElement.setAttribute(
      "aria-label",
      `Showing card ${currentIndex + 1} of ${totalFiltered}.`
    );

    searchStatusElement.textContent = query
      ? `Search “${query}” — ${totalFiltered} match${
          totalFiltered === 1 ? "" : "es"
        }.`
      : "";

    noCardsMessageElement.textContent = "";
    setStudyControlsDisabled(false);

    // Apply flip state
    if (appState.ui.isFlipped) {
      cardInnerElement.classList.add("is-flipped");
    } else {
      cardInnerElement.classList.remove("is-flipped");
    }
    updateCardAriaLabel();

    renderSidebarCards();
  }

  function setStudyControlsDisabled(disabled) {
    const buttons = [
      previousCardButton,
      nextCardButton,
      flipCardButton,
      shuffleButton,
      newCardButton,
      editCardButton,
      deleteCardButton
    ];
    buttons.forEach((button) => {
      button.disabled = disabled;
    });
  }

  function resetFlipAnimation() {
    appState.ui.isFlipped = false;
    cardInnerElement.classList.remove("is-flipped");
  }

  function updateCardAriaLabel() {
    if (appState.ui.isFlipped) {
      cardInnerElement.setAttribute(
        "aria-label",
        "Flashcard back. Press to show front."
      );
    } else {
      cardInnerElement.setAttribute(
        "aria-label",
        "Flashcard front. Press to show back."
      );
    }
  }

  // ---------- EVENTS ----------
  function bindEvents() {
    // Deck list (delegation)
    deckListElement.addEventListener("click", (event) => {
      const button = event.target.closest(".sidebar__btn");
      if (!button) return;
      const deckId = button.dataset.deckId;
      if (!deckId) return;
      if (deckId === appState.activeDeckId) return;
      setActiveDeck(deckId);
    });

    // Card list in sidebar
    sidebarCardListElement.addEventListener("click", (event) => {
      const button = event.target.closest(".sidebar__card-btn");
      if (!button) return;
      const cardId = button.dataset.cardId;
      const activeDeck = getActiveDeck();
      if (!activeDeck || !cardId) return;

      const cards = getCardsForDeck(activeDeck.id);
      const index = cards.findIndex((card) => card.id === cardId);
      if (index === -1) return;

      appState.ui.searchQuery = "";
      headerSearchInput.value = "";
      appState.ui.activeCardIndex = index;
      resetFlipAnimation();
      saveAppState();
      renderMainArea();
    });

    // New deck buttons
    newDeckHeaderButton.addEventListener("click", () => {
      openDeckModal("create");
    });
    newDeckEmptyButton.addEventListener("click", () => {
      openDeckModal("create");
    });

    // Deck form
    deckFormElement.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = deckNameInputElement.value.trim();
      if (!name) return;

      const mode = deckFormElement.dataset.mode || "create";
      if (mode === "create") {
        createDeck(name);
      } else if (mode === "edit") {
        const deckId = deckFormElement.dataset.deckId;
        if (deckId) {
          renameDeck(deckId, name);
        }
      }
      closeModal(deckModalElement);
    });

    // Edit/delete deck
    editDeckButton.addEventListener("click", () => {
      const activeDeck = getActiveDeck();
      if (!activeDeck) return;
      openDeckModal("edit", activeDeck);
    });

    deleteDeckButton.addEventListener("click", () => {
      const activeDeck = getActiveDeck();
      if (!activeDeck) return;
      const confirmed = window.confirm(
        `Delete deck "${activeDeck.name}" and all of its cards?`
      );
      if (!confirmed) return;
      deleteDeck(activeDeck.id);
    });

    // Card modal form
    cardFormElement.addEventListener("submit", (event) => {
      event.preventDefault();
      const front = cardFrontInputElement.value.trim();
      const back = cardBackInputElement.value.trim();
      if (!front || !back) return;

      const activeDeck = getActiveDeck();
      if (!activeDeck) return;

      const mode = cardFormElement.dataset.mode || "create";
      if (mode === "create") {
        createCard(activeDeck.id, front, back);
      } else if (mode === "edit") {
        const cardId = cardFormElement.dataset.cardId;
        if (cardId) {
          updateCard(activeDeck.id, cardId, front, back);
        }
      }

      closeModal(cardModalElement);
    });

    // New card button
    newCardButton.addEventListener("click", () => {
      const activeDeck = getActiveDeck();
      if (!activeDeck) return;
      openCardModal("create");
    });

    // Edit / delete card buttons
    editCardButton.addEventListener("click", () => {
      const activeDeck = getActiveDeck();
      if (!activeDeck) return;
      const filteredCards = getFilteredCards();
      if (!filteredCards.length) return;
      const card = filteredCards[appState.ui.activeCardIndex];
      openCardModal("edit", card);
    });

    deleteCardButton.addEventListener("click", () => {
      const activeDeck = getActiveDeck();
      if (!activeDeck) return;
      const filteredCards = getFilteredCards();
      if (!filteredCards.length) return;
      const card = filteredCards[appState.ui.activeCardIndex];

      const confirmed = window.confirm("Delete this card?");
      if (!confirmed) return;
      deleteCard(activeDeck.id, card.id);
    });

    // Study controls
    flipCardButton.addEventListener("click", () => {
      toggleFlip();
    });

    cardInnerElement.addEventListener("click", () => {
      toggleFlip();
    });

    cardInnerElement.addEventListener("keydown", (event) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        toggleFlip();
      }
    });

    previousCardButton.addEventListener("click", () => {
      goToRelativeCard(-1);
    });

    nextCardButton.addEventListener("click", () => {
      goToRelativeCard(1);
    });

    shuffleButton.addEventListener("click", () => {
      jumpToRandomCard();
    });

    // Header search
    headerSearchInput.addEventListener("input", (event) => {
      const value = event.target.value || "";
      appState.ui.searchQuery = value;
      appState.ui.activeCardIndex = 0;
      resetFlipAnimation();
      saveAppState();
      renderMainArea();
    });

    // Global keydown (keyboard shortcuts + ESC for modal)
    window.addEventListener("keydown", handleGlobalKeydown);
    window.addEventListener("beforeunload", () => {
      window.removeEventListener("keydown", handleGlobalKeydown);
    });

    // Modal close via data attribute (backdrop & buttons)
    document.addEventListener("click", (event) => {
      const closeTarget = event.target.closest("[data-modal-close]");
      if (!closeTarget) return;
      const modal = closeTarget.closest(".modal");
      if (modal) {
        closeModal(modal);
      }
    });

    // Theme toggle
    themeToggleButton.addEventListener("click", handleThemeToggleClick);
  }

  function handleGlobalKeydown(event) {
    // If modal open: only handle ESC here
    if (currentModalElement) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal(currentModalElement);
      }
      return;
    }

    // Ignore when typing in inputs/textarea
    const tagName = event.target.tagName.toLowerCase();
    if (tagName === "input" || tagName === "textarea") {
      return;
    }

    const activeDeck = getActiveDeck();
    if (!activeDeck || !getFilteredCards().length) return;

    if (event.key === " ") {
      event.preventDefault();
      toggleFlip();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goToRelativeCard(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToRelativeCard(-1);
    }
  }

  // ---------- STUDY LOGIC ----------
  function toggleFlip() {
    appState.ui.isFlipped = !appState.ui.isFlipped;
    if (appState.ui.isFlipped) {
      cardInnerElement.classList.add("is-flipped");
    } else {
      cardInnerElement.classList.remove("is-flipped");
    }
    updateCardAriaLabel();
    saveAppState();
  }

  function goToRelativeCard(offset) {
    const cards = getFilteredCards();
    const count = cards.length;
    if (!count) return;

    let nextIndex = appState.ui.activeCardIndex + offset;
    if (nextIndex < 0) nextIndex = count - 1;
    if (nextIndex >= count) nextIndex = 0;

    appState.ui.activeCardIndex = nextIndex;
    resetFlipAnimation();
    saveAppState();
    renderMainArea();
  }

  function jumpToRandomCard() {
    const cards = getFilteredCards();
    const count = cards.length;
    if (count <= 1) return;

    let nextIndex = appState.ui.activeCardIndex;
    while (nextIndex === appState.ui.activeCardIndex) {
      nextIndex = Math.floor(Math.random() * count);
    }

    appState.ui.activeCardIndex = nextIndex;
    resetFlipAnimation();
    saveAppState();
    renderMainArea();
  }

  // ---------- DECK & CARD CRUD ----------
  function createDeck(name) {
    const id = createId("deck");
    const newDeck = { id, name, createdAt: Date.now() };

    appState.decks.push(newDeck);
    appState.cardsByDeckId[id] = [];
    setActiveDeck(id);
  }

  function renameDeck(deckId, newName) {
    const deck = appState.decks.find((d) => d.id === deckId);
    if (!deck) return;
    deck.name = newName;
    saveAppState();
    renderApp();
  }

  function deleteDeck(deckId) {
    appState.decks = appState.decks.filter((d) => d.id !== deckId);
    delete appState.cardsByDeckId[deckId];

    if (appState.activeDeckId === deckId) {
      appState.activeDeckId = appState.decks[0]?.id ?? null;
      appState.ui.activeCardIndex = 0;
      appState.ui.isFlipped = false;
      appState.ui.searchQuery = "";
      headerSearchInput.value = "";
    }

    saveAppState();
    renderApp();
  }

  function createCard(deckId, front, back) {
    const cards = getCardsForDeck(deckId);
    const newCard = {
      id: createId("card"),
      front,
      back,
      updatedAt: Date.now()
    };
    cards.push(newCard);
    appState.cardsByDeckId[deckId] = cards;
    appState.ui.activeCardIndex = cards.length - 1;
    appState.ui.isFlipped = false;
    saveAppState();
    renderApp();
  }

  function updateCard(deckId, cardId, front, back) {
    const cards = getCardsForDeck(deckId);
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    card.front = front;
    card.back = back;
    card.updatedAt = Date.now();
    appState.ui.isFlipped = false;
    saveAppState();
    renderApp();
  }

  function deleteCard(deckId, cardId) {
    const cards = getCardsForDeck(deckId);
    const index = cards.findIndex((c) => c.id === cardId);
    if (index === -1) return;

    cards.splice(index, 1);
    appState.cardsByDeckId[deckId] = cards;

    if (appState.ui.activeCardIndex >= cards.length) {
      appState.ui.activeCardIndex = Math.max(0, cards.length - 1);
    }
    appState.ui.isFlipped = false;

    saveAppState();
    renderApp();
  }

  // ---------- MODALS + FOCUS TRAP ----------
  function openDeckModal(mode, deck) {
    deckFormElement.dataset.mode = mode;
    if (mode === "create") {
      deckModalTitleElement.textContent = "New Deck";
      deckNameInputElement.value = "";
      delete deckFormElement.dataset.deckId;
    } else {
      deckModalTitleElement.textContent = "Edit Deck";
      deckNameInputElement.value = deck?.name || "";
      deckFormElement.dataset.deckId = deck.id;
    }
    openModal(deckModalElement, deckNameInputElement);
  }

  function openCardModal(mode, card) {
    cardFormElement.dataset.mode = mode;
    if (mode === "create") {
      cardModalTitleElement.textContent = "New Card";
      cardFrontInputElement.value = "";
      cardBackInputElement.value = "";
      delete cardFormElement.dataset.cardId;
    } else {
      cardModalTitleElement.textContent = "Edit Card";
      cardFrontInputElement.value = card?.front || "";
      cardBackInputElement.value = card?.back || "";
      cardFormElement.dataset.cardId = card.id;
    }
    openModal(cardModalElement, cardFrontInputElement);
  }

  function openModal(modalElement, elementToFocus) {
    if (currentModalElement) {
      closeModal(currentModalElement);
    }

    currentModalElement = modalElement;
    elementFocusedBeforeModal = document.activeElement;

    modalElement.setAttribute("aria-hidden", "false");

    const focusableSelectors =
      'button:not([disabled]), [href], input, textarea, select, [tabindex]:not([tabindex="-1"])';

    const focusableElements = Array.from(
      modalElement.querySelectorAll(focusableSelectors)
    ).filter((el) => el.offsetParent !== null);

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    const handleKeydown = (event) => {
      if (event.key === "Tab") {
        if (!focusableElements.length) {
          event.preventDefault();
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    modalElement.__focusTrapHandler = handleKeydown;
    modalElement.addEventListener("keydown", handleKeydown);

    if (elementToFocus) {
      elementToFocus.focus();
      if (elementToFocus.select) {
        elementToFocus.select();
      }
    } else if (first) {
      first.focus();
    }
  }

  function closeModal(modalElement) {
    modalElement.setAttribute("aria-hidden", "true");

    if (modalElement.__focusTrapHandler) {
      modalElement.removeEventListener("keydown", modalElement.__focusTrapHandler);
      delete modalElement.__focusTrapHandler;
    }

    if (currentModalElement === modalElement) {
      currentModalElement = null;
    }

    if (elementFocusedBeforeModal && typeof elementFocusedBeforeModal.focus === "function") {
      elementFocusedBeforeModal.focus();
    }
  }

  // ---------- THEME (light 🌞 / dark 🌙 only) ----------
  const THEME_STORAGE_KEY = "flashcards-theme";

  function applyStoredThemePreference() {
    const stored = loadThemePreference();
    applyThemePreference(stored);
  }

  function loadThemePreference() {
    try {
      const value = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (value === "light" || value === "dark") return value;

      const prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      return prefersDark ? "dark" : "light";
    } catch {
      return "light";
    }
  }

  function saveThemePreference(value) {
    try {
      if (value === "light" || value === "dark") {
        window.localStorage.setItem(THEME_STORAGE_KEY, value);
      }
    } catch {
      // ignore
    }
  }

  function applyThemePreference(theme) {
    const normalizedTheme = theme === "dark" ? "dark" : "light";

    if (normalizedTheme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      themeToggleButton.setAttribute("aria-pressed", "true");
      themeToggleButton.setAttribute("aria-label", "Switch to light mode");
      themeToggleButton.textContent = "🌙 Dark";
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      themeToggleButton.setAttribute("aria-pressed", "false");
      themeToggleButton.setAttribute("aria-label", "Switch to dark mode");
      themeToggleButton.textContent = "🌞 Light";
    }
  }

  function handleThemeToggleClick() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyThemePreference(nextTheme);
    saveThemePreference(nextTheme);
  }

  // ---------- UTIL ----------
  function formatDate(timestamp) {
    if (!timestamp) return "recently";
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return "recently";
    }
  }
})();
