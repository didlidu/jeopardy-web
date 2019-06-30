# Generated by Django 2.1.5 on 2019-06-30 16:04

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0003_auto_20190624_2014'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='changes_hash',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AlterField(
            model_name='game',
            name='created',
            field=models.DateTimeField(blank=True, default=datetime.datetime.utcnow),
        ),
        migrations.AlterField(
            model_name='game',
            name='state',
            field=models.CharField(blank=True, choices=[('waiting_for_players', 'WaitingForPlayers'), ('themes_all', 'ThemesAll'), ('themes_round', 'ThemesRound'), ('questions', 'Questions'), ('question_event', 'QuestionEvent'), ('question', 'Question'), ('question_end', 'QuestionEnd'), ('game_end', 'GameEnd')], default='waiting_for_players', max_length=25),
        ),
        migrations.AlterField(
            model_name='player',
            name='created',
            field=models.DateTimeField(blank=True, default=datetime.datetime.utcnow),
        ),
        migrations.AlterField(
            model_name='player',
            name='last_activity',
            field=models.DateTimeField(blank=True, default=datetime.datetime.utcnow),
        ),
    ]