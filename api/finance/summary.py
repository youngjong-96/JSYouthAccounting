import json
import os
import sys
from http.server import BaseHTTPRequestHandler

import gspread
import numpy as np
import pandas as pd
from google.oauth2.service_account import Credentials


def get_google_sheet():
    creds_json = os.environ.get("GOOGLE_CREDENTIALS_JSON")
    if not creds_json:
        raise ValueError("GOOGLE_CREDENTIALS_JSON environment variable not set")

    creds_dict = json.loads(creds_json)
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ]
    creds = Credentials.from_service_account_info(creds_dict, scopes=scopes)
    gc = gspread.authorize(creds)

    sheet_id = os.environ.get("SPREADSHEET_ID")
    if not sheet_id:
        raise ValueError("SPREADSHEET_ID environment variable not set")

    workbook = gc.open_by_key(sheet_id)
    return workbook


def get_finance_df(workbook):
    sheet = workbook.sheet1
    records = sheet.get_all_records()
    if not records:
        return pd.DataFrame()
    df = pd.DataFrame(records)
    if "금액" in df.columns:
        df["금액"] = (
            df["금액"].astype(str).str.replace(",", "").str.strip()
        )
        df["금액"] = pd.to_numeric(df["금액"], errors="coerce").fillna(0).astype(int)
    return df


def get_personnel_df(workbook):
    try:
        sheet = workbook.worksheet("인원정보의 사본")
        records = sheet.get_all_records()
        if not records:
            return pd.DataFrame()
        df = pd.DataFrame(records)
        if "인원수" in df.columns:
            df["인원수"] = (
                df["인원수"].astype(str).str.replace(",", "").str.strip()
            )
            df["인원수"] = (
                pd.to_numeric(df["인원수"], errors="coerce").fillna(0).astype(int)
            )
        return df
    except Exception:
        return pd.DataFrame()


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse query params
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        year = params.get("year", [None])[0]
        month = params.get("month", [None])[0]
        week = params.get("week", [None])[0]

        try:
            workbook = get_google_sheet()
            df = get_finance_df(workbook)
        except Exception as e:
            self._send_json({"error": str(e)}, 500)
            return

        if df.empty:
            self._send_json({"message": "No data found."}, 200)
            return

        # 필터 전 전체 데이터 보존
        df_all = df.copy()

        # 1. Total balance across ALL data
        total_income_all = df[df["구분"] == "수입"]["금액"].sum()
        total_expense_all = df[df["구분"] == "지출"]["금액"].sum()
        total_balance = int(total_income_all - total_expense_all)

        # 2. 이월금: 선택 연도 이전까지의 누적 잔액
        carryover_balance = 0
        if year:
            df_pre_year = df_all[
                pd.to_numeric(df_all["년"], errors="coerce") < int(year)
            ]
            co_income = int(df_pre_year[df_pre_year["구분"] == "수입"]["금액"].sum())
            co_expense = int(df_pre_year[df_pre_year["구분"] == "지출"]["금액"].sum())
            carryover_balance = co_income - co_expense

        # Filter by year
        if year:
            df = df[df["년"].astype(str) == str(year)]
        df_year = df.copy()  # 연도 필터 후 데이터 보존

        yearly_income_total = int(df[df["구분"] == "수입"]["금액"].sum())
        yearly_expense_total = int(df[df["구분"] == "지출"]["금액"].sum())

        # 3. 누적 수입/지출: 선택 연도 1월 ~ 선택 월까지
        if year and month:
            df_cumulative = df_year[
                pd.to_numeric(df_year["월"], errors="coerce") <= int(month)
            ]
            cumulative_income_total = int(df_cumulative[df_cumulative["구분"] == "수입"]["금액"].sum())
            cumulative_expense_total = int(df_cumulative[df_cumulative["구분"] == "지출"]["금액"].sum())
        else:
            # 월 필터 없으면 연도 전체 누적
            cumulative_income_total = yearly_income_total
            cumulative_expense_total = yearly_expense_total

        # Filter by month
        if month:
            df = df[df["월"].astype(str) == str(month)]

        income_df = df[df["구분"] == "수입"]
        expense_df = df[df["구분"] == "지출"]
        monthly_income_total = int(income_df["금액"].sum())
        monthly_expense_total = int(expense_df["금액"].sum())
        monthly_income_categories = {
            str(k): int(v)
            for k, v in income_df.groupby("품목")["금액"].sum().to_dict().items()
        }
        monthly_expense_categories = {
            str(k): int(v)
            for k, v in expense_df.groupby("품목")["금액"].sum().to_dict().items()
        }

        # Weekly
        weekly_stats = None
        current_df = df
        if week:
            week_str = f"{week}주차" if "주차" not in str(week) else str(week)
            w_df = df[df["주차"].astype(str) == week_str]
            current_df = w_df
            w_income = w_df[w_df["구분"] == "수입"]
            w_expense = w_df[w_df["구분"] == "지출"]
            weekly_stats = {
                "week": week_str,
                "income_total": int(w_income["금액"].sum()),
                "expense_total": int(w_expense["금액"].sum()),
                "income_categories": {
                    str(k): int(v)
                    for k, v in w_income.groupby("품목")["금액"].sum().to_dict().items()
                },
                "expense_categories": {
                    str(k): int(v)
                    for k, v in w_expense.groupby("품목")["금액"].sum().to_dict().items()
                },
            }

        # Contributors
        target_offerings = ["감사헌금", "선교헌금", "십일조", "찬조헌금", "세례교인"]
        contributors = {}
        for offering in target_offerings:
            offering_df = current_df[
                (current_df["구분"] == "수입") & (current_df["품목"] == offering)
            ]
            names = offering_df["이름"].dropna().astype(str).str.strip().tolist()
            names = [n for n in names if n]
            distinct_names = []
            for n in names:
                if n not in distinct_names:
                    distinct_names.append(n)
            contributors[offering] = ", ".join(distinct_names) if distinct_names else "없음"

        # Personnel
        personnel_stats = None
        raw_personnel_records = []
        try:
            personnel_df = get_personnel_df(workbook)
            if not personnel_df.empty:
                month_personnel_df = personnel_df.copy()
                if year:
                    month_personnel_df = month_personnel_df[
                        month_personnel_df["년"].astype(str) == str(year)
                    ]
                if month:
                    month_personnel_df = month_personnel_df[
                        month_personnel_df["월"].astype(str) == str(month)
                    ]
                raw_personnel_records = month_personnel_df.replace(
                    {float("nan"): None}
                ).to_dict("records")

                p_df = personnel_df.copy()
                if year:
                    p_df = p_df[p_df["년"].astype(str) == str(year)]
                if month:
                    p_df = p_df[p_df["월"].astype(str) == str(month)]
                if week:
                    week_str = f"{week}주차" if "주차" not in str(week) else str(week)
                    p_df = p_df[p_df["주차"].astype(str) == week_str]

                if not p_df.empty:
                    p_dict = p_df.groupby("구분")["인원수"].sum().to_dict()
                    p_dict["합계"] = sum(p_dict.values())
                    personnel_stats = {str(k): int(v) for k, v in p_dict.items()}
        except Exception:
            pass

        response_data = {
            "total_balance": total_balance,
            "carryover_balance": carryover_balance,
            "cumulative_income_total": cumulative_income_total,
            "cumulative_expense_total": cumulative_expense_total,
            "yearly_income_total": yearly_income_total,
            "yearly_expense_total": yearly_expense_total,
            "monthly_income_total": monthly_income_total,
            "monthly_expense_total": monthly_expense_total,
            "monthly_income_categories": monthly_income_categories,
            "monthly_expense_categories": monthly_expense_categories,
            "weekly_stats": weekly_stats,
            "contributors": contributors,
            "personnel_stats": personnel_stats,
            "raw_personnel_records": raw_personnel_records,
            "raw_records": df.replace({float("nan"): None}).to_dict("records"),
        }

        self._send_json(response_data, 200)

    def _send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", len(body))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
