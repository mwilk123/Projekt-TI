var async = require('async');
var path = require('path');
var fs = require('fs');
var getDuration = require('get-video-duration');

// obsługa plików przesyłanych w formularzach
var multer  = require('multer')
var upload = multer({ dest: './uploads/' });

module.exports = function (app, db) {
  // routing obsługujący wyświetlanie biblioteki multimediów
  app.get('/library', function (req, res) {
    var files = db
      .get('files')
      // dla każdego pliku pobieramy grupy i klientów, do których jest przypisany
      .each(function (file) {
        file.clients = db
          .get('clients')
          .filter(function (client) {
            return client.files.indexOf(file.id) !== -1;
          })
          .map('name') //chcemy tylko imię klienta
          .value();
        
        file.groups = db
          .get('groups')
          .filter(function (group) {
            return group.files.indexOf(file.id) !== -1;
          })
          .map('name') //chcemy tylko nazwę grupy
          .value();
      })
      .value();

    res.render('library', {
      files: files,
    })
  });

  app.post('/upload', upload.any(), function (req, res) {
    // pliki są zapisywane przez multera bez rozszerzeń, dlatego trzeba zmienić ich nazwę na taką, która zawiera rozszerzenie
    async.mapSeries(req.files, function (file, done) {
      var ext = path.extname(file.originalname);
      var basename = path.basename(file.path);
      var destPath = path.join(file.destination, file.filename + ext);

      fs.rename(file.path, destPath, function (err) {
        var type = file.mimetype.startsWith('video') ? 'video' : 'image';

        var fileObject = {
          id: file.filename,
          filename: file.filename + ext,
          originalName: file.originalname,
          type: type,
          mime: file.mimetype,
        };

        if (type === 'video') {
          getDuration(destPath).then(function (duration) {
            fileObject.duration = Math.round(duration);

            return done(err, fileObject);
          })
        } else {
          return done(err, fileObject);
        }
      });
    }, function (err, uploadedFiles) {
      // zapisywanie informacji o załadowanych plikach do bazy danych
      uploadedFiles.forEach(function (file) {
        var filesInDb = db
        .get('files')
        .push(file)
        .value();
      })

      res.json();
    })
  })
}