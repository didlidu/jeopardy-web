from app.utils import BaseRequestEntity


class AuthRequestEntity(BaseRequestEntity):
    token = None
    name = None

    def verify_admin(self):
        self.raise_on_empty(token=self.token)
        self.token = self.token.upper()
        return self

    def verify_player(self):
        self.raise_on_empty(token=self.token, name=self.name)
        self.token = self.token.upper()
        self.name = self.name.upper()
        return self


class ButtonClickRequestEntity(BaseRequestEntity):
    player_id = 0

    def verify(self):
        self.raise_on_empty(player_id=self.player_id)
        return self


class FinalBetRequestEntity(BaseRequestEntity):
    player_id = 0
    bet = 0

    def verify(self):
        self.raise_on_empty(player_id=self.player_id, bet=self.bet)
        return self


class FinalAnswerRequestEntity(BaseRequestEntity):
    player_id = 0
    answer = 0

    def verify(self):
        self.raise_on_empty(player_id=self.player_id, answer=self.answer)
        return self


class ChangeBalanceRequestEntity(BaseRequestEntity):
    player1_balance = 0
    player2_balance = 0
    player3_balance = 0

    def verify(self):
        self.raise_on_empty(
            player1_balance=self.player1_balance,
            player2_balance=self.player2_balance,
            player3_balance=self.player3_balance
        )
        return self


class EditStateRequestEntity(BaseRequestEntity):
    question_id = 0
    player_id = 0
    balance_diff = 0


class PlayerEntity:
    id = 0
    name = ''
    last_activity = None
    balance = 0
    final_bet = 0
    final_answer = ''

    def __init__(self, player):
        self.id = player.id
        self.name = player.name
        self.last_activity = player.last_activity
        self.balance = player.balance
        self.final_bet = player.final_bet
        self.final_answer = player.final_answer


class QuestionEntity:
    id = 0
    custom_theme = None
    text = None
    image = None
    audio = None
    video = None
    value = 0
    answer = ''
    comment = ''
    type = ''
    is_processed = False

    def __init__(self, question):
        self.id = question.id
        self.custom_theme = question.custom_theme
        self.text = question.text
        self.image = question.image
        self.audio = question.audio
        self.video = question.video
        self.post_text = question.post_text
        self.post_image = question.post_image
        self.post_audio = question.post_audio
        self.post_video = question.post_video
        self.value = question.value
        self.answer = question.answer
        self.comment = question.comment
        self.type = question.type
        self.is_processed = question.is_processed


class CategoryEntity:
    id = 0
    name = ''
    questions = []

    def __init__(self, category):
        self.id = category.id
        self.name = category.name
        self.questions = [QuestionEntity(question) for question in category.questions.all()]


class GameEntity:
    id = 0
    token = ''
    created = None
    expired = None
    round = 0
    last_round = 0
    final_round = 0
    is_final_round = False
    state = ''
    button_won_by_player_id = 0
    question = None
    players = None
    categories = []
    changes_hash = ''

    def __init__(self, game, is_full=False):
        from app.models import Game
        self.id = game.id
        self.token = game.token
        self.created = game.created
        self.expired = game.expired
        self.round = game.round
        self.is_final_round = game.final_round != 0 and game.round == game.final_round
        self.last_round = game.last_round
        self.final_round = game.final_round
        self.state = game.state
        self.button_won_by_player_id = game.button_won_by.id if game.button_won_by is not None else 0
        self.question = QuestionEntity(game.question) if game.question is not None else None
        self.players = [PlayerEntity(player) for player in game.players.all()]
        if is_full:
            if game.state == Game.STATE_THEMES_ALL:
                self.categories = [CategoryEntity(category) for category in game.get_all_categories()]
            else:
                self.categories = [CategoryEntity(category) for category in game.get_current_categories()]
        self.changes_hash = game.changes_hash
