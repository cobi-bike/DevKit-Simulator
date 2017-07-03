var marker;
var map;

function initMap() {
  var position = {lat: 50.111, lng: 8.680};
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 8,
    center: position
  });
  marker = new google.maps.Marker({
    position: position,
    map: map
  });
}
