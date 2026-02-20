from django.contrib import admin
from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display  = ("id", "user", "type", "amount", "category", "description", "date", "created_at")
    list_filter   = ("type", "category", "date")
    search_fields = ("user__username", "description", "category")
    ordering      = ("-date", "-created_at")
    readonly_fields = ("created_at", "updated_at")

    fieldsets = (
        ("Transaction Info", {
            "fields": ("user", "type", "amount", "category", "description", "date")
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )