/**
 * Moduł obsługujący playlisty.
 */

module.exports = function (app, db) {
  // wyświetlanie strony z playlistami
  app.get('/playlists', function (req, res) {
    var playlists = db
      .get('playlists')
      .value();


    return res.render('playlists', {
      playlists: playlists,
    })
  });

  // wyświetlanie strony z edycją playlisty
  app.get('/edit-playlist/:name([A-Za-z0-9-]{3,20})', function (req, res) {
    var playlist = db
      .get('playlists')
      .find({
        name: req.params.name,
      })
      .value();


    return res.render('edit-playlist', {
      playlist: playlist
    })
  });

  // dodawanie playlisty
  app.post('/add-playlist', function (req, res) {
    // sprawdzanie, czy playlista istnieje
    var currentPlaylist = db
      .get('playlists')
      .find({
        name: req.body.name,
      })
      .value();
    
    // jeżeli tak, to nie dodajemy drugiej z taką samą nazwą
    if (currentPlaylist) {
      return res.send({
        error: 'Playlista już istnieje.'
      });
    }

    // dodawanie pustej playlisty do bazy
    db
      .get('playlists')
      .push({
        name: req.body.name,
        items: [],
      })
      .value();

    return res.send({
      data: {
        ok: true,
      }
    })
  })

  // edycja czasu trwania elementu playlisty
  app.post('/edit-item-duration', function (req, res) {
    // pobieranie playlisty
    var playlist = db.get('playlists')
      .find({
        name: req.body.playlistName,
      })
      .value()
    
    // wyszukiwanie elementu do zmodyfikowania
    var itemToEdit = playlist.items.find(function (item) {
      return item.id === req.body.id;
    });

    // modyfikowanie elementu
    itemToEdit.duration = req.body.duration;
    itemToEdit.displayDuration = req.body.displayDuration;

    // zapisywanie tablicy ze zmodyfikowanym elementem w obiekcie playlisty w bazie
    db.get('playlists')
      .find({
        name: req.body.playlistName,
      }).
      assign({
        items: playlist.items,
      })
      .value()
    
    return res.send();
  })

  // zmiana kolejności elementów playlisty
  app.post('/reorder-playlist-items', function (req, res) {
    var playlist = db.get('playlists')
      .find({
        name: req.body.playlistName,
      })
      .value()

    // sortowanie według porządku określonego przez tablicę z parametru zapytania
    var reorderedItems = req.body['order[]'].map(function (id) {
      return playlist.items.find(function (item) {
        return item.id === id;
      });
    });

    // zapisywanie posortowanej tablicy elementów
    db.get('playlists')
      .find({
        name: req.body.playlistName,
      }).
      assign({
        items: reorderedItems,
      })
      .value()

    return res.send();
  })

  // usuwanie elementu playlisty
  app.post('/remove-playlist-item', function (req, res) {
    var playlist = db.get('playlists')
      .find({
        name: req.body.playlistName,
      })
      .value()

    // tworzenie nowej tablicy elementów bez usuwanego elementu
    var newItems = playlist.items.filter(function (item) {
      return item.id !== req.body.id;
    });

    // zapisywanie nowej tablicy w obiekcie playlisty
    db.get('playlists')
      .find({
        name: req.body.playlistName,
      }).
      assign({
        items: newItems,
      })
      .value()

    return res.send({
      data: {
        ok: true,
      }
    });
  })
}
