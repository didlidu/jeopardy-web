OK = 0

URL_NOT_FOUND = 11
METHOD_NOT_ALLOWED = 12
FORBIDDEN = 13
INTERNAL_SERVER_ERROR = 14
NO_DB_CONNECTION = 15
FIELD_REQUIRED = 16
BAD_JSON = 17
DB_ERROR = 18
BAD_OBJECT_ID = 19

BAD_GAME_TOKEN = 101
GAME_ALREADY_STARTED = 102
GAME_EXPIRED = 103
NOT_ENOUGH_PLAYERS = 104
NO_DATA = 105
QUESTION_ALREADY_PROCESSED = 106
BUTTON_NOT_WON = 107
UNABLE_TO_SKIP_QUESTION = 108
BETS_NOT_READY = 109
NOT_ENOUGH_BALANCE = 110


exception_codes_dict = {
    URL_NOT_FOUND: ('Указанный метод не найден', 404),
    METHOD_NOT_ALLOWED: ('Указанный метод не найден', 405),
    FORBIDDEN: ('Доступ запрещен', 403),
    INTERNAL_SERVER_ERROR: ('Неизвестная ошибка', 500),
    NO_DB_CONNECTION: ('Нет соединения с базой данных', 500),
    FIELD_REQUIRED: ('Не заполнено необходимое поле', 400),
    BAD_JSON: ('Неверный json', 400),
    DB_ERROR: ('Неизвестная ошибка базы данных', 500),
    BAD_OBJECT_ID: ('Объект {} с id {} не найден', 404),

    BAD_GAME_TOKEN: ('Игра с таким кодом не найдена', 404),
    GAME_ALREADY_STARTED: ('Данная игра уже началась', 403),
    GAME_EXPIRED: ('Данная игра закончилась', 403),
    NOT_ENOUGH_PLAYERS: ('Недостаточно игроков для игры', 403),
    NO_DATA: ('Загрузите вопросы для игры', 403),
    QUESTION_ALREADY_PROCESSED: ('Вопрос уже был разыгран', 403),
    BUTTON_NOT_WON: ('Ни один из игроков не нажал на кнопку', 403),
    UNABLE_TO_SKIP_QUESTION: ('Невозможно пропустить вопрос', 403),
    BETS_NOT_READY: ('Игроки не сделали ставки', 403),
    NOT_ENOUGH_BALANCE: ('', 403)
}


class AppException(Exception):
    def __init__(self, code, params=None, extra=None):
        (message, http_code) = exception_codes_dict[code]
        if params is not None:
            message = message.format(*params)
        super().__init__(message)
        self.code = code
        self.http_code = http_code
        self.message = message
        self.extra = extra

    def to_dict(self):
        res = {
            'code': self.code,
            'description': self.message,
        }
        if self.extra:
            res['extra'] = self.extra
        return res
