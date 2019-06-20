import datetime
import os
import random
import string

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt

from app.entities import AuthRequestEntity, GameEntity, ButtonClickRequestEntity, EditStateRequestEntity
from app.game_parser import unzip_file, parse_xml
from app.models import Game, Player, Question
from app.services.error_service import AppException, GAME_ALREADY_STARTED, GAME_EXPIRED, FORBIDDEN, NOT_ENOUGH_PLAYERS, \
    NO_DATA, QUESTION_ALREADY_PROCESSED, BUTTON_NOT_WON, UNABLE_TO_SKIP_QUESTION
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
        if game.state not in (Game.STATE_NO_DATA, Game.STATE_WAITING_FOR_PLAYERS) or game.players.count() >= 3:
            raise AppException(GAME_ALREADY_STARTED)
        player = Player.objects.create(game=game)
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
    game = Game.objects.select_for_update().get(player.game.id)
    with transaction.atomic():
        if game.expired < datetime.datetime.utcnow():
            raise AppException(GAME_EXPIRED)
        if game.token != request.token:
            raise AppException(FORBIDDEN)
        if game.state == Game.STATE_QUESTION and game.button_won_by is None:
            game.button_won_by = player
            game.save()
            is_won = True
    return json_response({
        'is_won': is_won,
        'game': GameEntity(game, is_full=False)
    })


@csrf_exempt
@app_view
def create_game(request):
    while True:
        token = ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(6))
        if Game.objects.filter(token=token, expired__gte=datetime.datetime.now()).count() == 0:
            break
    data = request.FILES['game.siq']

    path = default_storage.save(os.path.join(token, 'game.siq'), ContentFile(data.read()))
    file = os.path.join(settings.MEDIA_ROOT, path)
    unzip_file(file, os.path.join(settings.MEDIA_ROOT, token))
    game = Game.objects.create(token=token)
    parse_xml(os.path.join(settings.MEDIA_ROOT, token, 'content.xml'), game)

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
    questions_count = 0
    for category in game.get_current_categories():
        questions_count += category.questions.filter(is_processed=False).count()
    if questions_count < 3 * game.round:
        game.question = None
        game.state = Game.STATE_QUESTIONS
        game.save()
    else:
        game.state = Game.STATE_THEMES_ROUND
        game.round += 1
        if game.round == 3 and game.categories_round3.count() == 0:
            game.round = 4
        game.save()


@csrf_exempt
@app_view
def next_state(request):
    request_entity = EditStateRequestEntity(request.body)
    game = Game.get_by_token_or_rise(request.token)
    if game.state == Game.STATE_NO_DATA:
        raise AppException(NO_DATA)
    elif game.state == Game.STATE_WAITING_FOR_PLAYERS:
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
        if question.type == Question.TYPE_STANDARD:
            game.state = Game.STATE_QUESTION
        else:
            game.state = Game.STATE_QUESTION_EVENT
        game.question = question
        game.save()
        question.is_processed = True
        question.save()
    elif game.state == Game.STATE_QUESTION_EVENT:
        game.state = Game.STATE_QUESTION
        game.save()
    elif game.state == Game.STATE_QUESTION:
        if game.question.type == Question.TYPE_STANDARD:
            if game.button_won_by is None:
                raise AppException(BUTTON_NOT_WON)
            player = game.button_won_by
        else:
            player = Player.get_by_id_or_rise(request_entity.player_id)
        player.balance += request_entity.balance_diff
        player.save()

        if game.question.is_question_end_required:
            game.state = Game.STATE_QUESTION_END
            game.save()
        else:
            process_question_end(game)
    elif game.state == Game.STATE_QUESTION_END:
        process_question_end(game)
    return json_response({
        'game': GameEntity(game, is_full=True)
    })


@csrf_exempt
@app_view
def skip_question(request):
    game = Game.get_by_token_or_rise(request.token)
    if game.state in (Game.STATE_QUESTION_EVENT, Game.STATE_QUESTION):
        process_question_end(game)
    else:
        raise AppException(UNABLE_TO_SKIP_QUESTION)
    return json_response({
        'game': GameEntity(game, is_full=True)
    })


@app_view
def get_game(request):
    is_full = request.GET.get('is_full', False)
    game = Game.get_by_token_or_rise(request.token)
    return json_response({
        'game': GameEntity(game, is_full=is_full)
    })
