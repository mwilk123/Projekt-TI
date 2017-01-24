module.exports = function (app, db, io) {
  app.get('/clients', function (req, res) {
    // pobieramy klientów
    var clients = db
      .get('clients')
      // dla każdego klienta pobieramy nazwy plików, które są do niego przypisane
      .each(function (client) {
        client.filenames = db
          .get('files')
          .filter(function (file) {
            return client.files.indexOf(file.id) !== -1;
          })
          .map(function (file) {
            return file.filename;
          })
          .value();
      })
      .value();
    
    // pobieramy grupy, które zostaną wyświetlone na liście przy każdym kliencie, co umożliwi przypisanie klienta do grupy
    var groups = db
      .get('groups')
      .value();

    res.render('clients', {
      clients: clients,
      groups: groups
    })
  })

  app.post('/change-client-group', function (req, res) {
    db
      .get('clients')
      .find({
        name: req.body.client,
      })
      .assign({
        group: req.body.group,
      })
      .value();

    return res.json({
      data: {
        message: 'Groupa została przypisana.'
      }
    });
  })

  app.post('/sync-clients', function (req, res) {
    // wysłanie polecenia synchronizacji do wszystkich połączonych kilentów
    io.emit('sync');

    return res.json({
      data: {
        message: 'Wysałno prośbę o zsynchronizowanie.'
      }
    });
  })
}
