import json
import os
from http.server import BaseHTTPRequestHandler

import gspread
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
    return workbook.sheet1


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self._send_json({"error": "Invalid JSON"}, 400)
            return

        try:
            amount = int(data.get("amount", 0))
            row = [
                data.get("year", ""),
                data.get("month", ""),
                data.get("day", ""),
                data.get("week", ""),
                data.get("date_str", ""),
                data.get("type", ""),
                data.get("category", ""),
                data.get("name", ""),
                f"{amount:,}",
                data.get("note", ""),
            ]
            sheet = get_google_sheet()
            sheet.append_row(row)
            self._send_json({"message": "Record added successfully"}, 201)
        except Exception as e:
            self._send_json({"error": str(e)}, 500)

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
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
