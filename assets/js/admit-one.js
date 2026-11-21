const admitChapter = document.querySelector("[data-admit-one]");

if (admitChapter) {
  const ticketView = admitChapter.querySelector("#ticket-view");
  const ticketAction = admitChapter.querySelector("#take-ticket");
  const ticketActionLabel = ticketAction.querySelector("[data-ticket-label]");
  const cinemaRoom = admitChapter.querySelector("#cinema-room");
  const roomHeading = admitChapter.querySelector("#screening-heading");
  const returnTicket = admitChapter.querySelector("[data-return-ticket]");
  const screeningButtons = Array.from(admitChapter.querySelectorAll("[data-screening]"));
  const selectedIndex = admitChapter.querySelector("[data-selected-index]");
  const selectedTitle = admitChapter.querySelector("[data-selected-title]");
  const selectedCaption = admitChapter.querySelector("[data-selected-caption]");
  const screeningStatus = admitChapter.querySelector("[data-screening-status]");
  const video = admitChapter.querySelector(".admit-video");
  const screenSurface = admitChapter.querySelector(".screen-surface");
  const videoPlaceholder = admitChapter.querySelector("[data-video-placeholder]");
  const placeholderMessage = admitChapter.querySelector("[data-placeholder-message]");
  const placeholderPath = admitChapter.querySelector("[data-placeholder-path]");
  const playbackPositions = new Map();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let activeScreening = screeningButtons[0] || null;
  let hasAcceptedTicket = false;
  let sourceBeingLoaded = "";
  let videoLoadTimer = 0;

  const localServerMessage = (
    "Open this page through a local web server to check and play local video files."
  );

  const saveVideoPosition = () => {
    if (activeScreening && video.currentSrc) {
      playbackPositions.set(activeScreening.dataset.screeningId, video.currentTime);
    }
  };

  const clearVideoLoadTimer = () => {
    if (videoLoadTimer) {
      window.clearTimeout(videoLoadTimer);
      videoLoadTimer = 0;
    }
  };

  const showScreeningPlaceholder = (button, message) => {
    if (!video.paused) video.pause();
    video.hidden = true;
    screenSurface.style.aspectRatio = "16 / 9";
    videoPlaceholder.hidden = false;
    placeholderMessage.textContent = message;
    placeholderPath.textContent = button.dataset.videoSrc;
  };

  const selectScreening = (button, shouldLoad = true) => {
    if (!button) return;
    saveVideoPosition();
    activeScreening = button;
    screeningButtons.forEach((choice) => {
      choice.setAttribute("aria-pressed", String(choice === button));
    });
    selectedIndex.textContent = button.dataset.screeningId;
    selectedTitle.textContent = button.dataset.title;
    selectedCaption.textContent = button.dataset.caption;

    const availability = button.dataset.availability || "idle";
    if (availability !== "ready") {
      if (availability === "blocked") {
        showScreeningPlaceholder(button, localServerMessage);
        screeningStatus.textContent = localServerMessage;
        return;
      }
      if (!shouldLoad) {
        const message = "Choose a screening to check for its video.";
        showScreeningPlaceholder(button, message);
        screeningStatus.textContent = message;
        return;
      }
      if (window.location.protocol === "file:") {
        button.dataset.availability = "blocked";
        button.dataset.issue = localServerMessage;
        button.querySelector("[data-availability-label]").textContent = "LOCAL SERVER NEEDED";
        showScreeningPlaceholder(button, localServerMessage);
        screeningStatus.textContent = localServerMessage;
        return;
      }
      if (availability === "checking") {
        const message = "Checking for the video file...";
        showScreeningPlaceholder(button, message);
        screeningStatus.textContent = message;
        return;
      }

      const sourceUrl = new URL(button.dataset.videoSrc, document.baseURI).href;
      button.dataset.availability = "checking";
      button.querySelector("[data-availability-label]").textContent = "CHECKING FILE…";
      sourceBeingLoaded = sourceUrl;
      video.preload = "metadata";
      video.src = sourceUrl;
      video.load();
      const message = `Checking for ${button.dataset.videoSrc}...`;
      showScreeningPlaceholder(button, message);
      screeningStatus.textContent = message;
      clearVideoLoadTimer();
      videoLoadTimer = window.setTimeout(() => {
        if (sourceBeingLoaded !== sourceUrl || activeScreening !== button) return;
        button.dataset.availability = "error";
        button.dataset.issue = `The video didn't respond. Check ${button.dataset.videoSrc}.`;
        button.querySelector("[data-availability-label]").textContent = "CHECK VIDEO FILE";
        sourceBeingLoaded = "";
        showScreeningPlaceholder(button, button.dataset.issue);
        screeningStatus.textContent = button.dataset.issue;
      }, 12000);
      return;
    }

    const sourceUrl = new URL(button.dataset.videoSrc, document.baseURI).href;
    if (sourceBeingLoaded !== sourceUrl) {
      clearVideoLoadTimer();
      if (!video.paused) video.pause();
      sourceBeingLoaded = sourceUrl;
      video.src = sourceUrl;
      video.load();
    }

    video.setAttribute("aria-label", `${button.dataset.title}: ${button.dataset.caption}`);
    video.hidden = false;
    videoPlaceholder.hidden = true;
    screeningStatus.textContent = "Ready when you are. Press play to start this screening.";
  };

  ticketAction.addEventListener("click", () => {
    if (ticketAction.disabled) return;
    ticketAction.disabled = true;
    ticketActionLabel.textContent = hasAcceptedTicket ? "BACK TO THE SCREENING" : "YOUR SEAT IS WAITING";
    ticketAction.setAttribute("aria-expanded", "true");
    ticketView.classList.add("is-accepting");

    window.setTimeout(() => {
      hasAcceptedTicket = true;
      ticketView.hidden = true;
      ticketView.classList.remove("is-accepting");
      cinemaRoom.hidden = false;
      cinemaRoom.classList.add("is-entering");
      ticketActionLabel.textContent = "REVISIT THE SCREENING";
      ticketAction.disabled = false;
      roomHeading.focus();
      cinemaRoom.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      window.setTimeout(() => cinemaRoom.classList.remove("is-entering"), reducedMotion ? 0 : 600);
    }, reducedMotion ? 0 : 680);
  });

  returnTicket.addEventListener("click", () => {
    saveVideoPosition();
    if (!video.paused) video.pause();
    cinemaRoom.hidden = true;
    ticketView.hidden = false;
    ticketAction.setAttribute("aria-expanded", "false");
    ticketAction.focus();
  });

  screeningButtons.forEach((button) => {
    button.addEventListener("click", () => selectScreening(button));
  });

  video.addEventListener("timeupdate", saveVideoPosition);
  video.addEventListener("loadedmetadata", () => {
    if (!activeScreening || video.currentSrc !== sourceBeingLoaded) return;
    clearVideoLoadTimer();
    activeScreening.dataset.availability = "ready";
    activeScreening.querySelector("[data-availability-label]").textContent = "READY TO WATCH";
    const resumeAt = playbackPositions.get(activeScreening.dataset.screeningId);
    if (resumeAt > 0 && Number.isFinite(video.duration)) {
      video.currentTime = Math.min(resumeAt, video.duration);
    }
    screenSurface.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
    video.hidden = false;
    videoPlaceholder.hidden = true;
    screeningStatus.textContent = "Ready when you are. Press play to start this screening.";
  });
  video.addEventListener("error", () => {
    if (!activeScreening || !sourceBeingLoaded) return;
    const failedSource = sourceBeingLoaded;
    if (video.currentSrc && video.currentSrc !== failedSource) return;
    clearVideoLoadTimer();
    const isMissing = video.error && video.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED;
    activeScreening.dataset.availability = isMissing ? "missing" : "error";
    activeScreening.dataset.issue = isMissing
      ? `This video isn't here yet. Add ${activeScreening.dataset.videoSrc}.`
      : `This MP4 couldn't be played. Check ${activeScreening.dataset.videoSrc}.`;
    activeScreening.querySelector("[data-availability-label]").textContent = isMissing ? "FILE NOT ADDED" : "CHECK VIDEO FILE";
    sourceBeingLoaded = "";
    showScreeningPlaceholder(activeScreening, activeScreening.dataset.issue);
    screeningStatus.textContent = activeScreening.dataset.issue;
    if (!isMissing) console.error(`The video could not be played: ${activeScreening.dataset.videoSrc}`);
  });

  if (activeScreening) selectScreening(activeScreening, false);
}
