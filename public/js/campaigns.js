$(document).ready(function () {
  // resetowanie formularza w oknie
  function resetForm(form) {
    $('.group-select').hide();
    $('.client-select').show();

    $('input:text').val('');
    $('input:radio').prop('checked', false);
    $('input:radio[value=client]').prop('checked', true);
  }

  // zmiana listy klientów/grup w zależności od wybranego typu
  $('input:radio').on('change', function () {
    var type = $('input:radio:checked').val();

    if (type === 'client') {
      $('.group-select').hide();
      $('.client-select').show();
    } else {
      $('.client-select').hide();
      $('.group-select').show();
    }
  })

  // inicjalizacja widoku kalendarza
  $('.campaigns-view').fullCalendar({
    height: 600,
    locale: 'pl', // język kalendarza
    header: {
      left: 'prev,next today',
      center: 'title',
      right: 'month,agendaWeek,agendaDay,listWeek'
    },
    selectable: true, // możliwość wybierania zakresów dat aby utworzyć kampanie
    allDayDefault: true, // kampanie są domyslnie całodniowe
    events: '/campaigns/feed', // ten URL będzie używany do pobrania informacji o kampaniach. Jest obsłużony na serwerze
    // kliknięcie na kampanię powoduje jej usunięcie
    eventClick: function (event) {
      if (!confirm('Czy na pewno chcesz usunąć tę kampanię?')) {
        return;
      }

      $.post('/remove-campaign', {
        id: event.id,
      }).then(function () {
        $('.campaigns-view').fullCalendar('refetchEvents'); // po usunięciu kampanii kalendarz musi zaktualiować dane
      })
    },
    // wybranie przedziału dat powoduje pokazanie się okna z formularzem do dodania nowej kampanii
    select: function (start, end) {
      end.subtract(1, 'minutes');
      
      $('.modal-card-title').text('Dodawanie kampanii (' + start.format('DD/MM/YYYY') + ' - ' + end.format('DD/MM/YYYY') + ')');
      
      // wypełnienie pól początek i koniec w formularzy wybranymi datami
      $('input[name=start]').val(start.format('YYYY-MM-DD'))
      $('input[name=end]').val(end.format('YYYY-MM-DD'))
      
      $('.modal').addClass('is-active');
    }
  });

  // czyszczenie fomrularza po zamknięciu okan
  $('.cancel').on('click', function () {
    $('.modal').removeClass('is-active');
    resetForm($('form'));
  })

  // dodawanie nowej kampanii
  $('form').on('submit', function (e) {
    e.preventDefault(); // domyślne zachowanie jest wstrzymane, zamiast tego będzie wysłane osobne zapytanie POST

    var campaignName = $('input:text').val();

    if (!campaignName) {
      alert('Nazwa kampanii nie może być pusta.');

      return;
    }

    // pobieranie danych o kampanii z formularza
    var data = $('form').serializeObject();

    // wysyłanie zapytania tworzącego nową kampanię
    $.post('/add-campaign', data).then(function () {
      $('.modal').removeClass('is-active'); // po sukcecie zamykamy okno z formularzem...
      resetForm(); // resetujemy formularz...
      $('.campaigns-view').fullCalendar('refetchEvents'); // i mówimy kalendarzowi, że powinien zaktualizować dane na temat kampanii
    })
  })
})
