// js/utils/interactions.js

const ACTION_QUEUE_KEY = "bigsolo_action_queue";

// --- Gestion de la file d'attente ---

function getActionQueue() {
  try {
    const queue = localStorage.getItem(ACTION_QUEUE_KEY);
    return queue ? JSON.parse(queue) : {};
  } catch (e) {
    return {};
  }
}

function saveActionQueue(queue) {
  try {
    localStorage.setItem(ACTION_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error(
      "Impossible de sauvegarder la file d'attente des actions.",
      e
    );
  }
}

export function queueAction(seriesSlug, action) {
  const queue = getActionQueue();
  if (!queue[seriesSlug]) {
    queue[seriesSlug] = [];
  }
  queue[seriesSlug].push(action);
  saveActionQueue(queue);
}

function sendActionQueue() {
  const queue = getActionQueue();
  const seriesSlugs = Object.keys(queue);

  if (seriesSlugs.length === 0) return;

  for (const seriesSlug of seriesSlugs) {
    const actions = queue[seriesSlug];
    if (actions.length > 0) {
      try {
        fetch("/api/log-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seriesSlug, actions }),
          keepalive: true,
        });

        const currentQueue = getActionQueue();
        delete currentQueue[seriesSlug];
        saveActionQueue(currentQueue);
      } catch (error) {
        console.warn(
          "L'envoi de la file d'attente a échoué. Les actions seront renvoyées à la prochaine session.",
          error
        );
      }
    }
  }
}

window.addEventListener("pagehide", sendActionQueue);

// --- Gestion de l'état local de l'utilisateur ---

export function getLocalInteractionState(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch (e) {
    return {};
  }
}

export function setLocalInteractionState(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Impossible de sauvegarder l'état local.", e);
  }
}

export function addPendingComment(interactionKey, comment) {
  const localState = getLocalInteractionState(interactionKey);
  if (!localState.pendingComments) {
    localState.pendingComments = [];
  }
  localState.pendingComments.push(comment);
  localState.hasCommented = true;
  setLocalInteractionState(interactionKey, localState);
}

// --- Récupération des données ---

let seriesStatsCache = new Map();

export async function fetchSeriesStats(seriesSlug) {
  if (seriesStatsCache.has(seriesSlug)) {
    return seriesStatsCache.get(seriesSlug);
  }
  try {
    const response = await fetch(
      `/api/series-stats?slug=${seriesSlug}&t=${Date.now()}`
    );
    if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
    const data = await response.json();
    seriesStatsCache.set(seriesSlug, data);
    return data;
  } catch (error) {
    console.error(
      `Impossible de récupérer les stats pour ${seriesSlug}:`,
      error
    );
    return {};
  }
}
