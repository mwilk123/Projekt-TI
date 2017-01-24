module.exports = function (app, db) {
  app.get('/groups', function (req, res) {
    var groups = db
      .get('groups')
      .each(function (group) {
        // dla każdej grupy pobieramy listę użytkowników, którzy do niej należą
        group.clients = db
          .get('clients')
          .filter({
            group: group.name,
          })
          .map('name') // interesuje nas tylko imię użytkownika
          .value();
        
        group.filenames = db
          .get('files')
          .filter(function (file) {
            return group.files.indexOf(file.id) !== -1;
          })
          .map(function (file) {
            return file.filename;
          })
          .value();
      })
      .value();

    return res.render('groups', {
      groups: groups,
      // clients: clients,
    })
  })

  app.post('/add-group', function (req, res) {
    var groupName = req.body.name;

    var existingGroup = db
      .get('groups')
      .find({
        name: groupName,
      })
      .value();

    if (existingGroup) {
      return res.json({
        error: {
          message: 'Grupa o tej nazwie już istnieje.'
        }
      });
    }

    db
      .get('groups')
      .push({
        name: groupName,
        files: [],
      })
      .value();

    return res.json({
      data: {
        message: 'Grupa została dodane.',
      }
    });
  });
}
