
var game = null;
var cur_game_hash = "";
var audio = new Audio();

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

function toDefaultState() {
    var isInited = game != null;
    $("#token").html("")
    if (!isInited) {
        $("#auth").show();
        $("#exit_button").hide();
    } else {
        $("#auth").hide();
        $("#exit_button").show();
    }

    $("#table").hide();
    $("#topics_all").hide();
    $("#topics_final").hide();
    $("#questionText").hide();
    $("#event").hide();
    $("#questionImage").hide();
    $("#question_video_holder").hide();

    $("#player0").show();
    $("#player1").show();
    $("#player2").show();

    $("#player0").html("")
    $("#player1").html("")
    $("#player2").html("")

    $("div.cell-clicked").removeClass("cell-clicked");
}

function bindPlayers() {
    for (var i = 0; i < game.players.length; i++) {
        var player = game.players[i];
        $("#player" + i).html(player.name + "\n" + player.balance);
        if (player.id == game.button_won_by_player_id) {
            $("#player" + i).addClass("cell-clicked");
        }
        if (game.is_final_round) {
            if ((game.state == STATE_QUESTION_EVENT && player.final_bet > 0)
                    || (game.state == STATE_QUESTION && player.final_answer)) {
                $("#player" + i).addClass("cell-clicked");
            }
        }
    }
}

function bindTable() {
    for (i = 0; i < 6; i++) {
        if (i >= game.categories.length) {
            $("#title" + i).html("");
            for (j = 0; j < 5; j++) {
                $("#price" + i + j).html("");
            }
            continue;
        }
        var category = game.categories[i];
        $("#title" + i).html(category.name);
        for (j = 0; j < 5; j++) {
            if (j >= category.questions.length) {
                $("#price" + i + j).html("");
                continue;
            }
            question = category.questions[j];
            if (question.is_processed) {
                $("#price" + i + j).html("");
                continue;
            }
            if (game.question != null && question.id == game.question.id) {
                $("#price" + i + j).addClass("cell-clicked");
            }
            $("#price" + i + j).html(question.value);
        }
    }
}

function bindThemes() {
    for (i = 0; i <= 17; i++) {
        if (i >= game.categories.length) continue;
        $("#theme" + i).html(game.categories[i].name);
    }
}

function bindThemesFinal() {
    for (i = 0; i < 7; i++) {
        if (i >= game.categories.length) continue;
        var category = game.categories[i];
        if (category.questions.length == 0 || category.questions[0].is_processed) {
            $("#theme_final" + i).html("");
        } else {
            $("#theme_final" + i).html(category.name);
        }
    }
}

function getGame() {
    if (!getCookie("admin_token")) return;
    $.ajax({
            url: "/api/game",
            headers: {
                'Authorization': getCookie("admin_token"),
            },
            method: "GET",
            data: {
                is_full: true,
                changes_hash: cur_game_hash
            },
            success: function(result) {
                if ('game' in result) {
                    game = result['game'];
                    cur_game_hash = game.changes_hash;
                    onGameChanged();
                }
            },
            error: function(data) {
                if ("responseJSON" in data) {
                    showError(data.responseJSON.description);
                    if (data.responseJSON.code == 101) {
                        setCookie("admin_token", "", 10);
                        game = null;
                        toDefaultState();
                    }
                }
            }
        });
}

function onGameChanged() {
    toDefaultState();
    bindPlayers();
    $("#token").html(game.token)

    bindPlayers();

    if (game.state == STATE_THEMES_ALL) {
        $("#topics_all").show();
        bindThemes();
    }
    if (game.state == STATE_THEMES_ROUND || game.state == STATE_QUESTIONS) {
        audio.pause();
        audio.removeAttribute('src');
        $('#video').trigger('pause');
        document.getElementById('video_source').removeAttribute('src');
        if (game.is_final_round) {
            $("#topics_final").show();
            bindThemesFinal();
        } else {
            $("#table").show();
            bindTable();
        }
    }

    if (game.state == STATE_QUESTION_EVENT) {
        $("#event").show();
        if (game.is_final_round) $("#event").html("Финал");
        if (game.question.type == QUESTION_TYPE_AUCTION) $("#event").html("Аукцион");
        if (game.question.type == QUESTION_TYPE_BAG_CAT) $("#event").html("Кот в мешке");
    }

    if (game.state == STATE_QUESTION) {
        if (game.question.audio) {
            if (!audio.src) {
                if (game.question.audio.startsWith("@")) {
                    audio.src = "/media/" + game.token + "/Audio/" + game.question.audio.replace("@", "");
                    audio.play();
                } else {
                    audio.src = game.question.audio;
                    audio.play();
                }
            }
            $("#questionText").html("Аудиофрагмент");
        }
        if (game.question.video) {
            $("#question_video_holder").show();
            if (!$("#video_source").attr("src")) {
                var video = document.getElementById('video');
                var videoSource = document.getElementById('video_source');
                if (game.question.video.startsWith("@")) {
                    videoSource.setAttribute(
                        'src', "/media/" + game.token + "/Video/" + game.question.video.replace("@", ""));
                } else {
                    videoSource.setAttribute('src', game.question.video);
                }
                video.load();
                video.play();
            }
        }
        if (game.question.image) {
            $("#questionImage").show();
            if (game.question.image.startsWith("@")) {
                $("#questionImageImg").attr(
                    "src", "/media/" + game.token + "/Images/" + game.question.image.replace("@", ""));
            } else {
                $("#questionImageImg").attr("src", game.question.image);
            }
        }
        if (!game.question.image && !game.question.video) {
            $("#questionText").show();
            if (game.question.text) $("#questionText").html(game.question.text);
        }
    }

    if (game.state == STATE_FINAL_END) {
        $("#event").show();
        $("#event").html("Итоги финала");
        var players = [];
        for (var i in game.players) {
            var player = game.players[i];
            if (player.final_bet > 0) {
                players.push(player)
            }
        }
        var delay = 5000;
        for (var i = 0; i < players.length; i++) {
            let finalI = i;
            setTimeout(function(){
                var answer = players[finalI].final_answer;
                if (!answer) {
                    answer = "Нет ответа";
                }
                $("#event").html(players[finalI].name + "\n\"" + answer + "\"");
                setTimeout(function(){
                    $("#event").html(players[finalI].name + "\n" + players[finalI].final_bet);
                }, delay);
            }, delay + delay * 2 * i);
        }

    }

    if (game.state == STATE_GAME_END) {
        $("#event").show();
        $("#event").html("Конец игры");
    }

}

$(document).ready(function() {

    $("#auth_button").on("click", function(event) {
        var token = $('#token_input').val().trim();
        if (!token) {
            showError("Введите код игры");
            return;
        }
        $.ajax({
            url: "/api/admin/auth",
            method: "POST",
            data: JSON.stringify({
                token: token
            }),
            success: function(result) {
                game = result['game'];
                cur_game_hash = game.changes_hash;
                setCookie("admin_token", game.token, 10);
                onGameChanged();
            },
            error: function(data) {
                handleApiError(data);
            }
        });
    });

    $("#exit_button").on("click", function(event) {
        game = null;
        setCookie("admin_token", "", 10);
        toDefaultState();
    });

    toDefaultState();
    setInterval(function() {
        getGame();
    }, 1000);

});