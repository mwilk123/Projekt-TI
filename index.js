process.chdir(__dirname);

// biblioteka ułatwiająca dodawanie funkcji obsugujących żądania HTTP
var express = require('express')

// obsługa plików przesyłanych w formularzach
var multer  = require('multer')
var upload = multer({ dest: './uploads/' });

var path = require('path');
var fs = require('fs');
var async = require('async');

// middleware parsująvy przychodzące zapytania i wydobywający z nich dane
var bodyParser = require('body-parser')

// prosta implementacja bazy danych w formacie JSON. Dane są przechowywane w pliku db.json
var low = require('lowdb');
var db = low('db.json');

// tworzenie aplikacji i serwera HTTP
var app = express();
var server = require('http').createServer(app);

// serer WebSocket
var io = require('socket.io')(server);

// wydobywanie zawart
app.use(bodyParser.urlencoded({
  extended: false,
}))

// używamy silnika ejs do renderowania szablonów
app.set('view engine', 'ejs');

// funkcja ustawiająca początkowy stan bazy danych
function fixtures() {
  if (!db.has('clients').value()) {
    db.set('clients', []).value();
  }

  if (!db.has('groups').value()) {
    db.set('groups', []).value();
  }

  if (!db.has('files').value()) {
    db.set('files', []).value();
  }

  db
    .get('clients')
    .each(function (client) {
      client.connected = false;
    })
    .value();
}

fixtures();

// event odpalany kiedy klient łączy się z serverem przez WebSocket
io.on('connection', function(socket) {

  // event odpowiedzialny za rejestrację nowego klienta oraz zarządzanie statusem zarejestrowanych klientów
  socket.on('client-connect', function (data) {
    var clientName = data.name;

    var registeredClient = db
      .get('clients')
      .find({
        name: clientName,
      })
      .value();
      
    if (registeredClient) {
      // ustawianie statusu zarejestrowanego klienta
      db
        .get('clients')
        .find({
          name: clientName,
        })
        .assign({
          connected: true,
          socketId: socket.id,  // aktualne id socketa, przez którego łączy się klient
        })
        .value();
    } else {
      // rejestrowanie nowego klienta w bazie danych
      registeredClient = db
        .get('clients')
        .push({
          name: clientName,
          connected: true,
          socketId: socket.id, // aktualne id socketa, przez którego łączy się klient
          group: '',
          files: [],
        })
        .value()
    }

    // wysyła event, który powoduje odświerzenie się stausu klienta w przeglądarce
    io.emit('refresh-clients', {
      name: registeredClient.name,
      connected: true,
    });
  })

  socket.on('disconnect', function () {
    var registeredClient = db
      .get('clients')
      .find({
        socketId: socket.id,
      })
      .value();
    
    if (registeredClient) {
      db
        .get('clients')
        .find({
          socketId: socket.id,
        })
        .assign({
          connected: false,
        })
        .value();
      
      io.emit('refresh-clients', {
        name: registeredClient.name,
        connected: false,
      });
    }
  })
});

// serwowanie plikow statycznych
app.use('/public', express.static('public'));
app.use('/images', express.static('uploads'));

// routing główny, przekierowanie na stronę z klientami
app.get('/', function (req, res) {
  res.redirect('/clients');
});

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
})

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

app.get('/attach-files/:type(clients|groups)/:targetName([A-Za-z0-9-]{3,20})', function (req, res) {
  var files = db
    .get('files')
    // dla każdego pliku sprawdzamy, czy jest przypisany do grupy lub klienta (definiowane przez parametr w zapytaniu)
    .each(function (file) {
      file.attached = db
        .get(req.params.type) // pobieramy kolekcje określoną w parametrze (clients albo groups)
        .find(function (thing) {
          return thing.name == req.params.targetName && thing.files.indexOf(file.id) !== -1;
        })
        .value() != null;
    })
    .value();

  return res.render('attach-files', {
    files: files,
    type: req.params.type,
    typeName: req.params.type === 'clients' ? 'klient' : 'grupa',
    name: req.params.targetName
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

app.post('/attach-images', function (req, res) {
  var ids = req.body['ids[]'];

  if (!Array.isArray(ids)) {
    ids = [];
  }

  db
    .get(req.body.type)
    .find({
      name: req.body.name
    })
    .assign({
      files: ids,
    })
    .value();

  res.json({
    data: {
      message: 'Pomyślnie zaktualizowano dane o plikach.',
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

app.post('/upload', upload.any(), function (req, res) {
  // pliki są zapisywane przez multera bez rozszerzeń, dlatego trzeba zmienić ich nazwę na taką, która zawiera rozszerzenie
  async.mapSeries(req.files, function (file, done) {
    var ext = path.extname(file.originalname);
    var basename = path.basename(file.path);

    fs.rename(file.path, path.join(file.destination, file.filename + ext), function (err) {
      return done(err, {
        id: file.filename,
        filename: file.filename + ext,
        originalName: file.originalname,
      });
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

app.post('/user-images/:user', function (req, res) {
  var user = db
    .get('clients')
    .find({
      name: req.params.user,
    })
    .value();

  if (!user) {
    return res.status(500).json({
      error: 'Nie ma takiego uzytkownika.',
    });
  }

  var files = user.files;

  if (user.group) {
    var group = db
      .get('groups')
      .find({
        name: user.group,
      })
      .value()

    if (group) {
      files = files.concat(group.files);
    }
  }

  // filtrujemy tablicę pod kątem zawierania duplikatów
  files = files.filter(function(item, pos) {
    return files.indexOf(item) == pos;
  })

  var filenames = db
    .get('files')
    .filter(function (file) {
      return files.indexOf(file.id) !== -1;
    })
    .map('filename')
    .value();

  var imagesLinks = filenames.map(function (file) {
    return req.protocol + '://' + req.get('host') + '/images/' + file;
  });

  return res.json({
    images: imagesLinks,
  });
})

server.listen(3000, function () {
  console.log('Aplikacja nasłuchuje na porcie 3000!')
})