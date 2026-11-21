const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".site-nav");

if (menuButton && navigation) {
  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isOpen));
    navigation.classList.toggle("is-open", !isOpen);
    menuButton.querySelector("span").textContent = isOpen ? "＋" : "－";
  });
}

document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});

const playlist = document.querySelector(".playlist");

if (playlist) {
  const player = playlist.querySelector(".player-slot audio");
  const source = player ? player.querySelector("source") : null;
  const status = playlist.querySelector(".playlist-status");
  const trackButtons = playlist.querySelectorAll(".track-play");
  const carousel = document.querySelector(".soundtrack-hero [data-carousel]");
  const carouselTitle = carousel ? carousel.querySelector("[data-carousel-title]") : null;
  const carouselArtist = carousel ? carousel.querySelector("[data-carousel-artist]") : null;
  const carouselState = carousel ? carousel.querySelector("[data-carousel-state]") : null;

  if (player && source && status) {
    const stateLabels = {
      ready: "READY",
      loading: "LOADING",
      playing: "PLAYING",
      paused: "PAUSED",
      buffering: "BUFFERING",
      ended: "FINISHED",
      error: "UNAVAILABLE"
    };
    const loadTimeoutMs = 8000;
    let activeTrack = null;
    let requestId = 0;
    let loadingTimer = 0;
    let hasPlayedCurrentTrack = false;
    let playbackRequested = false;
    let suppressPauseEvent = false;

    const setSvgLabel = (element, value, maxWidth) => {
      if (!element) return;
      element.textContent = value;
      if (value.length > 13) {
        element.setAttribute("textLength", String(maxWidth));
        element.setAttribute("lengthAdjust", "spacingAndGlyphs");
      } else {
        element.removeAttribute("textLength");
        element.removeAttribute("lengthAdjust");
      }
    };

    const resolveTrackSource = (trackSrc) => {
      if (!trackSrc) return null;
      try {
        return new URL(trackSrc, document.baseURI).href;
      } catch {
        return null;
      }
    };

    const getTrackForCurrentSource = () => {
      const currentSrc = player.currentSrc || source.src;
      if (!currentSrc) return null;
      return Array.from(trackButtons).find((button) => (
        resolveTrackSource(button.dataset.trackSrc) === currentSrc
      )) || null;
    };

    const setActiveTrack = (track) => {
      activeTrack = track;
      trackButtons.forEach((button) => {
        button.setAttribute("aria-pressed", String(button === track));
      });
      if (track) {
        player.setAttribute(
          "aria-label",
          `Audio player for ${track.dataset.trackTitle} by ${track.dataset.trackArtist}`
        );
      }
    };

    const updateCarousel = (state, track) => {
      status.dataset.state = state;
      if (carousel) {
        carousel.classList.toggle("is-playing", state === "playing" && Boolean(track));
        carousel.setAttribute(
          "aria-label",
          track
            ? `${stateLabels[state]}: ${track.dataset.trackTitle} by ${track.dataset.trackArtist}`
            : "A vintage suitcase record player with a miniature carousel above the vinyl. The player remains still while the carousel turns only during playback."
        );
      }

      setSvgLabel(carouselTitle, track ? track.dataset.trackTitle : "READY", 48);
      setSvgLabel(carouselArtist, track ? track.dataset.trackArtist : "SELECT A TRACK", 42);
      if (carouselState) carouselState.textContent = stateLabels[state];

      trackButtons.forEach((button) => {
        const row = button.closest(".track");
        if (row) row.classList.toggle("is-playing", state === "playing" && button === track);
      });
    };

    const clearLoadingTimer = () => {
      if (loadingTimer) {
        window.clearTimeout(loadingTimer);
        loadingTimer = 0;
      }
    };

    const getEventTrack = () => {
      const currentTrack = getTrackForCurrentSource() || activeTrack;
      if (currentTrack && currentTrack !== activeTrack) setActiveTrack(currentTrack);
      return currentTrack;
    };

    const failTrack = (track, message) => {
      clearLoadingTimer();
      playbackRequested = false;
      updateCarousel("error", track);
      status.textContent = message;
    };

    const mediaErrorMessage = (track) => {
      const title = track.dataset.trackTitle;
      const mediaError = player.error;
      if (!mediaError) return `Could not load ${title}. Select PLAY to retry.`;

      switch (mediaError.code) {
        case 1:
          return `Loading ${title} was interrupted. Select PLAY to retry.`;
        case 2:
          return `A network error interrupted ${title}. Check your connection and select PLAY to retry.`;
        case 3:
          return `The audio file for ${title} could not be decoded. Select PLAY to retry.`;
        case 4:
          return unavailableMessage(track);
        default:
          return `Could not load ${title}. Select PLAY to retry.`;
      }
    };

    const handleMediaError = () => {
      const track = getEventTrack();
      if (!track || !player.error) return;
      playbackRequested = false;
      if (player.error.code === 1) {
        clearLoadingTimer();
        updateCarousel("paused", track);
        status.textContent = mediaErrorMessage(track);
        return;
      }
      failTrack(track, mediaErrorMessage(track));
      console.error(`Audio failed for "${track.dataset.trackTitle}".`, player.error);
    };

    const unavailableMessage = (track) => (
      `The audio source for ${track.dataset.trackTitle} is unavailable. Check the file and select PLAY to retry.`
    );
    const localFileAudioMessage = (
      "Audio needs a local web server. Open this page with VS Code Live Server or another local server, not directly as a file."
    );

    const startLoadingTimer = (track, request) => {
      clearLoadingTimer();
      loadingTimer = window.setTimeout(() => {
        loadingTimer = 0;
        if (
          request !== requestId
          || activeTrack !== track
          || player.error
          || hasPlayedCurrentTrack
        ) return;

        if (!player.paused) {
          suppressPauseEvent = true;
          player.pause();
        }
        const message = player.networkState === HTMLMediaElement.NETWORK_NO_SOURCE
          ? unavailableMessage(track)
          : `${track.dataset.trackTitle} is taking too long to load. Check your connection and select PLAY to retry.`;
        failTrack(track, message);
      }, loadTimeoutMs);
    };

    const handlePlayFailure = (error, track, request) => {
      if (request !== requestId || activeTrack !== track) return;
      if (error.name === "AbortError") {
        if (status.dataset.state === "error") return;
        if (player.paused && !playbackRequested) {
          clearLoadingTimer();
          updateCarousel("paused", track);
          status.textContent = `Paused: ${track.dataset.trackTitle} by ${track.dataset.trackArtist}`;
        }
        return;
      }
      if (player.error) return;

      clearLoadingTimer();
      if (error.name === "NotAllowedError") {
        updateCarousel("paused", track);
        status.textContent = `Playback was blocked for ${track.dataset.trackTitle}. Use the audio controls to retry.`;
        return;
      }
      const message = error.name === "NotSupportedError"
        ? `The audio file for ${track.dataset.trackTitle} is unavailable or unsupported.`
        : `Could not start ${track.dataset.trackTitle}. Check your connection and select PLAY to retry.`;
      failTrack(track, message);
      console.error(`Audio playback failed for "${track.dataset.trackTitle}".`, error);
    };

    updateCarousel("ready", null);

    player.addEventListener("loadstart", () => {
      if (!playbackRequested) return;
      const track = getEventTrack();
      if (!track) return;
      if (!loadingTimer) startLoadingTimer(track, requestId);
      if (!hasPlayedCurrentTrack) {
        updateCarousel("loading", track);
        status.textContent = `Loading ${track.dataset.trackTitle}...`;
      }
    });

    player.addEventListener("play", () => {
      if (window.location.protocol === "file:") {
        const track = getEventTrack();
        playbackRequested = false;
        clearLoadingTimer();
        if (!player.paused) {
          suppressPauseEvent = true;
          player.pause();
        }
        if (track) {
          updateCarousel("error", track);
          status.textContent = localFileAudioMessage;
        }
        return;
      }
      playbackRequested = true;
      const track = getEventTrack();
      if (!track) return;
      if (!loadingTimer) startLoadingTimer(track, requestId);
      if (!hasPlayedCurrentTrack) {
        updateCarousel("loading", track);
        status.textContent = `Loading ${track.dataset.trackTitle}...`;
      }
    });

    player.addEventListener("loadedmetadata", () => {
      if (!playbackRequested) return;
      const track = getEventTrack();
      if (track && !hasPlayedCurrentTrack && !player.paused) {
        updateCarousel("loading", track);
      }
    });

    player.addEventListener("canplay", () => {
      if (!playbackRequested) return;
      const track = getEventTrack();
      if (track && player.paused && !hasPlayedCurrentTrack) {
        clearLoadingTimer();
        updateCarousel("ready", track);
        status.textContent = `Ready: ${track.dataset.trackTitle}. Press play to start.`;
      }
    });

    player.addEventListener("waiting", () => {
      const track = getEventTrack();
      if (!track || player.paused) return;
      const state = hasPlayedCurrentTrack ? "buffering" : "loading";
      updateCarousel(state, track);
      status.textContent = state === "loading"
        ? `Loading ${track.dataset.trackTitle}...`
        : `Buffering ${track.dataset.trackTitle}...`;
    });

    player.addEventListener("stalled", () => {
      const track = getEventTrack();
      if (!track || player.paused) return;
      const state = hasPlayedCurrentTrack ? "buffering" : "loading";
      updateCarousel(state, track);
      status.textContent = state === "loading"
        ? `Loading ${track.dataset.trackTitle}...`
        : `Buffering ${track.dataset.trackTitle}...`;
    });

    player.addEventListener("playing", () => {
      const currentTrack = getEventTrack();
      if (currentTrack) {
        hasPlayedCurrentTrack = true;
        clearLoadingTimer();
        updateCarousel("playing", currentTrack);
        status.textContent = `Now playing: ${currentTrack.dataset.trackTitle} by ${currentTrack.dataset.trackArtist}`;
      } else {
        updateCarousel("ready", null);
      }
    });

    player.addEventListener("pause", () => {
      if (suppressPauseEvent) {
        suppressPauseEvent = false;
        return;
      }
      if (player.ended) return;
      const wasPlaybackRequested = playbackRequested;
      playbackRequested = false;
      clearLoadingTimer();
      const currentTrack = getEventTrack();
      if (!currentTrack) {
        updateCarousel("ready", null);
        return;
      }
      if (
        wasPlaybackRequested
        && !hasPlayedCurrentTrack
        && player.networkState === HTMLMediaElement.NETWORK_NO_SOURCE
      ) {
        failTrack(currentTrack, unavailableMessage(currentTrack));
        console.error(`Audio source unavailable for "${currentTrack.dataset.trackTitle}".`);
        return;
      }
      updateCarousel("paused", currentTrack);
      status.textContent = `Paused: ${currentTrack.dataset.trackTitle} by ${currentTrack.dataset.trackArtist}`;
    });

    player.addEventListener("ended", () => {
      clearLoadingTimer();
      hasPlayedCurrentTrack = false;
      playbackRequested = false;
      const currentTrack = getEventTrack();
      if (currentTrack) {
        updateCarousel("ended", currentTrack);
        status.textContent = `Finished: ${currentTrack.dataset.trackTitle} by ${currentTrack.dataset.trackArtist}`;
      }
    });

    player.addEventListener("error", handleMediaError);

    trackButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const { trackSrc, trackTitle, trackArtist } = button.dataset;

        if (!trackSrc || !trackTitle || !trackArtist) {
          const title = trackTitle || "This track";
          ++requestId;
          clearLoadingTimer();
          if (!player.paused) {
            suppressPauseEvent = true;
            player.pause();
          }
          hasPlayedCurrentTrack = false;
          playbackRequested = false;
          setActiveTrack(button);
          source.removeAttribute("src");
          player.load();
          failTrack(button, `${title} has no valid audio source.`);
          console.error(`Playlist track "${title}" is missing audio details.`);
          return;
        }

        const trackUrl = resolveTrackSource(trackSrc);
        if (!trackUrl) {
          ++requestId;
          clearLoadingTimer();
          if (!player.paused) {
            suppressPauseEvent = true;
            player.pause();
          }
          hasPlayedCurrentTrack = false;
          playbackRequested = false;
          setActiveTrack(button);
          source.removeAttribute("src");
          player.load();
          failTrack(button, `The audio source for ${trackTitle} is invalid.`);
          console.error(`Playlist track "${trackTitle}" has an invalid audio URL.`);
          return;
        }

        if (window.location.protocol === "file:") {
          ++requestId;
          clearLoadingTimer();
          if (!player.paused) {
            suppressPauseEvent = true;
            player.pause();
          }
          hasPlayedCurrentTrack = false;
          playbackRequested = false;
          setActiveTrack(button);
          updateCarousel("error", button);
          status.textContent = localFileAudioMessage;
          return;
        }

        const currentUrl = player.currentSrc || source.src;
        const sourceChanged = trackUrl !== currentUrl;
        const retryingFailedSource = Boolean(player.error);
        if (!sourceChanged && !retryingFailedSource && activeTrack === button && !player.paused) return;

        const request = ++requestId;
        clearLoadingTimer();
        setActiveTrack(button);
        playbackRequested = true;
        updateCarousel("loading", button);
        status.textContent = `Loading ${trackTitle}...`;

        if (sourceChanged || retryingFailedSource) {
          if (!player.paused) {
            suppressPauseEvent = true;
            player.pause();
          }
          if (player.readyState > 0) player.currentTime = 0;
          source.src = trackUrl;
          hasPlayedCurrentTrack = false;
          player.load();
        } else if (player.ended) {
          player.currentTime = 0;
          hasPlayedCurrentTrack = false;
        }

        startLoadingTimer(button, request);
        try {
          const playRequest = player.play();
          if (playRequest && typeof playRequest.catch === "function") {
            playRequest.catch((error) => handlePlayFailure(error, button, request));
          }
        } catch (error) {
          handlePlayFailure(error, button, request);
        }
      });
    });
  }
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealTargets = document.querySelectorAll("main > section, main > article");

if (!prefersReducedMotion && "IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in-view");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealTargets.forEach((target) => {
    target.classList.add("reveal");
    revealObserver.observe(target);
  });
  document.body.classList.add("motion-ready");
}

// Local photographs: if a matching file exists, it replaces the styled placeholder.
document.querySelectorAll("[data-image]").forEach((frame) => {
  const filename = frame.dataset.image;
  const image = new Image();
  image.src = `assets/images/${filename}`;
  image.onload = () => {
    frame.classList.add("has-image");
    frame.style.backgroundImage = `url("${image.src}")`;
    const hint = frame.querySelector(".photo-help");
    if (hint) hint.remove();
  };
});

const lightbox = document.querySelector("#photo-lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxCaption = document.querySelector("#lightbox-caption");
const lightboxPlaceholder = document.querySelector("#lightbox-placeholder");

if (lightbox && lightboxImage && lightboxCaption && lightboxPlaceholder) {
  document.querySelectorAll(".photo-open").forEach((button) => {
    button.addEventListener("click", () => {
      const frame = button.querySelector("[data-image]");
      if (!frame) return;

      const filename = frame.dataset.image;
      const figure = button.closest("figure");
      const caption = figure ? figure.querySelector("figcaption") : null;
      lightboxCaption.textContent = caption ? caption.textContent.trim().replace(/\s+/g, " ") : "";
      const photoLabel = button.getAttribute("aria-label");
      lightboxImage.alt = photoLabel ? photoLabel.replace(/^View photo:\s*/, "") : filename;
      lightboxImage.hidden = !frame.classList.contains("has-image");
      lightboxPlaceholder.hidden = frame.classList.contains("has-image");
      lightboxPlaceholder.textContent = `Photo not added yet: ${filename}`;

      if (frame.classList.contains("has-image")) {
        lightboxImage.src = `assets/images/${filename}`;
      } else {
        lightboxImage.removeAttribute("src");
      }

      if (typeof lightbox.showModal === "function") {
        lightbox.showModal();
      } else {
        lightbox.setAttribute("open", "");
      }
    });
  });

  const closeLightbox = () => {
    if (typeof lightbox.close === "function") {
      lightbox.close();
    } else {
      lightbox.removeAttribute("open");
    }
  };

  const closeButton = lightbox.querySelector(".lightbox-close");
  if (closeButton) closeButton.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
}

// Gift reveal: box opens, then a flower blooms and the note appears.
const giftButton = document.querySelector("#open-gift");
const giftBox = document.querySelector("#gift-box");
const flowerReveal = document.querySelector("#flower-reveal");

if (giftButton && giftBox && flowerReveal) {
  giftButton.addEventListener("click", () => {
    if (giftButton.disabled) return;
    giftButton.disabled = true;
    giftBox.classList.add("is-opening");
    giftButton.setAttribute("aria-expanded", "true");
    giftButton.textContent = "just a second...";
    window.setTimeout(() => {
      flowerReveal.hidden = false;
      flowerReveal.classList.add("is-visible");
      const bloom = flowerReveal.querySelector(".bloom");
      if (bloom) bloom.classList.add("is-blooming");
      giftButton.textContent = "A little something for you";
      giftButton.classList.add("is-done");
    }, prefersReducedMotion ? 30 : 700);
  });
}
