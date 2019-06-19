import datetime
import json
import traceback

from app.services.error_service import AppException, FIELD_REQUIRED, INTERNAL_SERVER_ERROR
from app.services.json_service import json_response
from jeopardy.settings import DEBUG, AUTH_TOKEN_HEADER_NAME


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
