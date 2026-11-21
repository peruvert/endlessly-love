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

  if (player && source && status) {
    player.addEventListener("playing", () => {
      const selectedTrack = playlist.querySelector('.track-play[aria-pressed="true"]');
      if (selectedTrack) {
        status.textContent = `Now playing: ${selectedTrack.dataset.trackTitle} by ${selectedTrack.dataset.trackArtist}`;
      }
    });

    player.addEventListener("error", () => {
      status.textContent = "This track could not be loaded.";
    });

    trackButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const { trackSrc, trackTitle, trackArtist } = button.dataset;

        if (!trackSrc || !trackTitle || !trackArtist) {
          status.textContent = "This playlist track is missing its audio details.";
          console.error("Playlist track is missing required data.");
          return;
        }

        source.src = trackSrc;
        player.setAttribute("aria-label", `Audio player for ${trackTitle} by ${trackArtist}`);
        trackButtons.forEach((trackButton) => {
          trackButton.setAttribute("aria-pressed", String(trackButton === button));
        });
        status.textContent = `Loading ${trackTitle}...`;
        player.load();
        player.play().catch((error) => {
          status.textContent = `Could not play ${trackTitle}. Use the audio controls to retry.`;
          console.error("Playlist playback failed.", error);
        });
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
