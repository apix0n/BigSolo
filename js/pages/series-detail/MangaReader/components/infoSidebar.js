// --- File: js/pages/series-detail/MangaReader/components/infoSidebar.js ---

import { qs, qsa, slugify } from "../../../../utils/domUtils.js";
import { timeAgo } from "../../../../utils/dateUtils.js";
import { state, dom } from "../state.js";
import { assignUserIdentityForChapter } from "../../../../utils/usernameGenerator.js";
import {
  queueAction,
  getLocalInteractionState,
  setLocalInteractionState,
  addPendingComment,
} from "../../../../utils/interactions.js";

/**
 * Initialise le composant de la sidebar d'informations.
 */
export function init() {
  console.log("[InfoSidebar] Initialisation.");
  render();
  attachEventListeners();
}

/**
 * Gère le rendu HTML de la sidebar d'informations.
 */
function render() {
  if (!dom.infoSidebar) return;

  const seriesSlug = slugify(state.seriesData.title);

  dom.infoSidebar.innerHTML = `
        <div class="sidebar-content-wrapper">
            <div id="info-series-link-group" class="control-group">
                <a id="info-series-link" href="/${seriesSlug}">
                    <i class="fas fa-arrow-left"></i> ${state.seriesData.title}
                </a>
            </div>
            <div id="info-chapters-group" class="control-group">
                <h4 class="group-title">Chapitres</h4>
                <div class="chapter-list-wrapper"><div class="chapter-list"><p>Chargement...</p></div></div>
            </div>
            <div id="info-comments-group" class="control-group">
                <h4 class="group-title">Commentaires</h4>
                <div class="add-comment-box">
                    <textarea id="comment-textarea" placeholder="Ajouter un commentaire..." rows="1"></textarea>
                    <div class="add-comment-actions"><button id="comment-send-btn" class="send-btn">Envoyer <i class="fas fa-paper-plane"></i></button></div>
                </div>
                <div id="comments-list">
                    <p>Chargement...</p>
                </div>
            </div>
        </div>`;

  // Met à jour les références DOM spécifiques à cette sidebar
  dom.chapterList = qs(".chapter-list", dom.infoSidebar);
  dom.commentsList = qs("#comments-list", dom.infoSidebar);
  dom.commentTextarea = qs("#comment-textarea", dom.infoSidebar);
  dom.commentSendBtn = qs("#comment-send-btn", dom.infoSidebar);
}

/**
 * Attache tous les écouteurs d'événements pour la sidebar d'informations.
 */
function attachEventListeners() {
  // Clic sur un chapitre dans la liste
  if (dom.chapterList) {
    dom.chapterList.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (link) {
        e.preventDefault(); // Empêche le comportement par défaut du lien dans tous les cas
        const chapterId = link.dataset.chapterId;
        if (chapterId && chapterId !== state.currentChapter.number) {
          const seriesSlug = slugify(state.seriesData.title);
          window.location.href = `/${seriesSlug}/${chapterId}`;
        }
      }

      // Clic sur le bouton/zone de like dans les stats du chapitre
      if (e.target.closest(".chapter-stats-details")) {
        handleGlobalLike();
      }
    });
  }

  // Envoi d'un commentaire
  if (dom.commentSendBtn) {
    dom.commentSendBtn.addEventListener("click", handleCommentSubmit);
  }

  // Redimensionnement automatique du textarea
  if (dom.commentTextarea) {
    dom.commentTextarea.addEventListener("input", () => {
      dom.commentTextarea.style.height = "auto";
      const newHeight = Math.min(dom.commentTextarea.scrollHeight, 120);
      dom.commentTextarea.style.height = `${newHeight}px`;
    });
  }

  // Likes sur les commentaires
  if (dom.commentsList) {
    dom.commentsList.addEventListener("click", handleCommentLike);
  }
}

/**
 * Met à jour la liste des chapitres affichée dans la sidebar.
 */
export function updateChapterList() {
  if (!dom.chapterList) return;

  const sortedChapters = state.allChapterKeys
    .slice()
    .sort((a, b) => parseFloat(b) - parseFloat(a));

  dom.chapterList.innerHTML = sortedChapters
    .map((key) => {
      const chapterTitle = state.seriesData.chapters[key].title || "";
      const truncatedTitle =
        chapterTitle.length > 28
          ? chapterTitle.substring(0, 25) + "..."
          : chapterTitle;
      const isActive = key === state.currentChapter.number;

      return `
            <a href="#" data-chapter-id="${key}" class="${
        isActive ? "active" : ""
      }" title="${chapterTitle}">
                <div class="chapter-info-main">
                    <span class="chapter-number">${key}</span>
                    <span class="chapter-title">${truncatedTitle}</span>
                </div>
                ${isActive ? renderChapterStats() : ""}
            </a>`;
    })
    .join("");

  const activeLink = qs("a.active", dom.chapterList);
  if (activeLink) {
    activeLink.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

/**
 * Gère la soumission d'un nouveau commentaire.
 */
async function handleCommentSubmit() {
  const commentText = dom.commentTextarea.value.trim();
  if (commentText.length === 0) return;

  const seriesSlug = slugify(state.seriesData.title);
  const chapterNumber = state.currentChapter.number;
  const interactionKey = `interactions_${seriesSlug}_${chapterNumber}`;

  const userIdentity = await assignUserIdentityForChapter(interactionKey);
  const newComment = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    username: userIdentity.username,
    avatarUrl: userIdentity.avatarUrl,
    comment: commentText,
    timestamp: Date.now(),
    likes: 0,
  };

  addPendingComment(interactionKey, newComment);
  // Ajout optimiste au début de la liste de commentaires dans l'état
  state.chapterStats.comments.unshift(newComment);

  queueAction(seriesSlug, {
    type: "add_comment",
    chapter: chapterNumber,
    payload: newComment,
  });

  dom.commentTextarea.value = "";
  dom.commentTextarea.style.height = "auto";

  updateCommentsSection(); // Re-render la section commentaires
  updateChapterList(); // Re-render la liste des chapitres pour mettre à jour le compteur de commentaires
}

/**
 * Gère le clic sur le bouton "J'aime" d'un commentaire.
 * @param {MouseEvent} e
 */
function handleCommentLike(e) {
  const likeBtn = e.target.closest(".comment-like-action");
  if (!likeBtn) return;

  const commentItem = likeBtn.closest(".comment-item");
  const commentId = commentItem?.dataset.commentId;
  if (!commentId) return;

  const seriesSlug = slugify(state.seriesData.title);
  const chapterNumber = state.currentChapter.number;
  const interactionKey = `interactions_${seriesSlug}_${chapterNumber}`;
  let localState = getLocalInteractionState(interactionKey);
  if (!localState.likedComments) localState.likedComments = [];

  const isLiked = localState.likedComments.includes(commentId);

  // Mise à jour de l'état local
  if (isLiked) {
    localState.likedComments = localState.likedComments.filter(
      (id) => id !== commentId
    );
  } else {
    localState.likedComments.push(commentId);
  }
  setLocalInteractionState(interactionKey, localState);

  // Mise en file d'attente de l'action
  queueAction(seriesSlug, {
    type: isLiked ? "unlike_comment" : "like_comment",
    chapter: chapterNumber,
    payload: { commentId },
  });

  // Mise à jour optimiste de l'UI
  updateCommentsSection();
}

/**
 * Met à jour toute la section des commentaires (liste et formulaire).
 */
export function updateCommentsSection() {
  if (!dom.commentsList) return;

  const seriesSlug = slugify(state.seriesData.title);
  const chapterNumber = state.currentChapter.number;
  const interactionKey = `interactions_${seriesSlug}_${chapterNumber}`;
  const localState = getLocalInteractionState(interactionKey);
  const likedComments = new Set(localState.likedComments || []);
  const pendingComments = localState.pendingComments || [];
  const serverComments = state.chapterStats.comments || [];

  // Fusionner les commentaires du serveur et les commentaires en attente (sans doublons)
  const serverCommentIds = new Set(serverComments.map((c) => c.id));
  const allComments = [
    ...pendingComments.filter((pc) => !serverCommentIds.has(pc.id)),
    ...serverComments,
  ].sort((a, b) => b.timestamp - a.timestamp);

  if (allComments.length > 0) {
    dom.commentsList.innerHTML = allComments
      .map((comment) => {
        const isLiked = likedComments.has(comment.id);
        // Trouve le commentaire correspondant dans l'état pour obtenir le nombre de likes de base
        const originalComment = state.chapterStats.comments.find(
          (c) => c.id === comment.id
        );
        let baseLikes = originalComment?.likes || 0;
        let displayLikes = isLiked ? baseLikes + 1 : baseLikes;

        return `
                <div class="comment-item" data-comment-id="${comment.id}">
                    <div class="comment-header">
                        <div class="user">
                            <div class="user-pic"><img src="${
                              comment.avatarUrl || "/img/profil.png"
                            }" alt="Avatar"></div>
                            <div class="user-info">
                                <span class="username">${
                                  comment.username || "Visiteur"
                                }</span>
                                <span class="timestamp">${timeAgo(
                                  comment.timestamp
                                )}</span>
                            </div>
                        </div>
                        <button class="comment-like-action${
                          isLiked ? " liked" : ""
                        }" title="Aimer le commentaire">
                            <i class="fas fa-heart"></i><span>${displayLikes}</span>
                        </button>
                    </div>
                    <p class="comment-content">${comment.comment}</p>
                </div>`;
      })
      .join("");
  } else {
    dom.commentsList.innerHTML = `<p style="font-size: 0.9rem; color: var(--clr-text-sub);">Aucun commentaire.</p>`;
  }

  const hasPending = pendingComments.length > 0;
  dom.commentSendBtn.disabled = hasPending;
  dom.commentTextarea.readOnly = hasPending;
  if (hasPending) {
    dom.commentTextarea.value =
      "Un seul commentaire par chapitre est autorisé.";
    dom.commentTextarea.style.opacity = "0.7";
  } else {
    dom.commentTextarea.value = "";
    dom.commentTextarea.style.opacity = "1";
  }
}

/**
 * Génère le HTML pour les statistiques du chapitre actif dans la liste.
 * @returns {string} Le HTML des statistiques.
 */
function renderChapterStats() {
  const seriesSlug = slugify(state.seriesData.title);
  const chapterNumber = state.currentChapter.number;
  const interactionKey = `interactions_${seriesSlug}_${chapterNumber}`;
  const localState = getLocalInteractionState(interactionKey);
  const isLiked = !!localState.liked;

  let baseLikes = state.chapterStats.likes || 0;
  let displayLikes = isLiked ? baseLikes + 1 : baseLikes;

  const serverCommentCount = Array.isArray(state.chapterStats.comments)
    ? state.chapterStats.comments.length
    : 0;
  const pendingCommentCount = (localState.pendingComments || []).length;
  const displayComments = serverCommentCount + pendingCommentCount;

  return `
        <div class="chapter-stats-details">
            <span title="J'aime ce chapitre">
                <i class="fas fa-heart${isLiked ? " liked" : ""}"></i>
                <span class="chapter-likes-count${
                  isLiked ? " liked" : ""
                }">${displayLikes}</span>
            </span>
            <span title="Commentaires"><i class="fas fa-comment"></i> ${displayComments}</span>
            <span title="Date de sortie"><i class="fas fa-clock"></i> ${timeAgo(
              state.currentChapter.last_updated
            )}</span>
        </div>`;
}

/**
 * Gère la logique de like/unlike pour le chapitre actuel.
 * Cette fonction est appelée par le bouton global ET par le bouton dans la liste.
 */
export function handleGlobalLike() {
  const seriesSlug = slugify(state.seriesData.title);
  const chapterNumber = state.currentChapter.number;
  const interactionKey = `interactions_${seriesSlug}_${chapterNumber}`;
  let localState = getLocalInteractionState(interactionKey);
  const isLiked = !!localState.liked;

  // Mise à jour de l'état local
  localState.liked = !isLiked;
  setLocalInteractionState(interactionKey, localState);

  // Mise en file d'attente
  queueAction(seriesSlug, {
    type: !isLiked ? "like" : "unlike",
    chapter: chapterNumber,
  });

  // Mise à jour de TOUTE l'UI concernée
  updateGlobalLikeButton();
  updateChapterList(); // Re-render la liste pour mettre à jour les stats du chapitre actif
}

/**
 * Met à jour l'état visuel du bouton "J'aime" global.
 */
export function updateGlobalLikeButton() {
  const seriesSlug = slugify(state.seriesData.title);
  const chapterNumber = state.currentChapter.number;
  const interactionKey = `interactions_${seriesSlug}_${chapterNumber}`;
  const isLiked = !!getLocalInteractionState(interactionKey).liked;

  if (dom.toggleLikeBtn) {
    dom.toggleLikeBtn.classList.toggle("liked", isLiked);
  }
}
