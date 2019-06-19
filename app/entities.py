from app.utils import BaseRequestEntity


class AuthRequestEntity(BaseRequestEntity):
    token = None
    name = None

    def verify_admin(self):
        self.raise_on_empty(token=self.token)
        return self

    def verify_player(self):
        self.raise_on_empty(token=self.token, name=self.name)
        return self


class ButtonClickRequestEntity(BaseRequestEntity):
    player_id = 0

    def verify(self):
        self.raise_on_empty(player_id=self.player_id)
        return self


class EditStateRequestEntity(BaseRequestEntity):
    question_id = 0
    player_id = 0
    balance_diff = 0


class PlayerEntity:
    id = 0
    last_activity = None
    balance = 0

    def __init__(self, player):
        self.id = player.id
        self.last_activity = player.last_activity
        self.balance = player.balance


class QuestionEntity:
    id = 0
    text = None
    image = None
    value = 0
    answer = ''
    comment = ''
    is_question_end_required = False
    type = ''
    is_processed = False

    def __init__(self, question):
        self.id = question.id
        self.text = question.text
        self.image = question.image
        self.value = question.value
        self.answer = question.answer
        self.comment = question.comment
        self.is_question_end_required = question.is_question_end_required
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
    state = ''
    button_won_by_player_id = 0
    question = None
    players = None
    categories = []

    def __init__(self, game, is_full=False):
        self.id = game.id
        self.token = game.token
        self.created = game.created
        self.expired = game.expired
        self.round = game.round
        self.state = game.state
        self.button_won_by_player_id = game.button_won_by.id if game.button_won_by is not None else 0
        self.question = QuestionEntity(game.question) if game.question is not None else None
        self.players = [PlayerEntity(player) for player in game.players.all()]
        if is_full:
            self.categories = [CategoryEntity(category) for category in game.get_current_categories()]
