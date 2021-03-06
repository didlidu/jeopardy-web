import os
import shutil
from urllib.parse import unquote
from xml.etree import ElementTree
import zipfile

from app.models import Category, Question
from jeopardy.settings import IS_POST_EVENT_REQUIRED


def unpack_zipfile(filename, extract_dir, encoding='cp437'):
    with zipfile.ZipFile(filename) as archive:
        for entry in archive.infolist():
            name = unquote(entry.filename)

            # don't extract absolute paths or ones with .. in them
            if name.startswith('/') or '..' in name:
                continue

            target = os.path.join(extract_dir, *name.split('/'))
            os.makedirs(os.path.dirname(target), exist_ok=True)
            if not entry.is_dir():  # file
                with archive.open(entry) as source, open(target, 'wb') as dest:
                    shutil.copyfileobj(source, dest)


def unzip_file(filename, extracting_dir_name):
    unpack_zipfile(filename, extracting_dir_name, encoding='cp437')


def parse_xml(filename, game):
    tree = ElementTree.parse(filename)
    root = tree.getroot()

    namespace = root.tag.replace('}package', '}')
    print('Namespace:', namespace)

    last_round = 0

    for i, round in enumerate(root.find(namespace + 'rounds').findall(namespace + 'round')):
        last_round = i + 1
        print('Round:', i + 1)
        print()
        for theme in round.find(namespace + 'themes').findall(namespace + 'theme'):
            theme_name = theme.get('name')
            print('Theme:', theme_name)
            category = Category.objects.create(name=theme_name, round=i+1, game=game)
            for question in theme.find(namespace + 'questions').findall(namespace + 'question'):
                question_price = question.get('price')
                type = Question.TYPE_STANDARD
                custom_theme = None
                if question.find(namespace + 'type') is not None:
                    if question.find(namespace + 'type').get('name') == 'auction':
                        type = Question.TYPE_AUCTION
                    elif question.find(namespace + 'type').get('name') == 'cat' \
                            or question.find(namespace + 'type').get('name') == 'bagcat':
                        type = Question.TYPE_BAG_CAT
                        for param in question.find(namespace + 'type').findall('param'):
                            if param.get('name') == 'theme':
                                custom_theme = param.text
                text = ''
                image = None
                audio = None
                video = None

                marker_flag = False
                post_text = None
                post_image = None
                post_audio = None
                post_video = None

                for atom in question.find(namespace + 'scenario').findall(namespace + 'atom'):
                    if atom.get('type') == 'image':
                        if marker_flag:
                            post_image = atom.text
                        else:
                            image = atom.text
                    elif atom.get('type') == 'voice':
                        if marker_flag:
                            post_audio = atom.text
                        else:
                            audio = atom.text
                    elif atom.get('type') == 'video':
                        if marker_flag:
                            post_video = atom.text
                        else:
                            video = atom.text
                    elif atom.get('type') == 'marker':
                        marker_flag = True
                    elif atom.text:
                        if marker_flag:
                            post_text = atom.text
                        else:
                            text = atom.text

                right_answer = ''
                for answer in question.find(namespace + 'right').findall(namespace + 'answer'):
                    right_answer += (answer.text + '   ') if answer.text else ''
                right_answer = right_answer.strip()
                comment = ''
                if question.find(namespace + 'info') is not None \
                        and question.find(namespace + 'info').find(namespace + 'comments') is not None:
                    comment = question.find(namespace + 'info').find(namespace + 'comments').text

                if IS_POST_EVENT_REQUIRED and right_answer \
                        and not post_text and not post_image and not post_audio and not post_video:
                    post_text = right_answer

                Question.objects.create(
                    custom_theme=custom_theme,
                    text=text,
                    image=image,
                    audio=audio,
                    video=video,
                    post_text=post_text,
                    post_image=post_image,
                    post_audio=post_audio,
                    post_video=post_video,
                    value=question_price,
                    answer=right_answer,
                    comment=comment,
                    type=type,
                    category=category
                )

                print('Type:', type)
                print('Price:', question_price)
                print('CustomTheme:', custom_theme)
                print('Text:', text)
                print('Image:', image)
                print('Audio:', audio)
                print('Video:', video)
                print('Right answer: ', right_answer)
                print('Comment:', comment)
                print()
    game.last_round = last_round
    if game.categories.filter(round=last_round)[0].questions.count() == 1:
        game.final_round = last_round
    game.save()
