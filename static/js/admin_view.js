
var game = null;
var cur_game_hash = "";

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
    } else {
        $("#auth").hide();
    }

    $("#table").hide();
    $("#topics_all").hide();
    $("#topics_final").hide();
    $("#questionText").hide();
    $("#event").show();
    $("#questionImage").hide();

    $("#player0").show();
    $("#player1").show();
    $("#player2").show();

    $("div.cell-clicked").removeClass("cell-clicked");
}

function bindPlayers() {
    if (game.players.length > 0) {
        $("#player0").html(game.players[0].name + "\n" + game.players[0].balance.toString());
    }
    if (game.players.length > 1) {
        $("#player1").html(game.players[1].name + "\n" + game.players[1].balance.toString());
    }
    if (game.players.length > 2) {
        $("#player2").html(game.players[2].name + "\n" + game.players[2].balance.toString());
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
    }
    if (game.state == STATE_THEMES_ROUND || game.state == STATE_QUESTIONS) {
        $("#table").show();
        bindTable();
    }

    if (game.state == STATE_QUESTION_EVENT) {
        $("#event").show();
        if (game.is_final_round) $("#event").html("Финал");
        if (game.question.type == QUESTION_TYPE_AUCTION) $("#event").html("Аукцион");
        if (game.question.type == QUESTION_TYPE_BAG_CAT) $("#event").html("Кот в мешке");
    }

    if (game.state == STATE_QUESTION) {
        if (game.question.image) { // TODO
            $("#questionImage").show();
            $("#questionImageImg").attr("src", "/media/" + game.token + "/" + game.question.image);
        } else {
            $("#questionText").show();
            $("#questionText").html(game.question.text)
        }
    }

    if (game.state == STATE_FINAL_END) {
        $("#event").show();
        $("#event").html("Финал"); // TODO
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

    toDefaultState();
    setInterval(function() {
        getGame();
    }, 1000);

});