# methods such as GET, PUT, POST, and DELETE can be defined here
# GET and POST are implemented using Django class-based views: https://www.geeksforgeeks.org/python/class-based-generic-views-django-create-retrieve-update-delete/
# In the GET method, data is returned from the model by calling React.objects.all() and using list comprehension to convert authors and their quotes into Python dictionaries
# In the POST method, data is stored by passing the incoming data to ReactSerializer()

from rest_framework.response import Response
from rest_framework.views import APIView

from .models import React
from .serializer import ReactSerializer


class ReactView(APIView):
    serializer_class = ReactSerializer

    def get(self, request):
        detail = [
            {"name": obj.name, "detail": obj.detail}
            for obj in React.objects.all()
        ]
        return Response(detail)

    def post(self, request):
        serializer = ReactSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data)
