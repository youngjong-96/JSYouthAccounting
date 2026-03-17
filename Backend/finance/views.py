from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services import get_finance_data_df, append_finance_record, get_personnel_data_df
import numpy as np

class FinanceSummaryView(APIView):
    def get(self, request):
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        week = request.query_params.get('week')

        try:
            df = get_finance_data_df()
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if df.empty:
            return Response({"message": "No data found."}, status=status.HTTP_200_OK)

        # 1. Total Balance across ALL data
        total_income_all = df[df['구분'] == '수입']['금액'].sum()
        total_expense_all = df[df['구분'] == '지출']['금액'].sum()
        total_balance = int(total_income_all - total_expense_all)

        # Filters - First by Year
        if year:
            df = df[df['년'].astype(str) == str(year)]
            
        # 2. Yearly Totals
        yearly_income_total = int(df[df['구분'] == '수입']['금액'].sum())
        yearly_expense_total = int(df[df['구분'] == '지출']['금액'].sum())

        # Filters - Then by Month
        if month:
            df = df[df['월'].astype(str) == str(month)]

        # Base Monthly Statistics
        income_df = df[df['구분'] == '수입']
        expense_df = df[df['구분'] == '지출']

        monthly_income_total = income_df['금액'].sum()
        monthly_expense_total = expense_df['금액'].sum()
        
        # Monthly categories
        monthly_income_categories = income_df.groupby('품목')['금액'].sum().to_dict()
        monthly_expense_categories = expense_df.groupby('품목')['금액'].sum().to_dict()

        # Weekly Statistics if week is provided
        weekly_stats = None
        current_df = df
        if week:
            # 주차는 보통 "2주차" 와 같이 문자열 혹은 숫자 "2"로 들어올 수 있음
            week_str = f"{week}주차" if "주차" not in str(week) else str(week)
            w_df = df[df['주차'].astype(str) == week_str]
            current_df = w_df
            
            w_income = w_df[w_df['구분'] == '수입']
            w_expense = w_df[w_df['구분'] == '지출']
            
            weekly_stats = {
                "week": week_str,
                "income_total": int(w_income['금액'].sum()),
                "expense_total": int(w_expense['금액'].sum()),
                "income_categories": {str(k): int(v) for k, v in w_income.groupby('품목')['금액'].sum().to_dict().items()},
                "expense_categories": {str(k): int(v) for k, v in w_expense.groupby('품목')['금액'].sum().to_dict().items()}
            }

        # Contributors list for 5 specific categories
        target_offerings = ["감사헌금", "선교헌금", "십일조", "찬조헌금", "세례교인"]
        contributors = {}
        for offering in target_offerings:
            offering_df = current_df[(current_df['구분'] == '수입') & (current_df['품목'] == offering)]
            names = offering_df['이름'].dropna().astype(str).str.strip().tolist()
            names = [n for n in names if n]
            
            distinct_names = []
            for n in names:
                if n not in distinct_names:
                    distinct_names.append(n)
            
            if not distinct_names:
                contributors[offering] = "없음"
            else:
                contributors[offering] = ", ".join(distinct_names)

        # Personnel Info Processing
        personnel_stats = None
        raw_personnel_records = []
        try:
            personnel_df = get_personnel_data_df()
            if not personnel_df.empty:
                # Raw personnel records for the month (used for monthly report)
                month_personnel_df = personnel_df.copy()
                if year:
                    month_personnel_df = month_personnel_df[month_personnel_df['년'].astype(str) == str(year)]
                if month:
                    month_personnel_df = month_personnel_df[month_personnel_df['월'].astype(str) == str(month)]
                
                raw_personnel_records = month_personnel_df.replace({np.nan: None}).to_dict('records')

                # Filter down to specific week if provided
                if year:
                    personnel_df = personnel_df[personnel_df['년'].astype(str) == str(year)]
                if month:
                    personnel_df = personnel_df[personnel_df['월'].astype(str) == str(month)]
                if week:
                    week_str = f"{week}주차" if "주차" not in str(week) else str(week)
                    personnel_df = personnel_df[personnel_df['주차'].astype(str) == week_str]
                
                if not personnel_df.empty:
                    p_dict = personnel_df.groupby('구분')['인원수'].sum().to_dict()
                    p_dict['합계'] = sum(p_dict.values())
                    personnel_stats = {str(k): int(v) for k, v in p_dict.items()}
        except Exception as e:
            print("Personnel extraction error:", e)
            pass # fallback to None if sheet read fails

        response_data = {
            "total_balance": total_balance,
            "yearly_income_total": yearly_income_total,
            "yearly_expense_total": yearly_expense_total,
            "monthly_income_total": int(monthly_income_total),
            "monthly_expense_total": int(monthly_expense_total),
            "monthly_income_categories": {str(k): int(v) for k, v in monthly_income_categories.items()},
            "monthly_expense_categories": {str(k): int(v) for k, v in monthly_expense_categories.items()},
            "weekly_stats": weekly_stats,
            "contributors": contributors,
            "personnel_stats": personnel_stats,
            "raw_personnel_records": raw_personnel_records,
            "raw_records": df.replace({np.nan: None}).to_dict('records')
        }

        return Response(response_data, status=status.HTTP_200_OK)

class FinanceRecordView(APIView):
    def post(self, request):
        # Expected fields based on columns: 년, 월, 일, 주차, 날짜, 구분, 품목, 이름, 금액, 비고
        data = request.data
        
        try:
            row = [
                data.get('year', ''),
                data.get('month', ''),
                data.get('day', ''),
                data.get('week', ''),
                data.get('date_str', ''),
                data.get('type', ''), # 수입 or 지출
                data.get('category', ''),
                data.get('name', ''),
                data.get('amount', 0),
                data.get('note', '')
            ]
            append_finance_record(row)
            return Response({"message": "Record added successfully"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
