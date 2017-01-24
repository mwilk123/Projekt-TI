// konfiguracja komponentu do ładowania plików
Dropzone.options.fileUploadDropzone = {
  init: function () {
    this.on('queuecomplete', function () {
      location.reload();
    })
  },
  paramName: 'file', // nazwa pola plikowego
  acceptedFiles: 'image/*', // akceptujemy tylko obrazki
  uploadMultiple: true, // możliwość załadowania wielu plików jednocześnie
  dictDefaultMessage: 'Przeciągnij i upuść pliki w tej strefie, aby załadować je na serwer.'
};
