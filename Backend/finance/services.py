import gspread
import pandas as pd
from django.conf import settings
import os

def get_google_sheet():
    """
    Connect to Google Sheets using credentials and return the worksheet.
    """
    creds_path = os.path.join(settings.BASE_DIR, 'credentials.json')
    
    if not os.path.exists(creds_path):
        raise FileNotFoundError(f"Credentials not found at {creds_path}")
        
    # Connect using gspread
    gc = gspread.service_account(filename=creds_path)
    
    sheet_id = getattr(settings, 'SPREADSHEET_ID', None)
    if not sheet_id:
        raise ValueError("SPREADSHEET_ID is not set in settings.py")
        
    workbook = gc.open_by_key(sheet_id)
    # Assuming data is in the first sheet
    sheet = workbook.sheet1
    return sheet

def get_finance_data_df():
    """
    Fetch all records from the sheet and return as a Pandas DataFrame.
    """
    sheet = get_google_sheet()
    records = sheet.get_all_records()
    if not records:
        return pd.DataFrame()
        
    df = pd.DataFrame(records)
    
    # Process numeric '금액' column removing commas and converting to int
    if '금액' in df.columns:
        df['금액'] = df['금액'].astype(str).str.replace(',', '').str.strip()
        df['금액'] = pd.to_numeric(df['금액'], errors='coerce').fillna(0).astype(int)
        
    return df

def get_personnel_data_df():
    """
    Fetch all records from '인원정보의 사본' sheet.
    """
    creds_path = os.path.join(settings.BASE_DIR, 'credentials.json')
    if not os.path.exists(creds_path):
        return pd.DataFrame()
        
    gc = gspread.service_account(filename=creds_path)
    sheet_id = getattr(settings, 'SPREADSHEET_ID', None)
    if not sheet_id:
        return pd.DataFrame()
        
    workbook = gc.open_by_key(sheet_id)
    try:
        sheet = workbook.worksheet("인원정보의 사본")
        records = sheet.get_all_records()
        if not records:
            return pd.DataFrame()
            
        df = pd.DataFrame(records)
        if '인원수' in df.columns:
            df['인원수'] = df['인원수'].astype(str).str.replace(',', '').str.strip()
            df['인원수'] = pd.to_numeric(df['인원수'], errors='coerce').fillna(0).astype(int)
        return df
    except Exception as e:
        return pd.DataFrame()

def append_finance_record(data):
    """
    Append a new record to the Google Sheet.
    data: list of values matching the column order.
    """
    sheet = get_google_sheet()
    
    # format the amount with comma
    if len(data) > 8:
        try:
            amount = int(data[8])
            data[8] = f"{amount:,}"
        except ValueError:
            pass
            
    sheet.append_row(data)
    return True
