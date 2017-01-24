// czekamy na załodowanie się całego drzewa DOM
$(document).ready(function () {
  $('.func-attach-images').on('click', function () {
    $(this).addClass('is-loading');

    var container = $('.images');

    var type = container.data('type'); // typ (grupa lub klient)
    var name = container.data('name'); // nazwa grupy lub klienta
    var ids = [];

    // wybieramy wszystkie zaznaczone pliki o odczytujemy ich id
    container.find('input:checkbox:checked').each(function () {
      ids.push($(this).data('id'));
    });

    $.post('/attach-images', {
      type: type,
      name: name,
      ids: ids,
    }).then(function () {
      location.href = '/' + type;
    });
  })
});