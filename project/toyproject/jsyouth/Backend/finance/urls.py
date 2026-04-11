from django.urls import path
from .views import FinanceSummaryView, FinanceRecordView

urlpatterns = [
    path('summary/', FinanceSummaryView.as_view(), name='finance_summary'),
    path('record/', FinanceRecordView.as_view(), name='finance_record'),
]
