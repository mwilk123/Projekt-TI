// dopenianie zerami od lewej
function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

// pobieranie informacji na temat elementu playlisty. Informacje są wyciągane z elementów drzewa DOM
function getItemData(element) {
  var itemsContainer = element.closest('.items-container');
  var itemContainer = element.closest('.playlist-item');
  var durationInput = itemContainer.find('input[type=range]');
  var durationDisplay = itemContainer.find('.duration-display');

  return {
    playlistName: itemsContainer.data('playlistName'),
    id: itemContainer.data('id'),
    duration: parseInt(durationInput.val(), 10),
    displayDuration: durationDisplay.text(),
  };
}

$(document).ready(function () {
  // umożliwienie zmiany kolejności elementów playlisty
  $('.items-container').sortable({
    containerSelector: '.items-container',
    itemSelector: '.playlist-item',
    placeholder: '<div class="sort-placeholder" />',
    handle: '.reorder-handle',
    onDrop: function () {
      var playlistName = $('.items-container').data('playlistName');
      var order = [];

      // tworzenie tablicy z nowym porządkiem
      $('.playlist-item').each(function () {
        order.push($(this).data('id'));
      });

      // wysyłanie zapytania powodującego zmianę kolejności w bazie danych
      $.post('/reorder-playlist-items', {
        playlistName: playlistName,
        order: order,
      }).then(function (req) {
        location.reload(); // odświeżenie strony
      });
    }
  })

  // zmiana wyświetlanego czasu trwania po zmianie położenia suwaka
  $('input[type=range]').on('input', function (e) {
    var duration = $(this).val();

    $(this).closest('.playlist-item').find('.duration-display').text(pad(Math.floor(duration / 60), 2) + ':' + pad(duration % 60, 2))
  });

  // aktualizacja dancyh na temat czasu trwania w bazie. Event odpala się dopiero po puszczeniu przycisku myszy po użyciu suwaka
  $('input[type=range]').on('change', function (e) {
    var itemData = getItemData($(this));

    $.post('/edit-item-duration', itemData);
  })

  // usunięcie elementu playlisty
  $('.remove-item').on('click', function () {
    var itemData = getItemData($(this));
    var itemContainer = $(this).closest('.playlist-item');
    
    if (!confirm('Czy na pewno chcesz usunąć ten element?')) {
      return;
    }

    $.post('/remove-playlist-item', {
      playlistName: itemData.playlistName,
      id: itemData.id,
    }).then(function (res) {
      if (res.error) {
        alert(res.error);

        return;
      }

      itemContainer.remove(); // po szczęsliwym usunięciu z bazy można usunąć element ze strony
    })
  })
})
