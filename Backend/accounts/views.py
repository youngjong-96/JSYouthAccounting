from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .models import CustomUser
from .serializers import RegisterSerializer, UserSerializer
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            return Response({
                "message": "User registered successfully",
                "user": UserSerializer(user).data,
                "tokens": tokens
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# @method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        user = authenticate(username=username, password=password)
        if user is not None:
            if not user.is_approved:
                return Response({"error": "승인 대기 중입니다. 관리자의 승인을 기다려주세요."}, status=status.HTTP_403_FORBIDDEN)
                
            tokens = get_tokens_for_user(user)
            return Response({
                "message": "Login successful",
                "user": UserSerializer(user).data,
                "tokens": tokens
            }, status=status.HTTP_200_OK)
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

class UserManagementView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'master':
            return Response({"error": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
        
        users = CustomUser.objects.all().order_by('-date_joined')
        return Response(UserSerializer(users, many=True).data)

class UserManagementDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, user_id):
        if request.user.role != 'master':
            return Response({"error": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            target_user = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response({"error": "사용자를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)
            
        if 'is_approved' in request.data:
            target_user.is_approved = request.data['is_approved']
        if 'role' in request.data:
            target_user.role = request.data['role']
            
        target_user.save()
        return Response(UserSerializer(target_user).data)
