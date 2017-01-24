$(document).ready(function () {
  // dodawanie nowej playlistyu po kliknięciu w guzik
  $('.func-add-playlist').on('click', function () {
    var playlistName = prompt('Podaj nazwę playlisty (znaki alfanumeryczne i "-", max. 20 znaków):');

    if (!playlistName || !/[A-Za-z0-9-]{3,20}/.test(playlistName)) {
      return alert('Nazwa jest niepoprawna.');
    }

    $.post('/add-playlist', {
      name: playlistName,
    }).then(function (res) {
      if (res.error) {
        alert(res.error);

        return;
      }

      location.reload();
    })
  });
})
