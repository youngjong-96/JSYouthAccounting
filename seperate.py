import pandas as pd


# Define Variable
file_name = "25.02월 세그먼트 DB_신문사제외.xlsx"
col_name = "파트너분배"
folder_name = "나누기"

#파일 임포트
file = pd.read_excel(file_name)


#분류할 기준 컬럼 선택
col_cases = pd.Series(list(set(file[col_name])))

for col_case in col_cases:
    df = file[file[col_name] == col_case]
    df.to_excel(folder_name+"/"+col_case + ".xlsx")

print("완료")
