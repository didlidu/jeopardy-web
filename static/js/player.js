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

function processGame() {
    var isInited = game != null;
    if (isInited) {
        $("#auth_holder").hide();
        $("#button_holder").show();
        $("#user-info-holder").show();

    } else {
        $("#auth_holder").show();
        $("#button_holder").hide();
        $("#user-info-holder").hide();
    }
}

function getGame() {
    if (!getCookie("player_token") || !getCookie("player_token")) return;
    $.ajax({
            url: "/api/game",
            headers: {
                'Authorization': getCookie("player_token"),
            },
            method: "GET",
            data: {
                is_full: false
            },
            success: function(result) {
                game = result['game'];
                processGame();
            },
            error: function(data) {
                if ("responseJSON" in data) {
                    showError(data.responseJSON.description);
                    if (data.responseJSON.code == 101) {
                        setCookie("player_name", "", 10);
                        setCookie("player_token", "", 10);
                        game = null;
                        processGame();
                    }
                }
            }
        });
}

$(document).ready(function() {

    $("#auth_button").on("click", function(event) {
        var name = $('#name_input').val().trim();
        var token = $('#token_input').val().trim();
        if (!name || !token) {
            showError("Введите имя и код игры");
            return;
        }
        setViewEnabled(false);
        $.ajax({
            url: "/api/player/auth",
            method: "POST",
            data: JSON.stringify({
                name: name,
                token: token
            }),
            success: function(result) {
                setViewEnabled(true);
                game = result['game'];
                setCookie("player_name", name, 10);
                setCookie("player_token", game.token, 10);
                processGame();
            },
            error: function(data) {
                handleApiError(data);
                setViewEnabled(true);
            }
        });
    });

    $("#exit_button").on("click", function(event) {
        setCookie("player_name", "", 10);
        setCookie("player_token", "", 10);
        game = null;
        processGame();
    });

    processGame();
    setViewEnabled(true);
    setInterval(function() {
        getGame();
    }, 1000);

});