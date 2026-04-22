// CONTAINER: VIMEO PLAYER

function initVimeoPlayer() {
  var players = nextPage.querySelectorAll('[data-vimeo-player-init]');
  if (!players.length) return;

  var signal = containerAbort.signal;

  players.forEach(function(vimeoElement, index) {
    var vimeoVideoID = vimeoElement.getAttribute('data-vimeo-video-id');
    if (!vimeoVideoID) return;

    var vimeoVideoHash = vimeoElement.getAttribute('data-vimeo-video-hash');
    var hashParam = vimeoVideoHash ? '&h=' + vimeoVideoHash : '';

    // Auto-fetch thumbnail from Vimeo oEmbed (skipped if src is already set)
    var placeholder = vimeoElement.querySelector('.vimeo-player__placeholder');
    if (placeholder && !placeholder.getAttribute('src')) {
      var vimeoPageURL = 'https://vimeo.com/' + vimeoVideoID + (vimeoVideoHash ? '/' + vimeoVideoHash : '');
      var oembedURL = 'https://vimeo.com/api/oembed.json?url=' + encodeURIComponent(vimeoPageURL) + '&width=1280';
      fetch(oembedURL, { signal: signal })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(data) {
          if (data && data.thumbnail_url) placeholder.src = data.thumbnail_url;
        })
        .catch(function() {});
    }

    var vimeoVideoURL = 'https://player.vimeo.com/video/' + vimeoVideoID + '?api=1&background=1&autoplay=0&loop=0&muted=1' + hashParam;
    var iframe = vimeoElement.querySelector('iframe');
    if (iframe) iframe.setAttribute('src', vimeoVideoURL);

    var videoIndexID = 'vimeo-player-index-' + index;
    vimeoElement.setAttribute('id', videoIndexID);

    var player = new Vimeo.Player(videoIndexID);

    // Cover-fit iframe — scale to fill box, cropping edges as needed
    if (vimeoElement.getAttribute('data-vimeo-update-size') === 'true') {
      var videoAspectRatio;

      function adjustVideoSizing() {
        if (!videoAspectRatio) return;
        var iframeEl = vimeoElement.querySelector('.vimeo-player__iframe');
        if (!iframeEl) return;
        var containerW = vimeoElement.offsetWidth;
        var containerH = vimeoElement.offsetHeight;
        if (!containerW || !containerH) return;
        var containerRatio = containerH / containerW;
        if (containerRatio > videoAspectRatio) {
          iframeEl.style.width = (containerRatio / videoAspectRatio * 100) + '%';
          iframeEl.style.height = '100%';
        } else {
          iframeEl.style.width = '100%';
          iframeEl.style.height = (videoAspectRatio / containerRatio * 100) + '%';
        }
      }

      player.getVideoWidth().then(function(width) {
        player.getVideoHeight().then(function(height) {
          videoAspectRatio = height / width;
          adjustVideoSizing();
        });
      });

      window.addEventListener('resize', adjustVideoSizing, { signal: signal });
    }

    player.on('play', function() {
      vimeoElement.setAttribute('data-vimeo-loaded', 'true');
      vimeoElement.setAttribute('data-vimeo-playing', 'true');
    });

    player.on('pause', function() {
      vimeoElement.setAttribute('data-vimeo-playing', 'false');
    });

    function vimeoPlayerPlay() {
      vimeoElement.setAttribute('data-vimeo-activated', 'true');
      vimeoElement.setAttribute('data-vimeo-playing', 'true');
      player.play();
    }

    function vimeoPlayerPause() {
      player.pause();
    }

    // Click: Play
    var playBtn = vimeoElement.querySelector('[data-vimeo-control="play"]');
    if (playBtn) {
      playBtn.addEventListener('click', function() {
        player.setVolume(0);
        vimeoPlayerPlay();
        if (vimeoElement.getAttribute('data-vimeo-muted') !== 'true') {
          player.setVolume(1);
        }
      }, { signal: signal });
    }

    // Click: Pause
    var pauseBtn = vimeoElement.querySelector('[data-vimeo-control="pause"]');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', vimeoPlayerPause, { signal: signal });
    }

    // Click: Mute toggle
    var muteBtn = vimeoElement.querySelector('[data-vimeo-control="mute"]');
    if (muteBtn) {
      muteBtn.addEventListener('click', function() {
        if (vimeoElement.getAttribute('data-vimeo-muted') === 'false') {
          player.setVolume(0);
          vimeoElement.setAttribute('data-vimeo-muted', 'true');
        } else {
          player.setVolume(1);
          vimeoElement.setAttribute('data-vimeo-muted', 'false');
        }
      }, { signal: signal });
    }

    // End → reset to placeholder
    player.on('ended', function() {
      vimeoElement.setAttribute('data-vimeo-activated', 'false');
      vimeoElement.setAttribute('data-vimeo-playing', 'false');
      player.unload();
    });
  });
}
