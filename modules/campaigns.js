/**
 * Moduł obsługujący działania na kampaniach.
 */

var moment = require('moment'); // biblioteka do łatwiejszego operowania datami
var uuid = require('../uuid'); // generator unikalnych identyfikatorów

module.exports = function (app, db) {
  // wyświetlanie strony kampanii z widokiem kalendarza
  app.get('/campaigns', function (req, res) {
    var playlists = db
      .get('playlists')
      .value();

    var clients = db
      .get('clients')
      .value();
    
    var groups = db
      .get('groups')
      .value();


    return res.render('campaigns', {
      playlists: playlists,
      clients: clients,
      groups: groups,
    })
  });

  // kod odpowiedzialny za dodawanie nowej kampanii
  app.post('/add-campaign', function (req, res) {
    var campaign = Object.assign({}, req.body, {
      id: uuid(), // generowanie id dla kampanii
    })

    // dodawanie kampanii do bazy
    db
      .get('campaigns')
      .push(campaign)
      .value();

    return res.send();
  });

  // kod odpowiedzialny za usuwanie kampanii
  app.post('/remove-campaign', function (req, res) {
    // usuwanie kampani z bazy. Dopasowanie na podstawie ID
    db
      .get('campaigns')
      .remove({
        id: req.body.id,
      })
      .value();

    return res.send();
  });

  // kod zwracający eventy (kampanie), które mają być wyświetlone w kalendarzu na stronie
  app.get('/campaigns/feed', function (req, res) {
    var campaigns = db
      .get('campaigns')
      .cloneDeep()
      .value();

    // mapowanie kampani z bazy na format eventów w kalendarzu i zwracanie odpowiedzi
    return res.json(campaigns.map(function (campaign) {
      // towrzenie tytułu kampanie (nazwa + informacje o playliście i kliencie)
      var titleProps = [];

      if (campaign.type === 'client') {
        titleProps.push('klient: ' + campaign.client);
      } else {
        titleProps.push('grupa: ' + campaign.group);
      }

      titleProps.push('playlista: ' + campaign.playlist);

      var title = campaign.name + ' (' + titleProps.join(', ') +  ')'

      return {
        id: campaign.id,
        title: title,
        start: campaign.start,
        end: moment(campaign.end).add(1, 'days').format('YYYY-MM-DD'), // trzeba dodać jeden dzień, żeby kalendarz poprawnie wyświetlał. Taki mały hack
      };
    }))
  })

  /*
   * Pobieranie informacji o aktualnej kampanii dla danego klienta. Wykorzystywane przez końcówki.
   * Zwracany jest obiekt, zawierający opis aktualnej kampanii oraz elementy playlisty do niej przypisanej.
   */
  app.post('/get-campaign/:client', function (req, res) {
    if (!req.params.client) {
      return res.send({
        error: 'Klient niezdefiniowany.',
      });
    }

    var client = db
      .get('clients')
      .find({
        name: req.params.client,
      })
      .value();
    
    if (!client) {
      return res.send({
        error: 'Brak klienta w bazie.',
      });
    }

    var campaigns = db
      .get('campaigns')
      .cloneDeep()
      .value();
    
    var now = moment();

    var currentCampaign = campaigns
      // mapowanie formatów dat z bazy (ciągów) na obiekty moment
      .map(function (campaign) {
        return Object.assign(campaign, {
          start: moment(campaign.start).startOf('day'),
          end: moment(campaign.end).endOf('day'),
        });
      })
      // wyszukiwanie odpowiedniej kampani. Musi zgadać się przedział dat oraz klient (bądź grupa)
      .find(function (campaign) {
        return (
          now.isAfter(campaign.start) &&
          now.isBefore(campaign.end) && 
          (
            campaign.type === 'client' && campaign.client === client.name ||
            campaign.type === 'group' && campaign.group === client.group
          )
        );
      });

    // jeżeli nie ma akurat kampanii dla danego klienta, do zwracamy odpowiednią odpowiedź
    if (!currentCampaign) {
      return res.json({
        data: {
          found: false,
        }
      });
    }

    // pobieranie playlisty dla kampanii
    var playlist = db
      .get('playlists')
      .find({
        name: currentCampaign.playlist,
      })
      .value();

    return res.json({
      data: {
        found: true,
        campaign: {
          name: currentCampaign.name,
          start: currentCampaign.start.format('DD-MM-YYYY'),
          end: currentCampaign.end.format('DD-MM-YYYY')
        },
        playlist: {
          name: playlist.name,
          // mapowanie elemetów playlisty na URLe, które umożliwią dostęp do obrazków i filmów
          items: playlist.items.map(function (item) {
            return {
              type: (item.file.type === 'video') ? 'video' : 'image',
              duration: (item.file.type === 'video') ? item.file.duration : parseInt(item.duration, 10),
              url: 'http://ti.tambou.pl:3000/images/' + item.file.filename,
            }
          })
        }
      }
    })
  });
}
