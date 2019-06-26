function setCookie(name, value, hours) {
  var date = new Date();
  date.setTime(date.getTime() + hours * 60 * 60 * 1000);
  var expires = "expires="+ date.toUTCString();
  document.cookie = name + "=" + value + ";" + expires;
}

function getCookie(name) {
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name + "=") == 0) {
      return c.substring((name + "=").length, c.length);
    }
  }
  return "";
}

var STATE_NONE = 'none';
var STATE_WAITING_FOR_PLAYERS = 'waiting_for_players';
var STATE_THEMES_ALL = 'themes_all';
var STATE_THEMES_ROUND = 'themes_round';
var STATE_QUESTIONS = 'questions';
var STATE_QUESTION_EVENT = 'question_event';
var STATE_QUESTION = 'question';
var STATE_QUESTION_END = 'question_end';

var QUESTION_TYPE_STANDARD = 'standard'
var QUESTION_TYPE_AUCTION = 'auction'
var QUESTION_TYPE_BAG_CAT = 'bagcat'
