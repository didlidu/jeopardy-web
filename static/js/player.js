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

function setViewEnabled(isEnabled) { }

function processGame() {
    $("#bet_holder").hide();
    $("#answer_holder").hide();
    var isInited = game != null;
    if (isInited) {
        $("#bet_holder").hide();
        $("#answer_holder").hide();
        $("#button").removeClass("big-red-button-active");
        $("#auth_holder").hide();
        $("#button_holder").show();
        $("#user-info-holder").show();
        var player = null;
        if (game.players[0].id == parseInt(getCookie("player_id"))) {
            player = game.players[0];
        } else if (game.players[1].id == parseInt(getCookie("player_id"))) {
            player = game.players[1];
        } else if (game.players[2].id == parseInt(getCookie("player_id"))) {
            player = game.players[2];
        }
        if (player != null) {
            $("#name").html(player.name);
            $("#balance").html(player.balance);
        }
        $("#info").html("&nbsp");
        if (game.state == STATE_QUESTION && game.question.type == QUESTION_TYPE_STANDARD && !game.is_final_round) {
            if (game.button_won_by_player_id == 0) {
                $("#button").addClass("big-red-button-active");
            } else if (game.button_won_by_player_id == parseInt(getCookie("player_id"))) {
                $("#info").html("Вы выиграли кнопку");
            } else {
                $("#info").html("Кнопка выиграна другим игроком");
            }
        }
        if (game.is_final_round) {
            $("#button_holder").hide();
            var cur_player = null;
            for (var player in game.players) {
                if (player.id == parseInt(getCookie("player_id"))) {
                    cur_player = player;
                    break;
                }
            }
            if (cur_player != null) {
                if (game.state == STATE_QUESTION_EVENT && cur_player.final_bet <= 0) {
                    $("#bet_holder").show();
                } else if (game.state == STATE_QUESTION && cur_player.final_bet > 0 && !cur_player.final_answer) {
                    $("#answer_holder").show();
                }
            }
        }

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
                        setCookie("player_id", "", 10);
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
                game = result["game"];
                setCookie("player_name", name, 10);
                setCookie("player_token", game.token, 10);
                setCookie("player_id", result["player_id"].toString(), 10);
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
        setCookie("player_id", "", 10);
        game = null;
        processGame();
    });

    $("#bet_holder").on("click", function(event) {
        var bet = parseInt($('#bet_input').val().trim());
        if (Number.isNaN(bet) || !bet) {
            showError("Введите ставку");
            return;
        }
        $.ajax({
            url: "/api/player/final-bet",
            headers: {
                'Authorization': getCookie("player_token"),
            },
            method: "POST",
            data: JSON.stringify({
                player_id: parseInt(getCookie("player_id")),
                bet: bet
            }),
            success: function(result) {
                setViewEnabled(true);
                game = result["game"];
                processGame();
            },
            error: function(data) {
                handleApiError(data);
                setViewEnabled(true);
            }
        });
    });

    $("#answer_holder").on("click", function(event) {
        var answer = $('#answer_input').val().trim();
        if (!answer) {
            showError("Введите ответ");
            return;
        }
        $.ajax({
            url: "/api/player/final-answer",
            headers: {
                'Authorization': getCookie("player_token"),
            },
            method: "POST",
            data: JSON.stringify({
                player_id: parseInt(getCookie("player_id")),
                answer: answer
            }),
            success: function(result) {
                setViewEnabled(true);
                game = result["game"];
                processGame();
            },
            error: function(data) {
                handleApiError(data);
                setViewEnabled(true);
            }
        });
    });

    $("#button").on("click", function(event) {
        $.ajax({
            url: "/api/player/button-click",
            headers: {
                'Authorization': getCookie("player_token"),
            },
            method: "POST",
            data: JSON.stringify({
                player_id: parseInt(getCookie("player_id"))
            }),
            success: function(result) {
                setViewEnabled(true);
                game = result["game"];
                processGame();
            },
            error: function(data) {
                handleApiError(data);
                setViewEnabled(true);
            }
        });
    });

    processGame();
    setViewEnabled(true);
    setInterval(function() {
        getGame();
    }, 1000);

});