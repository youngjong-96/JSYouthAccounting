import pandas as pd
from PublicDataReapipder import Nts
#  from bro_function import filtering_company

##참고문서##
#https://github.com/WooilJeong/PublicDataReader/blob/main/assets/docs/portal/Nts.md
#https://www.data.go.kr/data/15081808/openapi.do#/

name = "엠케이포트.xlsx"

## Variable ###
data = pd.read_excel(name)
serviceKey = "4ye4UBQbyLCTQoZ+fYgIqfDfZMfPVfeuG/E5KC5oxWnzH5EL4k7FDSygbR6Ujm9RDKA49X69RWhWmDGeWUWtJw=="

data_1 = [str(x).replace('-','') for x in data['사업자번호']]
# print(data_1[0:100])

data_df_fin = pd.DataFrame()
### Function & API ###
API = Nts(serviceKey)

### Main ###
for i in range(0, len(data_1), 100):
    data_df_fin = pd.concat([data_df_fin, API.status(data_1[i:100+i])], ignore_index=True)
    print(len(data_df_fin))

data_df_fin['b_no']= [(a[:3] + "-" + a[3:5] + "-" + a[5:]) for a in data_df_fin['b_no']]

data_merge_df = pd.concat([data, data_df_fin], axis=1)

data_merge_df.to_excel(name + "_폐업확인.xlsx")

print(data_merge_df.tail())