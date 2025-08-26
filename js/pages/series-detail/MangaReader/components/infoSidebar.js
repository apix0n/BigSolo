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

export function init() {
  console.log("[InfoSidebar] Initialisation.");
  render();
  attachEventListeners();
}

function render() {
  if (!dom.infoSidebar) return;
  const seriesSlug = slugify(state.seriesData.title);
  dom.infoSidebar.innerHTML = `
      <div class="sidebar-header mobile-only">
          <h4>Chapitres</h4>
          <button class="close-sidebar-btn" title="Fermer"><i class="fas fa-times"></i></button>
      </div>
      <div class="sidebar-content-wrapper">
          <div id="info-series-link-group" class="control-group">
              <a id="info-series-link" href="/${seriesSlug}">
                  <i class="fas fa-arrow-left"></i> ${state.seriesData.title}
              </a>
          </div>
          <div id="info-chapters-group" class="control-group">
              <h4 class="group-title desktop-only">Chapitres</h4>
              <div class="chapter-list-wrapper"><div class="chapter-list"><p>Chargement...</p></div></div>
          </div>
          <div id="info-comments-group" class="control-group desktop-only">
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

  dom.chapterList = qs(".chapter-list", dom.infoSidebar);
  dom.commentsList = qs("#comments-list", dom.infoSidebar);
  dom.commentTextarea = qs("#comment-textarea", dom.infoSidebar);
  dom.commentSendBtn = qs("#comment-send-btn", dom.infoSidebar);
}

function attachEventListeners() {
  if (dom.chapterList) {
    dom.chapterList.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (link) {
        e.preventDefault();
        const chapterId = link.dataset.chapterId;
        if (chapterId && chapterId !== state.currentChapter.number) {
          const seriesSlug = slugify(state.seriesData.title);
          window.location.href = `/${seriesSlug}/${chapterId}`;
        }
      }
      if (e.target.closest(".chapter-stats-details")) {
        handleGlobalLike();
      }
    });
  }
  if (dom.commentSendBtn) {
    dom.commentSendBtn.addEventListener("click", handleCommentSubmit);
  }
  if (dom.commentTextarea) {
    dom.commentTextarea.addEventListener("input", () => {
      dom.commentTextarea.style.height = "auto";
      const newHeight = Math.min(dom.commentTextarea.scrollHeight, 120);
      dom.commentTextarea.style.height = `${newHeight}px`;
    });
  }
  if (dom.commentsList) {
    dom.commentsList.addEventListener("click", handleCommentLike);
  }

  // - Debut correction
  const closeBtn = qs(".close-sidebar-btn", dom.infoSidebar);
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      // On déclenche un événement personnalisé que reader.js écoutera
      const event = new CustomEvent("close-sidebars");
      document.dispatchEvent(event);
    });
  }
  // - Fin correction
}

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

async function handleCommentSubmit(event) {
  const formContainer = event.target.closest(".add-comment-box");
  if (!formContainer) return;
  const textarea = formContainer.querySelector("textarea");

  const commentText = textarea.value.trim();
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
  state.chapterStats.comments.unshift(newComment);
  queueAction(seriesSlug, {
    type: "add_comment",
    chapter: chapterNumber,
    payload: newComment,
  });

  textarea.value = "";
  textarea.style.height = "auto";
  updateCommentsSection();
  updateChapterList();
  updateMobileBarStats();
}

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
  if (isLiked) {
    localState.likedComments = localState.likedComments.filter(
      (id) => id !== commentId
    );
  } else {
    localState.likedComments.push(commentId);
  }
  setLocalInteractionState(interactionKey, localState);
  queueAction(seriesSlug, {
    type: isLiked ? "unlike_comment" : "like_comment",
    chapter: chapterNumber,
    payload: { commentId },
  });
  updateCommentsSection();
}

export function updateCommentsSection() {
  // - Debut correction
  // Cible les deux conteneurs possibles
  const containers = qsa(
    "#comments-list, #comments-mobile-section .comments-list-wrapper"
  );
  // - Fin correction
  if (containers.length === 0) return;

  const seriesSlug = slugify(state.seriesData.title);
  const chapterNumber = state.currentChapter.number;
  const interactionKey = `interactions_${seriesSlug}_${chapterNumber}`;
  const localState = getLocalInteractionState(interactionKey);
  const likedComments = new Set(localState.likedComments || []);
  const pendingComments = localState.pendingComments || [];
  const serverComments = state.chapterStats.comments || [];
  const serverCommentIds = new Set(serverComments.map((c) => c.id));
  const allComments = [
    ...pendingComments.filter((pc) => !serverCommentIds.has(pc.id)),
    ...serverComments,
  ].sort((a, b) => b.timestamp - a.timestamp);

  let commentsHtml = "";
  if (allComments.length > 0) {
    commentsHtml = allComments
      .map((comment) => {
        const isLiked = likedComments.has(comment.id);
        const originalComment =
          serverComments.find((c) => c.id === comment.id) || comment;
        let baseLikes = originalComment.likes || 0;
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
    commentsHtml = `<p style="font-size: 0.9rem; color: var(--clr-text-sub);">Aucun commentaire.</p>`;
  }

  containers.forEach((container) => (container.innerHTML = commentsHtml));

  const hasPending = pendingComments.length > 0;
  qsa(".add-comment-box").forEach((form) => {
    const textarea = form.querySelector("textarea");
    const sendBtn = form.querySelector("button");
    if (textarea && sendBtn) {
      sendBtn.disabled = hasPending;
      textarea.readOnly = hasPending;
      if (hasPending) {
        textarea.value = "Un seul commentaire par chapitre est autorisé.";
        textarea.style.opacity = "0.7";
      } else if (document.activeElement !== textarea) {
        textarea.value = "";
        textarea.style.opacity = "1";
      }
    }
  });
}

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
            <span title="J'aime ce chapitre"><i class="fas fa-heart${
              isLiked ? " liked" : ""
            }"></i><span class="chapter-likes-count${
    isLiked ? " liked" : ""
  }">${displayLikes}</span></span>
            <span title="Commentaires"><i class="fas fa-comment"></i> ${displayComments}</span>
            <span title="Date de sortie"><i class="fas fa-clock"></i> ${timeAgo(
              state.currentChapter.last_updated
            )}</span>
        </div>`;
}

export function handleGlobalLike() {
  const seriesSlug = slugify(state.seriesData.title);
  const chapterNumber = state.currentChapter.number;
  const interactionKey = `interactions_${seriesSlug}_${chapterNumber}`;
  let localState = getLocalInteractionState(interactionKey);
  const isLiked = !!localState.liked;
  localState.liked = !isLiked;
  setLocalInteractionState(interactionKey, localState);
  queueAction(seriesSlug, {
    type: !isLiked ? "like" : "unlike",
    chapter: chapterNumber,
  });
  updateGlobalLikeButton();
  updateChapterList();
  updateMobileBarStats();
}

export function updateGlobalLikeButton() {
  const seriesSlug = slugify(state.seriesData.title);
  const chapterNumber = state.currentChapter.number;
  const interactionKey = `interactions_${seriesSlug}_${chapterNumber}`;
  const isLiked = !!getLocalInteractionState(interactionKey).liked;
  if (dom.toggleLikeBtn) dom.toggleLikeBtn.classList.toggle("liked", isLiked);
  if (dom.mobileLikeStat) dom.mobileLikeStat.classList.toggle("liked", isLiked);
}

export function updateMobileBarStats() {
  if (!dom.mobileLikesCount || !dom.mobileCommentsCount) return;
  const seriesSlug = slugify(state.seriesData.title);
  const chapterNumber = state.currentChapter.number;
  const interactionKey = `interactions_${seriesSlug}_${chapterNumber}`;
  const localState = getLocalInteractionState(interactionKey);
  const isLiked = !!localState.liked;
  let baseLikes = state.chapterStats.likes || 0;
  let displayLikes = isLiked ? baseLikes + 1 : baseLikes;
  dom.mobileLikesCount.textContent = displayLikes;
  const serverCommentCount = Array.isArray(state.chapterStats.comments)
    ? state.chapterStats.comments.length
    : 0;
  const pendingCommentCount = (localState.pendingComments || []).length;
  const displayComments = serverCommentCount + pendingCommentCount;
  dom.mobileCommentsCount.textContent = displayComments;
}

export function moveCommentsForMobile() {
  const commentsGroup = qs("#info-comments-group");
  if (commentsGroup) {
    const mobileContainer = document.createElement("section");
    mobileContainer.id = "comments-mobile-section";
    mobileContainer.innerHTML = `
            <div class="control-group">
                <h4 class="group-title">Commentaires</h4>
                <div class="add-comment-box">
                    <textarea placeholder="Ajouter un commentaire..." rows="1"></textarea>
                    <div class="add-comment-actions"><button class="send-btn">Envoyer <i class="fas fa-paper-plane"></i></button></div>
                </div>
                <div class="comments-list-wrapper"><p>Chargement des commentaires...</p></div>
            </div>`;

    qs(".reader-viewer").appendChild(mobileContainer);

    const newTextarea = mobileContainer.querySelector("textarea");
    const newSendBtn = mobileContainer.querySelector(".send-btn");
    const newCommentsList = mobileContainer.querySelector(
      ".comments-list-wrapper"
    );

    newSendBtn.addEventListener("click", handleCommentSubmit);
    newTextarea.addEventListener("input", () => {
      newTextarea.style.height = "auto";
      const newHeight = Math.min(newTextarea.scrollHeight, 120);
      newTextarea.style.height = `${newHeight}px`;
    });
    newCommentsList.addEventListener("click", handleCommentLike);
  }
}
