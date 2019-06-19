import datetime

from django.core.exceptions import ObjectDoesNotExist
from django.db import models

from app.services.error_service import AppException, BAD_GAME_TOKEN, BAD_OBJECT_ID


class Game(models.Model):
    STATE_NO_DATA = 'no_data'
    STATE_WAITING_FOR_PLAYERS = 'waiting_for_players'
    STATE_THEMES_ALL = 'themes_all'
    STATE_THEMES_ROUND = 'themes_round'
    STATE_QUESTIONS = 'questions'
    STATE_QUESTION_EVENT = 'question_event'
    STATE_QUESTION = 'question'
    STATE_QUESTION_END = 'question_end'

    CHOICES_STATE = (
        (STATE_NO_DATA, 'NoData'),
        (STATE_WAITING_FOR_PLAYERS, 'WaitingForPlayers'),
        (STATE_THEMES_ALL, 'ThemesAll'),
        (STATE_THEMES_ROUND, 'ThemesRound'),
        (STATE_QUESTIONS, 'Questions'),
        (STATE_QUESTION_EVENT, 'QuestionEvent'),
        (STATE_QUESTION, 'Question'),
        (STATE_QUESTION_END, 'QuestionEnd'),
    )

    token = models.CharField(max_length=25, unique=True)
    created = models.DateTimeField(default=datetime.datetime.utcnow(), blank=True)
    expired = models.DateTimeField(default=datetime.datetime.utcnow() + datetime.timedelta(hours=12), blank=True)
    question = models.ForeignKey('Question', on_delete=models.SET_NULL, blank=True, null=True, related_name='+')
    round = models.IntegerField(default=1, blank=True)  # 1, 2 or 3 for rounds; 4 for final round
    state = models.CharField(max_length=25, choices=CHOICES_STATE, default=STATE_NO_DATA, blank=True)
    button_won_by = models.ForeignKey('Player', on_delete=models.SET_NULL, blank=True, null=True, related_name='+')

    @staticmethod
    def get_by_token_or_rise(token: str):
        try:
            return Game.objects.get(token=token, expired__gte=datetime.datetime.now())
        except ObjectDoesNotExist:
            raise AppException(BAD_GAME_TOKEN)

    def get_current_categories(self):
        categories = Category.objects.none()
        if self.round == 1:
            categories = self.categories_round1.all()
        elif self.round == 2:
            categories = self.categories_round2.all()
        elif self.round == 3:
            categories = self.categories_round3.all()
        elif self.round == 4:
            categories = self.categories_final.all()
        return categories


class Player(models.Model):
    created = models.DateTimeField(default=datetime.datetime.utcnow(), blank=True)
    last_activity = models.DateTimeField(default=datetime.datetime.utcnow(), blank=True)
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='players')
    balance = models.IntegerField(default=0, blank=True)

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
    game_round1 = models.ForeignKey(
        Game, on_delete=models.CASCADE, blank=True, null=True, related_name='categories_round1')
    game_round2 = models.ForeignKey(
        Game, on_delete=models.CASCADE, blank=True, null=True, related_name='categories_round2')
    game_round3 = models.ForeignKey(
        Game, on_delete=models.CASCADE, blank=True, null=True, related_name='categories_round3')
    game_final = models.ForeignKey(
        Game, on_delete=models.CASCADE, blank=True, null=True, related_name='categories_final')

    def get_game(self):
        if self.game_round1 is not None:
            return self.game_round1
        elif self.game_round2 is not None:
            return self.game_round2
        elif self.game_round3 is not None:
            return self.game_round3
        elif self.game_final is not None:
            return self.game_final
        return None


class Question(models.Model):
    TYPE_STANDARD = 'standard'
    TYPE_AUCTION = 'auction'
    TYPE_CAT = 'cat'

    CHOICES_TYPE = (
        (TYPE_STANDARD, 'Standard'),
        (TYPE_AUCTION, 'Auction'),
        (TYPE_CAT, 'Cat'),
    )

    text = models.TextField(null=True)
    image = models.CharField(max_length=255, null=True)
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
