process.chdir(__dirname);

// biblioteka ułatwiająca dodawanie funkcji obsugujących żądania HTTP
var express = require('express')

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

  if (!db.has('playlists').value()) {
    db.set('playlists', []).value();
  }

  if (!db.has('campaigns').value()) {
    db.set('campaigns', []).value();
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

// inicjalizacja modułów
require('./modules/clients.js')(app, db, io);
require('./modules/groups.js')(app, db);
require('./modules/attachFiles.js')(app, db);
require('./modules/playlists.js')(app, db);
require('./modules/library.js')(app, db);
require('./modules/campaigns')(app, db);

// routing główny, przekierowanie na stronę z klientami
app.get('/', function (req, res) {
  res.redirect('/clients');
});

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

// start serwera
server.listen(3000, function () {
  console.log('Aplikacja nasłuchuje na porcie 3000!')
})
