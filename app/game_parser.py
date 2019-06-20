import os
from xml.etree import ElementTree
import zipfile

from app.models import Category, Question


def unzip_file(filename, extracting_dir_name):
    zip_ref = zipfile.ZipFile(filename, 'r')
    zip_ref.extractall(extracting_dir_name)
    zip_ref.close()


def parse_xml(filename, game):
    tree = ElementTree.parse(filename)
    root = tree.getroot()

    namespace = root.tag.replace('}package', '}')
    print('Namespace:', namespace)

    for child in root:
        print(child.tag)
    print(namespace + 'rounds')

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
                for atom in question.find(namespace + 'scenario').findall(namespace + 'atom'):
                    if atom.get('type') == 'image':
                        image = atom.text
                    elif atom.get('type') == 'voice':
                        audio = atom.text
                    elif atom.get('type') == 'video':
                        audio = atom.text
                    elif atom.text:
                        text = atom.text
                right_answer = ''
                for answer in question.find(namespace + 'right').findall(namespace + 'answer'):
                    right_answer += (answer.text + '   ') if answer.text else ''
                right_answer = right_answer.strip()
                comment = ''
                if question.find(namespace + 'info') is not None \
                        and question.find(namespace + 'info').find(namespace + 'comments') is not None:
                    comment = question.find(namespace + 'info').find(namespace + 'comments').text

                Question.objects.create(
                    custom_theme=custom_theme,
                    text=text,
                    image=image,
                    audio=audio,
                    video=video,
                    value=question_price,
                    answer=right_answer,
                    comment=comment,
                    is_question_end_required=False,
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
