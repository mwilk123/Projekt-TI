// czekamy na załodowanie się całego drzewa DOM
$(document).ready(function () {
  $('.func-add-group').on('click', function () {
    var groupName = prompt('Podaj nazwę grupy (znaki alfanumeryczne i "-", max. 20 znaków):');

    if (!groupName || !/[A-Za-z0-9-]{3,20}/.test(groupName)) {
      return alert('Nazwa jest niepoprawna.');
    }

    $.post('/add-group', {
      name: groupName,
    }).then(function (res) {
      if (res.error) {
        return alert(res.error.message);
      }

      alert(res.data.message);

      location.reload();
    });
  })
});