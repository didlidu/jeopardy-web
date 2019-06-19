import datetime
from decimal import Decimal

from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse


def format_datetime(date):
    return date.isoformat()


def format_date(date):
    return date.isoformat()


def parse_datetime(date_string):
    return datetime.datetime.strptime(date_string, '%Y-%m-%dT%H:%M:%S.%f%z')


def parse_date(date_string):
    return datetime.datetime.strptime(date_string, '%Y-%m-%d')


class JsonEncoder(DjangoJSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, datetime.datetime):
            return format_datetime(obj)
        elif isinstance(obj, datetime.date):
            return format_date(obj)
        else:
            return obj.__dict__


def json_response(obj, status=200):
    return HttpResponse(
        JsonEncoder(ensure_ascii=False).encode(obj),
        content_type="application/json; encoding=utf-8",
        status=status,
    )


def default_json_response(description="", **kwargs):
    obj = {
        "code": 0,
        "description": description,
    }
    for key, value in kwargs.items():
        obj[key] = value
    return HttpResponse(
        JsonEncoder(ensure_ascii=False).encode(obj),
        content_type="application/json; encoding=utf-8"
    )
