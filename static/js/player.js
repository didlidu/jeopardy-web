var STATE_NONE = 'none';
var STATE_WAITING_FOR_PLAYERS = 'waiting_for_players';
var STATE_THEMES_ALL = 'themes_all';
var STATE_THEMES_ROUND = 'themes_round';
var STATE_QUESTIONS = 'questions';
var STATE_QUESTION_EVENT = 'question_event';
var STATE_QUESTION = 'question';
var STATE_QUESTION_END = 'question_end';

var game = null;
var prevState = STATE_NONE;

function showError(text) {
    var snackbar = $("#snackbar");
    snackbar.html(text);
    setTimeout(function() { $("#snackbar").removeClass("show"); }, 3000);
    snackbar.addClass("show");
}

function handleApiError(data) {
    if ("responseJSON" in data) {
        showError(data.responseJSON.description);
    } else {
        showError("Проверьте интернет-соединение");
    }
}

function setViewEnabled(isEnabled) {
    if (isEnabled) {
        $("a.button").addClass("button-active");
        $("a.big-red-button").addClass("big-red-button-active");
    } else {
        $("a.button").removeClass("button-active");
        $("a.big-red-button").removeClass("big-red-button-active");
    }
}

function toDefaultState() {
    var isInited = game != null;
    if (isInited) $("#auth_holder").hide(); else $("#auth_holder").show();
    if (isInited) $("#button_holder").show(); else $("#button_holder").hide();
    if (isInited) $("#user-info-holder").show(); else $("#user-info-holder").hide();
}

$(document).ready(function() {
    $( "#auth_button" ).on( "click", function( event ) {
        var nameInput = $('#name_input');
        var tokenInput = $('#token_input');
        if (!nameInput.val() || !tokenInput.val()) {
            showError("Введите имя и код игры");
            return;
        }
        setViewEnabled(false);
        $.ajax({
            url: "/api/player/auth",
            method: "POST",
            data: JSON.stringify({
                name: nameInput.val(),
                token: tokenInput.val()
            }),
            success: function(result) {
                setViewEnabled(true);
                clearApiErrors();
                game = result['game'];
            },
            error: function(data) {
                handleApiError(data);
                setViewEnabled(true);
            }
        });
    });
    toDefaultState();
    setViewEnabled(true);
});