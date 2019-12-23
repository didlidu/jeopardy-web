import datetime
import json
import random
import string
import traceback

from django.db import transaction

from app.models import Game, Category, Question
from app.services.error_service import AppException, FIELD_REQUIRED, INTERNAL_SERVER_ERROR
from app.services.json_service import json_response
from jeopardy.settings import AUTH_TOKEN_HEADER_NAME


def parse_json(json_string):
    if isinstance(json_string, str):
        if not json_string:
            json_string = '{}'
        return json.loads(json_string)
    else:
        json_string = json_string.decode('utf-8')
        if not json_string:
            json_string = '{}'
        return json.loads(json_string)


class BaseRequestEntity:

    def __init__(self, json_string):
        self.__dict__ = parse_json(json_string)

    @staticmethod
    def parse_array(json_string):
        if isinstance(json_string, str):
            return json.loads(json_string)
        else:
            return json.loads(json_string.decode('utf-8'))

    @staticmethod
    def raise_on_empty(**kw):
        extra = 'Отсутствующие параметры: '
        is_exception_needed = False
        for key, value in kw.items():
            if not value:
                extra += str(key) + ' '
                is_exception_needed = True
        if is_exception_needed:
            raise AppException(FIELD_REQUIRED, extra=extra)


class app_view(object):

    def __init__(self, view_func):
        self.view_func = view_func

    def __call__(self, request, *args, **kwargs):
        try:
            request.token = request.META.get(AUTH_TOKEN_HEADER_NAME)
            result = self.view_func(request, *args, **kwargs)
            return result
        except AppException as exception:
            exception_dict = exception.to_dict()
            print(str(datetime.datetime.utcnow()) + ' ' + str(exception_dict))
            return json_response(
                exception_dict,
                status=exception.http_code
            )
        except:
            exception_text = traceback.format_exc()
            print(str(datetime.datetime.utcnow()) + ' ' + str(exception_text))
            exception = AppException(INTERNAL_SERVER_ERROR)
            return json_response(
                exception.to_dict(),
                status=exception.http_code
            )


def init_debug_data():
    with transaction.atomic():
        while True:
            token = ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(6))
            if Game.objects.filter(token=token, expired__gte=datetime.datetime.utcnow()).count() == 0:
                break

        game = Game.objects.create(token=token)
        print(token)

        for i in range(0, 6):
            category = Category.objects.create(name='Имя ' + str(i), round=1, game=game)
            for j in range(1, 6):
                Question.objects.create(
                    text='text ' + str(i) + ' ' + str(j),
                    value=100 * j,
                    answer='answer ' + str(i) + ' ' + str(j),
                    comment='',
                    type=Question.TYPE_STANDARD,
                    category=category
                )

        for i in range(0, 6):
            category = Category.objects.create(name='Имя ' + str(i), round=2, game=game)
            for j in range(1, 6):
                Question.objects.create(
                    text='text ' + str(i) + ' ' + str(j),
                    value=100 * j,
                    answer='answer ' + str(i) + ' ' + str(j),
                    comment='',
                    type=Question.TYPE_STANDARD,
                    category=category
                )

        for i in range(0, 6):
            category = Category.objects.create(name='Имя ' + str(i), round=3, game=game)
            Question.objects.create(
                text='text ' + str(i) + ' ' + 'f',
                answer='answer ' + str(i) + ' ' + 'f',
                value=0,
                comment='',
                type=Question.TYPE_STANDARD,
                category=category
            )
