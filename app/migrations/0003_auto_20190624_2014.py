# Generated by Django 2.1.5 on 2019-06-24 10:14

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0002_auto_20190620_2035'),
    ]

    operations = [
        migrations.AddField(
            model_name='player',
            name='name',
            field=models.CharField(default='name', max_length=255),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='game',
            name='state',
            field=models.CharField(blank=True, choices=[('waiting_for_players', 'WaitingForPlayers'), ('themes_all', 'ThemesAll'), ('themes_round', 'ThemesRound'), ('questions', 'Questions'), ('question_event', 'QuestionEvent'), ('question', 'Question'), ('question_end', 'QuestionEnd')], default='waiting_for_players', max_length=25),
        ),
    ]
