// czekamy na załodowanie się całego drzewa DOM
$(document).ready(function () {
  var socket = io(''); // ustanawianie połączenia z serwerm WebSocket

  socket.on('refresh-clients', function (data) {
    console.log(arguments)

    var clientElem = $('.client[data-name=' + data.name +  ']');

    if (clientElem.length) {
      if (data.connected) {
        clientElem
          .find('.client-state')
          .removeClass('is-danger')
          .addClass('is-success')
          .text('Połączony')
      } else {
        clientElem
          .find('.client-state')
          .removeClass('is-success')
          .addClass('is-danger')
          .text('Rozłączony')
      }
    }
  })

  $('.func-sync-clients').on('click', function () {
    $.post('/sync-clients')
      .then(function (res) {
        alert(res.data.message);
      });
  });

  $('.func-group-selection').on('change', function () {
    var select = $(this);
    var selectedGroup = select.val();
    var clientName = $(this).closest('.client').data('name');

    $.post('/change-client-group', {
      client: clientName,
      group: selectedGroup,
    }).then(function (res) {

    });
  });
})
