from django.contrib.auth.models import AbstractUser


# Custom user model, set as AUTH_USER_MODEL in settings.
# Starting with our own model (even an empty one) means fields such as roles
# can be added later without migrating away from Django's built-in User.
class User(AbstractUser):
    pass
