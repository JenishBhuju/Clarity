from django.db import models
from django.contrib.auth.models import User


class Category(models.TextChoices):
    FOOD        = "food",        "Food & Dining"
    TRANSPORT   = "transport",   "Transport"
    HOUSING     = "housing",     "Housing & Rent"
    HEALTH      = "health",      "Health & Medical"
    SHOPPING    = "shopping",    "Shopping"
    EDUCATION   = "education",   "Education"
    SALARY      = "salary",      "Salary"
    FREELANCE   = "freelance",   "Freelance"
    INVESTMENT  = "investment",  "Investment"
    GIFT        = "gift",        "Gift"
    OTHER       = "other",       "Other"


class Transaction(models.Model):
    TYPE_CHOICES = [
        ("expense", "Expense"),
        ("income",  "Income"),
    ]

    user        = models.ForeignKey(User, on_delete=models.CASCADE, related_name="transactions")
    type        = models.CharField(max_length=10, choices=TYPE_CHOICES)
    amount      = models.DecimalField(max_digits=12, decimal_places=2)
    category    = models.CharField(max_length=50, choices=Category.choices, default=Category.OTHER)
    description = models.CharField(max_length=255, blank=True)
    date        = models.DateField()
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.user.username} | {self.type} | {self.amount} | {self.category}"