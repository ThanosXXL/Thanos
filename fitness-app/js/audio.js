// Kapselt die Wiedergabe der Hintergrundmusik je Musikrichtung.
window.FitSparkAudio = (function () {
  const player = new Audio();
  player.loop = true;
  player.volume = 0.5;

  let currentGenre = null;
  let playing = false;

  function genreById(id) {
    return window.FITSPARK_DATA.MUSIC_GENRES.find((g) => g.id === id);
  }

  function setGenre(id, keepPlaying) {
    const genre = genreById(id);
    if (!genre) return;
    currentGenre = id;
    const shouldPlay = keepPlaying && playing;
    player.src = genre.src;
    if (shouldPlay) {
      player.play().catch(() => {});
      playing = true;
    }
  }

  function play() {
    if (!currentGenre) setGenre(window.FITSPARK_DATA.MUSIC_GENRES[0].id, false);
    player.play().catch(() => {});
    playing = true;
  }

  function pause() {
    player.pause();
    playing = false;
  }

  function toggle() {
    if (playing) pause();
    else play();
    return playing;
  }

  function isPlaying() {
    return playing;
  }

  function getGenre() {
    return currentGenre;
  }

  return { setGenre, play, pause, toggle, isPlaying, getGenre };
})();
