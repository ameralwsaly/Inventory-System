from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
import pandas as pd
import psycopg2
import os
import os
import tempfile
from datetime import datetime
import json

app = FastAPI()

DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_NAME = os.environ.get("DB_NAME", "inventory_db")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASS = os.environ.get("DB_PASSWORD", "postgres")
DB_PORT = os.environ.get("DB_PORT", "5432")

def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        port=DB_PORT
    )

@app.post("/import-excel")
async def import_excel(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    try:
        df = pd.read_excel(file.file)
        
        # Expecting columns: name, description, quantity, unit_price
        required_cols = ['name', 'quantity']
        if not all(col in df.columns for col in required_cols):
            raise HTTPException(status_code=400, detail="Missing required columns: name, quantity")

        conn = get_db_connection()
        cursor = conn.cursor()
        
        inserted_count = 0
        for _, row in df.iterrows():
            name = str(row['name'])
            description = str(row.get('description', ''))
            qty = int(row['quantity'] if pd.notna(row['quantity']) else 0)
            price = float(row.get('unit_price', 0.0) if pd.notna(row.get('unit_price')) else 0.0)
            min_limit = int(qty * 0.10)
            
            cursor.execute(
                """INSERT INTO items (name, description, quantity, min_limit, unit_price) 
                   VALUES (%s, %s, %s, %s, %s)""",
                (name, description, qty, min_limit, price)
            )
            inserted_count += 1
            
        conn.commit()
        cursor.close()
        conn.close()
        
        return {"message": f"Successfully imported {inserted_count} items"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-voucher")
async def generate_voucher(
    request_id: int = Form(...),
    voucher_type: str = Form(...),
    recipient_name: str = Form(...),
    recipient_identity: str = Form(...),
    recipient_phone: str = Form(...),
    department: str = Form(...),
    storekeeper_name: str = Form(...),
    admin_name: str = Form(...),
    items_json: str = Form(...)  # JSON string of items: [{"name": "Item A", "qty": 5}]
):
    import json
    try:
        items = json.loads(items_json)
        
        # Simple HTML template for the voucher
        env = Environment(loader=FileSystemLoader('.')) # expecting a templates dir in future
        # For now, we will just use a hardcoded HTML string to avoid extra files
        html_template = f"""
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: sans-serif; padding: 20px; }}
                .header {{ text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }}
                .logo {{ max-width: 100px; }}
                .title {{ font-size: 24px; font-weight: bold; margin-top: 10px; }}
                .info-table {{ width: 100%; margin-top: 20px; margin-bottom: 20px; }}
                .info-table td {{ padding: 5px; }}
                .items-table {{ width: 100%; border-collapse: collapse; }}
                .items-table th, .items-table td {{ border: 1px solid #ccc; padding: 8px; text-align: right; }}
                .signatures {{ margin-top: 50px; width: 100%; }}
                .signatures td {{ text-align: center; padding: 20px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <!-- <img src="logo.png" class="logo" alt="الشعار"> -->
                <div class="title">سند {'صرف' if voucher_type == 'issue' else 'إرجاع/تالف'}</div>
                <div>رقم الطلب: {request_id} | التاريخ: {datetime.now().strftime("%Y-%m-%d %H:%M")}</div>
            </div>
            
            <table class="info-table">
                <tr>
                    <td><strong>اسم المستلم:</strong> {recipient_name}</td>
                    <td><strong>رقم الهوية:</strong> {recipient_identity}</td>
                </tr>
                <tr>
                    <td><strong>رقم الجوال:</strong> {recipient_phone}</td>
                    <td><strong>الإدارة:</strong> {department}</td>
                </tr>
            </table>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th>الرقم</th>
                        <th>الصنف</th>
                        <th>الكمية {'المصروفة' if voucher_type == 'issue' else 'المرجعة'}</th>
                    </tr>
                </thead>
                <tbody>
        """
        for count, item in enumerate(items, 1):
            html_template += f"""
                    <tr>
                        <td>{count}</td>
                        <td>{item['name']}</td>
                        <td>{item['qty']}</td>
                    </tr>
            """
            
        html_template += f"""
                </tbody>
            </table>
            
            <table class="signatures">
                <tr>
                    <td>
                        <strong>المستلم</strong><br><br>
                        ...................
                    </td>
                    <td>
                        <strong>أمين المستودع ({storekeeper_name})</strong><br><br>
                        ...................
                    </td>
                    <td>
                        <strong>مدير النظام ({admin_name})</strong><br><br>
                        ...................
                    </td>
                </tr>
            </table>
            
            <script>
               window.onload = function() {{ window.print(); }}
            </script>
        </body>
        </html>
        """
        
        # Instead of WeasyPrint (which requires GTK3 on Windows and can crash),
        # we return the HTML directly, and the browser will automatically print it.
        html_file = tempfile.NamedTemporaryFile(delete=False, suffix=".html", mode='w', encoding='utf-8')
        html_file.write(html_template)
        html_file.close()
        
        return FileResponse(html_file.name, media_type="text/html", filename=f"voucher_{request_id}.html")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
