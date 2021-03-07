# Generated by Django 3.0.8 on 2020-08-04 23:11

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Yubikey',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('secret_key', models.CharField(max_length=32)),
                ('public_id', models.CharField(max_length=12)),
                ('private_id', models.CharField(max_length=12)),
                ('session_counter', models.PositiveIntegerField(default=0)),
                ('usage_counter', models.PositiveIntegerField(default=0)),
                ('key_name', models.CharField(max_length=40)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]