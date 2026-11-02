"""Prepare representative source rows from the public UCI Online Retail workbook.
python scripts/check-public-retail.py path/to/online+retail.zip output-folder
Daqing Chen, Online Retail (2015), UCI, CC BY 4.0, DOI 10.24432/C5BW33.
Only file serialization is transformed. Uses the first 32 consecutive data rows.
"""
from decimal import Decimal
from io import BytesIO
from pathlib import Path
import csv, hashlib, json, sys, zipfile
import pandas as pd
src, dest = Path(sys.argv[1]), Path(sys.argv[2])
dest.mkdir(exist_ok=True, parents=True)
with zipfile.ZipFile(src) as bundle:
    book = BytesIO(bundle.read(next(n for n in bundle.namelist() if n.lower().endswith(".xlsx"))))
df = pd.read_excel(book,nrows=32,dtype={"InvoiceNo":str,"StockCode":str,"CustomerID":str})
df["InvoiceDate"] = df["InvoiceDate"].dt.strftime("%Y-%m-%d %H:%M:%S")
with (dest/"x17.csv").open("w",encoding="utf-16",newline="") as out:
    out.write("Retail extract\r\n")
    df[df.columns[::-1]].to_csv(out,sep=";",index=False,lineterminator="\r\n",quoting=csv.QUOTE_MINIMAL)
expected=sum(int(q)*Decimal(str(p)) for q,p in zip(df.Quantity,df.UnitPrice))
result={"rows":len(df),"value_pence":int(expected*100),"order_documents":df.InvoiceNo.nunique(),"source_zip_sha256":hashlib.sha256(src.read_bytes()).hexdigest(),"source":"https://doi.org/10.24432/C5BW33","slice":"First 32 data rows; column order reversed; UTF-16 semicolon CSV with one title row."}
(dest/"expected.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
print(result)
