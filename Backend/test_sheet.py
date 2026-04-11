import os
import django
import sys
import gspread

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'jsyouth_backend.settings')
django.setup()

from django.conf import settings

def inspect_spreadsheet():
    creds_path = os.path.join(settings.BASE_DIR, 'credentials.json')
    gc = gspread.service_account(filename=creds_path)
    workbook = gc.open_by_key(settings.SPREADSHEET_ID)
    
    print("Worksheets available:")
    for ws in workbook.worksheets():
        print(f"- {ws.title}")
        
    try:
        report_sheet = workbook.worksheet("인원정보의 사본")
        records = report_sheet.get_all_values()
        print("\nFirst 10 rows of '인원정보의 사본':")
        for row in records[:10]:
            print(row)
    except Exception as e:
        print(f"\nCould not read '인원정보의 사본': {e}")

if __name__ == '__main__':
    inspect_spreadsheet()
