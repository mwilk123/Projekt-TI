var uuid = require('../uuid');

module.exports = function (app, db) {
  app.get('/attach-files/:type(clients|groups|playlists)/:targetName([A-Za-z0-9-]{3,20})', function (req, res) {
    var files = db
      .get('files')
      // dla każdego pliku sprawdzamy, czy jest przypisany do grupy lub klienta (definiowane przez parametr w zapytaniu)
      .each(function (file) {
        file.attached = db
          .get(req.params.type) // pobieramy kolekcje określoną w parametrze (clients albo groups albo playlists)
          .find(function (thing) {
            if (req.params.type === 'playlists') {
              return false;
            } else {
              return thing.name == req.params.targetName && thing.files.indexOf(file.id) !== -1;
            }
          })
          .value() != null;
      })
      .value();

    var typeName;

    switch (req.params.type) {
      case 'groups':
        typeName = 'grupa';
        break;
      case 'clients':
        typeName = 'klient';
        break;
      case 'playlists':
        typeName = 'playlista'
        break;
    }

    return res.render('attach-files', {
      files: files,
      type: req.params.type,
      typeName: typeName,
      name: req.params.targetName,
      inputType: req.params.type === 'playlists' ? 'radio' : 'checkbox',
    })
  })

  app.post('/attach-images', function (req, res) {
    var ids = req.body['ids[]'];

    if (!Array.isArray(ids)) {
      ids = [];
    }

    if (req.body.type === 'playlists') {
      var file =  db
        .get('files')
        .find({
          id: req.body['ids[]'],
        })
        .value()
      
      var duration = 1;
      var displayDuration = '00:01';

      if (file.type === 'video') {
        duration = file.duration;
        displayDuration = Math.floor(duration / 60) + ':' + (duration % 60);
      }
      
      db
        .get(req.body.type)
        .find({
          name: req.body.name
        })
        .invoke('items.push', {
          id: uuid(),
          file: db
            .get('files')
            .find({
              id: req.body['ids[]'],
            })
            .value(),
          duration: duration,
          displayDuration: displayDuration,
        })
        .value();
    } else {
      db
        .get(req.body.type)
        .find({
          name: req.body.name
        })
        .assign({
          files: ids,
        })
        .value();
    }

    res.json({
      data: {
        message: 'Pomyślnie zaktualizowano dane o plikach.',
      }
    });
  })
}
