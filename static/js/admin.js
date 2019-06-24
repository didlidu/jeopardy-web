
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

function handleApiError(data) {
    if ("responseJSON" in data) {
        $("#error").html(data.responseJSON.description);
    } else {
        $("#error").html("Проверьте интернет-соединение");
    }
}

function clearApiErrors() {
    $("#error").html("&nbsp");
}


function setViewEnabled(isEnabled) {
    if (isEnabled) {
        $("a.button").addClass("button-active");
        $("div.cell-title").addClass("cell-title-active");
        $("div.cell-price").addClass("cell-price-active");
    } else {
        $("a.button").removeClass("button-active");
        $("div.cell-title").removeClass("cell-title-active");
        $("div.cell-price").removeClass("cell-price-active");
    }
}

function toDefaultState() {
    var isInited = game != null;
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
        $("#edit_balance1").value = game.players[0].balance;
        $("#edit_balance2").value = game.players[1].balance;
        $("#edit_balance3").value = game.players[2].balance;
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

function bindTableData() {
    for (i = 1; i <= 6; i++) {
        if (i >= game.categories.length) {
            $("#title" + i).html("-");
            for (j = 1; j <= 5; j++) {
                $("#price" + i + j).html("-");
            }
            continue;
        }
        var category = game.categories[i];
        $("#title" + i).html(category.name);
        for (j = 1; j <= 5; j++) {
            if (j >= category.questions.length) {
                $("#price" + i + j).html("-");
                continue;
            }
            question = category.questions[j];
            $("#price" + i + j).html(question.value);
        }
    }
}

function onGameChanged() {
    if (prevState == game.state) return;
    toDefaultState();
    prevState = game.state;
    bindPlayers();
    if (game.state == STATE_THEMES_ALL) {
        if (game.players.length == 3) {
            $("#main_info").html("Игра готова");
            $("#next").css('visibility', 'visible');
        } else {
            $("#main_info").html("Ожидание игроков");
        }
    }
    if (game.state == STATE_THEMES_ROUND) {
        bindTableData();
        $("#next").css('visibility', 'visible');
    }
    if (game.state == STATE_QUESTIONS) {
        bindTableData();
        $("#next").css('visibility', 'visible');
    }

}

$(document).ready(function() {
    $( "#create_game_button" ).on( "click", function( event ) {
        var fileInput = $('#create_game_file');
        if (!fileInput.val()) {
            $("#error").html("Выберите файл для загрузки");
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