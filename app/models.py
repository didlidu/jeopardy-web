import datetime
import uuid

from django.core.exceptions import ObjectDoesNotExist
from django.db import models
from django.utils import timezone

from app.services.error_service import AppException, BAD_GAME_TOKEN, BAD_OBJECT_ID


def now_plus_12_hours():
    return datetime.datetime.utcnow() + timezone.timedelta(hours=12)


class Game(models.Model):
    STATE_WAITING_FOR_PLAYERS = 'waiting_for_players'
    STATE_THEMES_ALL = 'themes_all'
    STATE_THEMES_ROUND = 'themes_round'
    STATE_QUESTIONS = 'questions'
    STATE_QUESTION_EVENT = 'question_event'
    STATE_QUESTION = 'question'
    STATE_QUESTION_END = 'question_end'
    STATE_FINAL_END = 'final_end'
    STATE_GAME_END = 'game_end'

    CHOICES_STATE = (
        (STATE_WAITING_FOR_PLAYERS, 'WaitingForPlayers'),
        (STATE_THEMES_ALL, 'ThemesAll'),
        (STATE_THEMES_ROUND, 'ThemesRound'),
        (STATE_QUESTIONS, 'Questions'),
        (STATE_QUESTION_EVENT, 'QuestionEvent'),
        (STATE_QUESTION, 'Question'),
        (STATE_QUESTION_END, 'QuestionEnd'),
        (STATE_FINAL_END, 'FinalEnd'),
        (STATE_GAME_END, 'GameEnd'),
    )

    token = models.CharField(max_length=25, unique=True)
    created = models.DateTimeField(default=datetime.datetime.utcnow, blank=True)
    expired = models.DateTimeField(default=now_plus_12_hours, blank=True)
    question = models.ForeignKey('Question', on_delete=models.SET_NULL, blank=True, null=True, related_name='+')
    round = models.IntegerField(default=1, blank=True)  # 1, 2 or 3 for rounds; 4 for final round
    last_round = models.IntegerField(default=1, blank=True)
    final_round = models.IntegerField(default=0, blank=True)  # 0 for no final
    state = models.CharField(max_length=25, choices=CHOICES_STATE, default=STATE_WAITING_FOR_PLAYERS, blank=True)
    button_won_by = models.ForeignKey('Player', on_delete=models.SET_NULL, blank=True, null=True, related_name='+')
    changes_hash = models.CharField(max_length=255, default='', blank=True)

    @staticmethod
    def get_by_token_or_rise(token: str):
        try:
            return Game.objects.get(token=token, expired__gte=datetime.datetime.utcnow())
        except ObjectDoesNotExist:
            raise AppException(BAD_GAME_TOKEN)

    def get_current_categories(self):
        return self.categories.filter(round=self.round)

    def get_all_categories(self):
        return self.categories.all()

    def register_changes(self):
        self.changes_hash = uuid.uuid4().hex
        self.save()


class Player(models.Model):
    created = models.DateTimeField(default=datetime.datetime.utcnow, blank=True)
    last_activity = models.DateTimeField(default=datetime.datetime.utcnow, blank=True)
    name = models.CharField(max_length=255)
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='players')
    balance = models.IntegerField(default=0, blank=True)
    final_bet = models.IntegerField(default=0, blank=True)
    final_answer = models.TextField(default='', blank=True)

    @staticmethod
    def get_by_id_or_rise(id):
        try:
            return Player.objects.get(id=id)
        except ObjectDoesNotExist:
            raise AppException(BAD_OBJECT_ID, params=('Player', id))

    @staticmethod
    def get_by_game_and_name(game, name):
        try:
            return Player.objects.get(
                game=game, name=name
            )
        except ObjectDoesNotExist:
            return None


class Category(models.Model):
    name = models.CharField(max_length=255)
    round = models.IntegerField()
    game = models.ForeignKey(
        Game, on_delete=models.CASCADE, blank=True, null=True, related_name='categories')


class Question(models.Model):
    TYPE_STANDARD = 'standard'
    TYPE_AUCTION = 'auction'
    TYPE_BAG_CAT = 'bagcat'

    CHOICES_TYPE = (
        (TYPE_STANDARD, 'Standard'),
        (TYPE_AUCTION, 'Auction'),
        (TYPE_BAG_CAT, 'BagCat'),
    )

    custom_theme = models.CharField(max_length=255, null=True)
    text = models.TextField(null=True)
    image = models.CharField(max_length=255, null=True)
    audio = models.CharField(max_length=255, null=True)
    video = models.CharField(max_length=255, null=True)
    value = models.IntegerField()
    answer = models.CharField(max_length=255)
    comment = models.TextField()
    is_question_end_required = models.BooleanField()
    type = models.CharField(max_length=25, choices=CHOICES_TYPE)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='questions')
    is_processed = models.BooleanField(default=False, blank=True)

    @staticmethod
    def get_by_id_or_rise(id):
        try:
            return Question.objects.get(id=id)
        except ObjectDoesNotExist:
            raise AppException(BAD_OBJECT_ID, params=('Question', id))
