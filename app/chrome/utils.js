var marker;
var map;

function initMap() {
  var position = {lat: 50.119496, lng: 8.6377155};
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 17,
    center: position
  });
  marker = new google.maps.Marker({
    position: position,
    map: map
  });
}
