
var game = null;

var cur_game_hash = "";

var selectedQuestionId = 0;
var selectedPlayerId = 0;
var isAnswerCorrect = null;

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
        //$("div.cell-title").removeClass("cell-title-active");
        //$("div.cell-price").removeClass("cell-price-active");
    }
}

function toDefaultState() {
    var isInited = game != null;
    $("#token").html("")
    if (isInited) $("#auth_holder").hide(); else $("#auth_holder").show();
    if (isInited) $("#logout_holder").show(); else $("#logout_holder").hide();

    if (isInited) $("#create_game").hide(); else $("#create_game").show();
    if (isInited) $("#table").show(); else $("#table").hide();
    $("div.cell-title").removeClass("cell-title-active");
    $("div.cell-price").removeClass("cell-price-active");
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
    $("#answer_correct").addClass("cell-title-active");
    $("#answer_correct").removeClass("cell-clicked");
    $("#answer_wrong").css('visibility','hidden');
    $("#answer_wrong").addClass("cell-title-active");
    $("#answer_wrong").removeClass("cell-clicked");

    $("#next").css('visibility','hidden');
    $("#next").addClass("cell-title-active");

    $("div.cell-clicked").removeClass("cell-clicked");
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
    $("div.cell-clicked").removeClass("cell-clicked");
    $("#price" + categoryIndex + questionIndex).addClass("cell-clicked");
}

function bindTable() {
    for (i = 0; i < 7; i++) {
        if (i >= game.categories.length) {
            $("#title" + i).html("");
            for (j = 0; j < 5; j++) {
                $("#price" + i + j).html("");
                $("#price" + i + j).on("click", function(event) { });
            }
            continue;
        }
        var category = game.categories[i];
        $("#title" + i).html(category.name);
        for (j = 0; j < 5; j++) {
            if (j >= category.questions.length) {
                $("#price" + i + j).html("");
                $("#price" + i + j).on("click", function(event) { });
                continue;
            }
            question = category.questions[j];
            if (question.is_processed) {
                $("#price" + i + j).html("");
                $("#price" + i + j).on("click", function(event) { });
                continue;
            }
            if (game.question != null && question.id == game.question.id) {
                $("#price" + i + j).addClass("cell-clicked");
            }
            if (game.is_final_round) {
                $("#price" + i + j).html("Убрать");
            } else {
                $("#price" + i + j).html(question.value);
            }
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
    if ([STATE_QUESTION_EVENT, STATE_QUESTION].includes(game.state)) {
        bindTable();
        $("#skip_question").show();
        $("#next").css('visibility','visible');
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

            if ([QUESTION_TYPE_AUCTION, QUESTION_TYPE_BAG_CAT].includes(game.question.type)) {
                $("#bet_input").css('visibility','visible');
                $("#player1").addClass("cell-title-active");
                $("#player2").addClass("cell-title-active");
                $("#player3").addClass("cell-title-active");
                if (selectedPlayerId != 0) {
                    if (selectedPlayerId == game.players[0].id) {
                        $("#player1").addClass("cell-clicked");
                    } else if (selectedPlayerId == game.players[1].id) {
                        $("#player2").addClass("cell-clicked");
                    } else if (selectedPlayerId == game.players[2].id) {
                        $("#player3").addClass("cell-clicked");
                    }
                }
            }
            $("#answer_correct").css('visibility','visible');
            $("#answer_wrong").css('visibility','visible');
            if (isAnswerCorrect != null) {
                if (isAnswerCorrect) {
                    $("#answer_correct").addClass("cell-clicked");
                } else {
                    $("#answer_wrong").addClass("cell-clicked");
                }
            }
        }
        if (game.button_won_by_player_id != 0) {
            if (game.button_won_by_player_id == game.players[0].id) {
                $("#player1").addClass("cell-clicked");
            } else if (game.button_won_by_player_id == game.players[1].id) {
                $("#player2").addClass("cell-clicked");
            } else if (game.button_won_by_player_id == game.players[2].id) {
                $("#player3").addClass("cell-clicked");
            }
        }

    }
    if (game.state == STATE_FINAL_END) {
        $("#table").hide();
        var text = "";
        for (var player in game.players) {
            if (player.final_bet > 0) {
                text += player.name + " " + player.final_answer + " " + player.final_bet + "\n";
            }
        }
        $("#main_info").html("Итоги финала\n" + text);
    }
    if (game.state == STATE_GAME_END) {
        $("#table").hide();
        $("#main_info").html("Игра окончена");
    }

}

function sendNextStateAction(questionId, playerId, balanceDiff, clearParams = false) {
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
            if (clearParams) {
                selectedQuestionId = 0;
                selectedPlayerId = 0;
                isAnswerCorrect = null;
            }
            setViewEnabled(true);
            bindTable();
            game = result['game'];
            cur_game_hash = game.changes_hash;
            onGameChanged();
        },
        error: function(data) {
            handleApiError(data);
            setViewEnabled(true);
        }
    });
}

function onNextClick() {
    showError("&nbsp");
    if ([STATE_WAITING_FOR_PLAYERS, STATE_THEMES_ALL, STATE_THEMES_ROUND].includes(game.state)) {
        sendNextStateAction(0, 0, 0);
    } else if (game.state == STATE_QUESTIONS) {
        if (selectedQuestionId == 0) {
            showError("Выберите вопрос");
            return;
        }
        sendNextStateAction(selectedQuestionId, 0, 0, true);
    } else if (game.state == STATE_QUESTION_EVENT) {
        if (selectedPlayerId == 0) {
            showError("Выберите игрока, отвечающего на вопрос");
            return;
        }
        sendNextStateAction(0, 0, 0);
    } else if (game.state == STATE_QUESTION) {
        if (game.question.type == QUESTION_TYPE_STANDARD) {
            if (game.button_won_by_player_id == 0) {
                showError("Ни один игрок не выиграл кнопку");
                return;
            }
        }
        if (isAnswerCorrect == null) {
            showError("Выберите, ответил ли игрок на вопрос верно или неверно");
            return;
        }
        var balanceDiff = game.question.value * (isAnswerCorrect ? 1 : -1);
        if ([QUESTION_TYPE_AUCTION, QUESTION_TYPE_BAG_CAT].includes(game.question.type)) {
            if (selectedPlayerId == 0) {
                showError("Выберите игрока, отвечающего на вопрос");
                return;
            }
            var betValue = parseInt($("#bet_input").val());
            if (Number.isNaN(betValue) || betValue <= 0) {
                showError("Укажите стоимость вопроса");
                return;
            }
            balanceDiff = betValue * (isAnswerCorrect ? 1 : -1);
        }

        sendNextStateAction(0, selectedPlayerId, balanceDiff, true);
    } else {
        showError("Кнопка далее в данный момент недоступна");
        return;
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
                cur_game_hash = game.changes_hash;
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
                cur_game_hash = game.changes_hash;
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
        setCookie("admin_token", "", 10);
        toDefaultState();
    });

    $("#skip_question").on("click", function(event) {
        setViewEnabled(false);
        $.ajax({
            url: "/api/admin/skip-question",
            headers: {
                'Authorization': getCookie("admin_token"),
            },
            method: "POST",
            success: function(result) {
                setViewEnabled(true);
                game = result['game'];
                cur_game_hash = game.changes_hash;
                onGameChanged();
            },
            error: function(data) {
                handleApiError(data);
                setViewEnabled(true);
            }
        });
    });

    $("#player1").on("click", function(event) {
        $("#player1").addClass("cell-clicked");
        $("#player2").removeClass("cell-clicked");
        $("#player3").removeClass("cell-clicked");
        selectedPlayerId = game.players[0].id;
    });

    $("#player2").on("click", function(event) {
        $("#player1").removeClass("cell-clicked");
        $("#player2").addClass("cell-clicked");
        $("#player3").removeClass("cell-clicked");
        selectedPlayerId = game.players[1].id;
    });

    $("#player3").on("click", function(event) {
        $("#player1").removeClass("cell-clicked");
        $("#player2").removeClass("cell-clicked");
        $("#player3").addClass("cell-clicked");
        selectedPlayerId = game.players[2].id;
    });

    $("#answer_correct").on("click", function(event) {
        $("#answer_correct").addClass("cell-clicked");
        $("#answer_wrong").removeClass("cell-clicked");
        isAnswerCorrect = true;
    });

    $("#answer_wrong").on("click", function(event) {
        $("#answer_correct").removeClass("cell-clicked");
        $("#answer_wrong").addClass("cell-clicked");
        isAnswerCorrect = false;
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