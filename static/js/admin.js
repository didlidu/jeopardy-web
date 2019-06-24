
var isInited = false;
var game = null;

function setViewEnabled(isEnabled) {
    if (isEnabled) {
        $("button.button").addClass("button-active");
        $("div.cell-title").addClass("cell-title-active");
        $("div.cell-price").addClass("cell-price-active");
    } else {
        $("button.button").removeClass("button-active");
        $("div.cell-title").removeClass("cell-title-active");
        $("div.cell-price").removeClass("cell-price-active");
    }
}

function toDefaultState() {
    if (isInited) $("#auth_holder").hide(); else $("#auth_holder").show();
    if (isInited) $("#logout_holder").show(); else $("#logout_holder").hide();

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

$(document).ready(function() {
    $( "#create_game_button" ).on( "click", function( event ) {
        var fileInput = $('#create_game_file');
        if (!fileInput.val()) {
            $("#error").html("Выберите файл для загрузки");
            return;
        }
        var data = new FormData();
        data.append("game.siq", fileInput[0].files[0]);
        $.ajax({
            url: "/api/admin/create-game",
            method: "POST",
            data: data,
            cache: false,
            contentType: false,
            processData: false,
            success: function(result) {
                isInited = true;
                game = result['game'];
            },
            error: function(data){
                $("#error").html(data.responseJSON.description);
            }
        });
    });
    toDefaultState();
    setViewEnabled(true);
});