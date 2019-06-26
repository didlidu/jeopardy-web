
var game = null;
var prevState = STATE_NONE;

var selectedQuestionId = 0;

function showError(text) {
    $("#error").html(text);
}

function handleApiError(data) {
    if ("responseJSON" in data) {
        showError(data.responseJSON.description);
    } else {
        showError("Проверьте интернет-соединение");
    }
}

function clearApiErrors() {
    showError("&nbsp");
}


function setViewEnabled(isEnabled) {
    if (isEnabled) {
        $("a.button").addClass("button-active");
    } else {
        $("a.button").removeClass("button-active");
        $("div.cell-title").removeClass("cell-title-active");
        $("div.cell-price").removeClass("cell-price-active");
    }
}

function toDefaultState() {
    var isInited = game != null;
    $("#token").html("")
    if (isInited) $("#auth_holder").hide(); else $("#auth_holder").show();
    if (isInited) $("#logout_holder").show(); else $("#logout_holder").hide();

    if (isInited) $("#create_game").hide(); else $("#create_game").show();
    if (isInited) $("#table").show(); else $("#table").hide();
    $("#error").html("&nbsp");
    $("#main_info").html("&nbsp");

    $("#players_edit_holder").hide();
    $("#skip_question").hide();

    if (!isInited) $("#player1").html("");
    $("#player1").removeClass("cell-title-active");
    if (!isInited) $("#player2").html("");
    $("#player2").removeClass("cell-title-active");
    if (!isInited) $("#player3").html("");
    $("#player3").removeClass("cell-title-active");

    $("#bet_input").css('visibility','hidden');
    $("#answer_correct").css('visibility','hidden');
    $("#answer_wrong").css('visibility','hidden');

    $("#next").css('visibility','hidden');
}

function bindPlayers() {
    if (game.players.length == 3) {
        $("#players_edit_holder").show();
        $("#edit_balance1_name").html(game.players[0].name);
        $("#edit_balance2_name").html(game.players[1].name);
        $("#edit_balance3_name").html(game.players[2].name);
        $("#edit_balance1").val(game.players[0].balance.toString());
        $("#edit_balance2").val(game.players[1].balance.toString());
        $("#edit_balance3").val(game.players[2].balance.toString());
    }
    if (game.players.length >= 1) {
        $("#player1").html(game.players[0].name + "\n" + game.players[0].balance.toString());
    }
    if (game.players.length >= 2) {
        $("#player2").html(game.players[1].name + "\n" + game.players[1].balance.toString());
    }
    if (game.players.length >= 3) {
        $("#player3").html(game.players[2].name + "\n" + game.players[2].balance.toString());
    }
}

function onCellClick(categoryIndex, questionIndex) {
    $("div.cell-clicked").removeClass("cell-clicked");
    if (game.state != STATE_QUESTIONS) {
        showError("Выбор вопроса в данный момент невозможен");
        return;
    }
    try {
        selectedQuestionId = game.categories[categoryIndex].questions[questionIndex].id;
    } catch (err) {
        showError("Ошибка при выборе вопроса: вопрос не найден");
        return;
    }
    $("#price" + categoryIndex + questionIndex).addClass("cell-clicked");
}

function bindTable() {
    $("div.cell-title").removeClass("cell-title-active");
    $("div.cell-price").removeClass("cell-price-active");
    for (i = 1; i <= 6; i++) {
        if (i >= game.categories.length) {
            $("#title" + i).html("");
            for (j = 1; j <= 5; j++) {
                $("#price" + i + j).html("");
                $("#price" + i + j).on("click", function(event) { });
            }
            continue;
        }
        var category = game.categories[i];
        $("#title" + i).html(category.name);
        for (j = 1; j <= 5; j++) {
            if (j >= category.questions.length) {
                $("#price" + i + j).html("");
                $("#price" + i + j).on("click", function(event) { });
                continue;
            }
            question = category.questions[j];
            $("#price" + i + j).html(question.value);
            let finalI = i;
            let finalJ = j;
            $("#price" + i + j).on("click", function(event) { onCellClick(finalI, finalJ); });
            $("#price" + i + j).addClass("cell-price-active");
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
                is_full: true
            },
            success: function(result) {
                game = result['game'];
                onGameChanged();
            },
            error: function(data) {
                if ("responseJSON" in data) {
                    showError(data.responseJSON.description);
                    if (data.responseJSON.code == 101) {
                        setCookie("admin_token", "", 10);
                        prevState = STATE_NONE;
                        game = null;
                        toDefaultState();
                    }
                }
            }
        });
}

function onGameChanged() {
    if (prevState == game.state && game.state != STATE_WAITING_FOR_PLAYERS) return;
    toDefaultState();
    prevState = game.state;
    bindPlayers();
    $("#token").html(game.token)
    if (selectedQuestionId != 0) {
        $("div.cell-clicked").removeClass("cell-clicked");
        selectedQuestionId = 0;
    }
    if (game.state == STATE_WAITING_FOR_PLAYERS) {
        $("#table").hide();
        if (game.players.length == 3) {
            $("#main_info").html("Игра готова");
            $("#next").css('visibility', 'visible');
        } else {
            $("#main_info").html("Ожидание игроков");
        }
    }
    if (game.state == STATE_THEMES_ALL || game.state == STATE_THEMES_ROUND) {
        $("#table").hide();
        var text = game.state == STATE_THEMES_ALL ? "Темы всей игры:\n" : "Темы раунда:\n";
        game.categories.forEach(function(item, i, categories) {
            text += item.name + "\n";
        });
        $("#main_info").html(text);
        $("#next").css('visibility', 'visible');
    }
    if (game.state == STATE_QUESTIONS) {
        bindTable();
        $("#main_info").html("Выберите вопрос");
        $("#next").css('visibility', 'visible');
    }
    if (game.state == STATE_QUESTION) {
        bindTable();
        if (game.question != null) {
            let text = ""
            if (game.question.type == QUESTION_TYPE_AUCTION) text += "Вопрос-аукцион\n";
            if (game.question.type == QUESTION_TYPE_BAG_CAT) text += "Кот в мешке\n";
            if (game.question.video) text += "Есть видеофрагмент\n";
            if (game.question.audio) text += "Есть аудиофрагмент\n";
            if (game.question.image) text += "Есть изображение\n";
            if (game.question.custom_theme) text += "Тема: " + game.question.custom_theme + "\n";
            text += "Цена: " + game.question.value + "\n";
            text += "Вопрос: " + game.question.text + "\n";
            text += "Ответ: " + game.question.answer + "\n";
            if (game.question.comment) text += "Комментарий: " + game.question.comment + "\n";
            $("#main_info").html(text);


            if ([QUESTION_TYPE_AUCTION, QUESTION_TYPE_BAG_CAT] in game.question.type) {
                $("#bet_input").css('visibility','hidden');
            }
        }

    }

}

function sendNextStateAction(questionId, playerId, balanceDiff) {
    setViewEnabled(false);
    $.ajax({
        url: "/api/admin/next-state",
        headers: {
            'Authorization': getCookie("admin_token"),
        },
        method: "POST",
        data: JSON.stringify({
            question_id: questionId,
            player_id: playerId,
            balance_diff: balanceDiff
        }),
        success: function(result) {
            setViewEnabled(true);
            bindTable();
            game = result['game'];
            onGameChanged();
        },
        error: function(data) {
            handleApiError(data);
            setViewEnabled(true);
        }
    });
}

function onNextClick() {
    if ([STATE_WAITING_FOR_PLAYERS, STATE_THEMES_ALL, STATE_THEMES_ROUND].includes(game.state)) {
        sendNextStateAction(0, 0, 0);
    }
}

$(document).ready(function() {

    $("#create_game_button").on("click", function(event) {
        var fileInput = $('#create_game_file');
        if (!fileInput.val()) {
            showError("Выберите файл для загрузки");
            return;
        }
        var data = new FormData();
        setViewEnabled(false);
        data.append("game.siq", fileInput[0].files[0]);
        $.ajax({
            url: "/api/admin/create-game",
            method: "POST",
            data: data,
            cache: false,
            contentType: false,
            processData: false,
            success: function(result) {
                setViewEnabled(true);
                clearApiErrors();
                game = result['game'];
                setCookie("admin_token", game.token, 10);
                onGameChanged();
            },
            error: function(data) {
                handleApiError(data);
                setViewEnabled(true);
            }
        });
    });

    $("#auth_button").on("click", function(event) {
        var token = $('#token_input').val().trim();
        if (!token) {
            showError("Введите код игры");
            return;
        }
        setViewEnabled(false);
        $.ajax({
            url: "/api/admin/auth",
            method: "POST",
            data: JSON.stringify({
                token: token
            }),
            success: function(result) {
                setViewEnabled(true);
                game = result['game'];
                setCookie("admin_token", game.token, 10);
                onGameChanged();
            },
            error: function(data) {
                handleApiError(data);
                setViewEnabled(true);
            }
        });
    });

    $("#logout_button").on("click", function(event) {
        game = null;
        prevState = STATE_NONE;
        setCookie("admin_token", "", 10);
        toDefaultState();
    });

    $("#next").on("click", function(event) {
        onNextClick();
    });

    toDefaultState();
    setViewEnabled(true);
    setInterval(function() {
        getGame();
    }, 1000);
});