import datetime
import os
import random
import string

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from app.entities import AuthRequestEntity, GameEntity, ButtonClickRequestEntity, EditStateRequestEntity, \
    FinalBetRequestEntity, FinalAnswerRequestEntity
from app.game_parser import unzip_file, parse_xml
from app.models import Game, Player, Question
from app.services.error_service import AppException, GAME_ALREADY_STARTED, GAME_EXPIRED, FORBIDDEN, NOT_ENOUGH_PLAYERS, \
    NO_DATA, QUESTION_ALREADY_PROCESSED, BUTTON_NOT_WON, UNABLE_TO_SKIP_QUESTION, BETS_NOT_READY, NOT_ENOUGH_BALANCE
from app.services.json_service import json_response
from app.utils import app_view
from jeopardy import settings


def get_player_panel(request):
    return render(request, "player_panel.html", {})


def get_admin_view_panel(request):
    return render(request, "admin_view_panel.html", {})


def get_admin_panel(request):
    return render(request, "admin_panel.html", {})


@csrf_exempt
@app_view
def auth_player(request):
    request_entity = AuthRequestEntity(request.body).verify_player()
    game = Game.get_by_token_or_rise(request_entity.token)
    player = Player.get_by_game_and_name(game, request_entity.name)
    if player is None:
        if game.state != Game.STATE_WAITING_FOR_PLAYERS or game.players.count() >= 3:
            raise AppException(GAME_ALREADY_STARTED)
        player = Player.objects.create(name=request_entity.name, game=game)
        game.register_changes()
    else:
        player.last_activity = datetime.datetime.utcnow()
        player.save()
    return json_response({
        'player_id': player.id,
        'game': GameEntity(game, is_full=False)
    })


@csrf_exempt
@app_view
def handle_button_click(request):
    request_entity = ButtonClickRequestEntity(request.body).verify()
    player = Player.get_by_id_or_rise(request_entity.player_id)
    is_won = False
    game = Game.objects.select_for_update().get(id=player.game.id)
    with transaction.atomic():
        if game.final_round != 0 and game.round == game.final_round:
            raise AppException(FORBIDDEN)
        if game.expired < datetime.datetime.utcnow():
            raise AppException(GAME_EXPIRED)
        if game.token != request.token:
            raise AppException(FORBIDDEN)
        if game.state == Game.STATE_QUESTION and game.button_won_by is None:
            game.button_won_by = player
            game.save()
            is_won = True
            game.register_changes()
    return json_response({
        'is_won': is_won,
        'game': GameEntity(game, is_full=False)
    })


@csrf_exempt
@app_view
def player_final_bet(request):
    request_entity = FinalBetRequestEntity(request.body).verify()
    player = Player.get_by_id_or_rise(request_entity.player_id)
    game = Game.objects.get(id=player.game.id)
    with transaction.atomic():
        if game.final_round == 0 or game.round != game.final_round or game.state != Game.STATE_QUESTION_EVENT:
            raise AppException(FORBIDDEN)
        if player.balance < request_entity.bet:
            raise AppException(NOT_ENOUGH_BALANCE)
        player.final_bet = request_entity.bet
        player.save()
    return json_response({
        'game': GameEntity(game, is_full=False)
    })


@csrf_exempt
@app_view
def player_final_answer(request):
    request_entity = FinalAnswerRequestEntity(request.body).verify()
    player = Player.get_by_id_or_rise(request_entity.player_id)
    game = Game.objects.get(id=player.game.id)
    with transaction.atomic():
        if game.final_round == 0 or game.round != game.final_round or game.state != Game.STATE_QUESTION:
            raise AppException(FORBIDDEN)
        player.final_answer = request_entity.answer
        player.save()
    return json_response({
        'game': GameEntity(game, is_full=False)
    })


@csrf_exempt
@app_view
def create_game(request):
    while True:
        token = ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(6))
        if Game.objects.filter(token=token, expired__gte=datetime.datetime.utcnow()).count() == 0:
            break
    data = request.FILES['game.siq']

    with transaction.atomic():
        path = default_storage.save(os.path.join(token, 'game.siq'), ContentFile(data.read()))
        file = os.path.join(settings.MEDIA_ROOT, path)
        unzip_file(file, os.path.join(settings.MEDIA_ROOT, token))
        game = Game.objects.create(token=token)
        parse_xml(os.path.join(settings.MEDIA_ROOT, token, 'content.xml'), game)
        game.register_changes()

    return json_response({
        'game': GameEntity(game, is_full=True)
    })


@csrf_exempt
@app_view
def auth_admin(request):
    request_entity = AuthRequestEntity(request.body).verify_admin()
    game = Game.get_by_token_or_rise(request_entity.token)
    return json_response({
        'game': GameEntity(game, is_full=True)
    })


def process_question_end(game):
    game.question.is_processed = True
    game.question.save()
    questions_count = 0
    for category in game.get_current_categories():
        questions_count += category.questions.filter(is_processed=False).count()
    if questions_count > 3 * game.round:
        game.question = None
        game.state = Game.STATE_QUESTIONS
        game.save()
    else:
        game.question = None
        game.state = Game.STATE_THEMES_ROUND
        game.round += 1
        if game.categories.filter(round=game.round).count() == 0:
            game.state = Game.STATE_GAME_END
        game.save()


@csrf_exempt
@app_view
def next_state(request):
    request_entity = EditStateRequestEntity(request.body)
    game = Game.get_by_token_or_rise(request.token)
    if game.state == Game.STATE_WAITING_FOR_PLAYERS:
        if game.players.count() >= 3:
            game.state = Game.STATE_THEMES_ALL
            game.save()
        else:
            raise AppException(NOT_ENOUGH_PLAYERS)
    elif game.state == Game.STATE_THEMES_ALL:
        game.state = Game.STATE_THEMES_ROUND
        game.save()
    elif game.state == Game.STATE_THEMES_ROUND:
        game.state = Game.STATE_QUESTIONS
        game.save()
    elif game.state == Game.STATE_QUESTIONS:
        question = Question.get_by_id_or_rise(request_entity.question_id)
        if question.category.game.id != game.id:
            raise AppException(FORBIDDEN)
        if question.is_processed:
            raise AppException(QUESTION_ALREADY_PROCESSED)
        if game.final_round != 0 and game.round == game.final_round:
            questions_count = 0
            question.is_processed = True
            question.save()
            tmp_question = None
            for category in game.get_current_categories():
                tmp_count = category.questions.filter(is_processed=False).count()
                if tmp_count >= 1:
                    tmp_question = category.questions.filter(is_processed=False)[0]
                questions_count += tmp_count
            if questions_count == 1:
                game.state = Game.STATE_QUESTION_EVENT
                game.question = tmp_question
                game.save()
        else:
            if question.type == Question.TYPE_STANDARD:
                game.state = Game.STATE_QUESTION
            else:
                game.state = Game.STATE_QUESTION_EVENT
            game.question = question
            game.save()
    elif game.state == Game.STATE_QUESTION_EVENT:
        if game.final_round != 0 and game.round == game.final_round:
            for player in game.players.all():
                if player.balance > 0 and player.final_bet <= 0:
                    raise AppException(BETS_NOT_READY)
        game.state = Game.STATE_QUESTION
        game.save()
    elif game.state == Game.STATE_QUESTION:
        if game.final_round != 0 and game.round == game.final_round:
            game.state = Game.STATE_FINAL_END
            game.save()
        else:
            if game.question.type == Question.TYPE_STANDARD:
                if game.button_won_by is None:
                    raise AppException(BUTTON_NOT_WON)
                player = game.button_won_by
            else:
                player = Player.get_by_id_or_rise(request_entity.player_id)
            player.balance += request_entity.balance_diff
            player.save()
            game.button_won_by = None
            game.save()

            if game.question.type != Question.TYPE_STANDARD or request_entity.balance_diff > 0:
                if game.question.is_question_end_required:
                    game.state = Game.STATE_QUESTION_END
                    game.save()
                else:
                    process_question_end(game)
    elif game.state == Game.STATE_QUESTION_END:
        process_question_end(game)
    elif game.state == Game.STATE_FINAL_END:
        game.state = Game.STATE_GAME_END
        game.save()
    game.register_changes()
    return json_response({
        'game': GameEntity(game, is_full=True)
    })


@csrf_exempt
@app_view
def skip_question(request):
    game = Game.get_by_token_or_rise(request.token)
    if game.final_round != 0 and game.round == game.final_round:
        raise AppException(UNABLE_TO_SKIP_QUESTION)
    if game.state in (Game.STATE_QUESTION_EVENT, Game.STATE_QUESTION):
        game.button_won_by = None
        game.save()
        process_question_end(game)
        game.register_changes()
    else:
        raise AppException(UNABLE_TO_SKIP_QUESTION)
    return json_response({
        'game': GameEntity(game, is_full=True)
    })


@csrf_exempt
@app_view
def set_players_balance(request):
    game = Game.get_by_token_or_rise(request.token)
    #request_entity = ChangeBalanceRequestEntity(request.body)
    return json_response({
        'game': GameEntity(game, is_full=True)
    })


@csrf_exempt
@app_view
def set_round(request, round_number):
    game = Game.get_by_token_or_rise(request.token)
    game.round = round_number
    if game.categories.filter(round=game.round).count() == 0:
        game.state = Game.STATE_GAME_END
    game.register_changes()
    game.save()
    return json_response({
        'game': GameEntity(game, is_full=True)
    })


@app_view
def get_game(request):
    is_full = request.GET.get('is_full', False)
    changes_hash = request.GET.get('changes_hash', '')
    game = Game.get_by_token_or_rise(request.token)
    if not changes_hash or changes_hash != game.changes_hash:
        return json_response({
            'game': GameEntity(game, is_full=is_full)
        })
    else:
        return json_response({})
