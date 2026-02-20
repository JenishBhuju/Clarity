from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from django.db.models import Sum, Q
from .models import Transaction
from .serializers import RegisterSerializer
from .serializers import RegisterSerializer, TransactionSerializer

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Account created successfully. You can now log in."},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProtectedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"message": "You are authenticated"})
    
class TransactionListCreateView(ListCreateAPIView):
    serializer_class   = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Transaction.objects.filter(user=self.request.user)

        # Filter by type
        t = self.request.query_params.get("type")
        if t in ("expense", "income"):
            qs = qs.filter(type=t)

        # Filter by category
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)

        # Filter by date range
        date_from = self.request.query_params.get("date_from")
        date_to   = self.request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class TransactionDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class   = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user)


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Transaction.objects.filter(user=request.user)

        total_income  = qs.filter(type="income").aggregate(t=Sum("amount"))["t"] or 0
        total_expense = qs.filter(type="expense").aggregate(t=Sum("amount"))["t"] or 0
        net_balance   = total_income - total_expense

        # Expense breakdown by category
        category_breakdown = (
            qs.filter(type="expense")
            .values("category")
            .annotate(total=Sum("amount"))
            .order_by("-total")
        )

        return Response({
            "total_income":         total_income,
            "total_expense":        total_expense,
            "net_balance":          net_balance,
            "category_breakdown":   list(category_breakdown),
        })
