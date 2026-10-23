#!/usr/bin/env python3
"""Generate realistic sample lab-report PDFs (one per ML-backed disease + a healthy one)
for testing the PDF upload flow. Values are illustrative, NOT real patients.
Usage: pip install reportlab && python ml/make_sample_reports.py
"""
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

OUT = Path(__file__).resolve().parent / "sample_reports"
OUT.mkdir(exist_ok=True)
ss = getSampleStyleSheet()

# (test name, result, unit, reference)
REPORTS = {
 "01_type2_diabetes": dict(title="Diabetes Screening Report", patient=("Ramesh Kumar", 52, "Male"),
   vitals=[("Blood Pressure", "142/92", "mmHg", "<120/80"), ("BMI", "31.4", "kg/m2", "18.5-24.9")],
   tests=[("Fasting Blood Sugar", "168", "mg/dL", "70-99"), ("Postprandial Blood Sugar", "246", "mg/dL", "<140"),
          ("HbA1c", "8.4", "%", "<5.7"), ("Total Cholesterol", "218", "mg/dL", "<200"),
          ("Triglycerides", "210", "mg/dL", "<150"), ("Serum Creatinine", "1.0", "mg/dL", "0.7-1.3")],
   impression="Findings consistent with Type 2 Diabetes Mellitus. Poor glycemic control."),
 "02_heart_disease": dict(title="Cardiac Risk Profile", patient=("Suresh Reddy", 58, "Male"),
   vitals=[("Blood Pressure", "158/98", "mmHg", "<120/80"), ("Heart Rate", "88", "bpm", "60-100"), ("BMI", "29.8", "kg/m2", "18.5-24.9")],
   tests=[("Total Cholesterol", "276", "mg/dL", "<200"), ("LDL Cholesterol", "182", "mg/dL", "<100"),
          ("HDL Cholesterol", "34", "mg/dL", ">40"), ("Triglycerides", "245", "mg/dL", "<150"),
          ("Random Blood Sugar", "132", "mg/dL", "<140")],
   impression="Dyslipidemia with hypertension. Elevated risk of coronary artery disease. Patient reports chest pain on exertion."),
 "03_liver_disease": dict(title="Liver Function Test (LFT)", patient=("Anitha Rao", 46, "Female"),
   vitals=[],
   tests=[("Total Bilirubin", "3.8", "mg/dL", "0.3-1.2"), ("Direct Bilirubin", "1.9", "mg/dL", "0.0-0.3"),
          ("ALT (SGPT)", "112", "U/L", "7-56"), ("AST (SGOT)", "148", "U/L", "10-40"),
          ("Alkaline Phosphatase", "310", "U/L", "44-147"), ("Total Protein", "6.0", "g/dL", "6.0-8.3"),
          ("Albumin", "2.9", "g/dL", "3.5-5.0")],
   impression="Deranged liver enzymes with hyperbilirubinemia. Suggestive of hepatic dysfunction / chronic liver disease."),
 "04_kidney_disease": dict(title="Renal Function & CBC Report", patient=("Lakshmi Devi", 61, "Female"),
   vitals=[("Blood Pressure", "156/96", "mmHg", "<120/80")],
   tests=[("Serum Creatinine", "4.6", "mg/dL", "0.6-1.1"), ("Blood Urea", "112", "mg/dL", "15-40"),
          ("Hemoglobin", "8.9", "g/dL", "12.0-15.5"), ("Hematocrit", "27", "%", "36-46"),
          ("RBC Count", "3.1", "million/uL", "4.0-5.2"), ("WBC Count", "9800", "cells/uL", "4000-11000"),
          ("Random Blood Sugar", "140", "mg/dL", "<140")],
   impression="Raised creatinine and urea with anemia. Findings suggest Chronic Kidney Disease."),
 "05_stroke_risk": dict(title="Neurovascular Risk Assessment", patient=("Venkat Rao", 71, "Male"),
   vitals=[("Blood Pressure", "168/102", "mmHg", "<120/80"), ("BMI", "30.2", "kg/m2", "18.5-24.9")],
   tests=[("Random Blood Sugar", "228", "mg/dL", "<140"), ("Total Cholesterol", "240", "mg/dL", "<200"),
          ("LDL Cholesterol", "160", "mg/dL", "<100")],
   impression="Uncontrolled essential hypertension with hyperglycemia. High vascular risk; evaluate for stroke prevention."),
 "06_hypothyroidism": dict(title="Thyroid Function Test", patient=("Sravani P", 38, "Female"),
   vitals=[("Heart Rate", "58", "bpm", "60-100")],
   tests=[("TSH", "14.8", "uIU/mL", "0.4-4.0"), ("Free T4", "0.6", "ng/dL", "0.8-1.8"), ("Free T3", "2.0", "pg/mL", "2.3-4.2")],
   impression="Elevated TSH with low free T4, consistent with primary hypothyroidism. Patient reports fatigue."),
 "00_healthy_normal": dict(title="Routine Health Check-up", patient=("Kiran Kumar", 29, "Male"),
   vitals=[("Blood Pressure", "116/76", "mmHg", "<120/80"), ("BMI", "22.4", "kg/m2", "18.5-24.9")],
   tests=[("Fasting Blood Sugar", "88", "mg/dL", "70-99"), ("Total Cholesterol", "168", "mg/dL", "<200"),
          ("Hemoglobin", "14.6", "g/dL", "13.0-17.0"), ("TSH", "2.1", "uIU/mL", "0.4-4.0"),
          ("Serum Creatinine", "0.9", "mg/dL", "0.7-1.3"), ("ALT (SGPT)", "24", "U/L", "7-56")],
   impression="All parameters within normal limits."),
}

def build(name, r):
    doc = SimpleDocTemplate(str(OUT / f"{name}.pdf"), pagesize=A4, topMargin=36, bottomMargin=36)
    n, age, sex = r["patient"]
    el = [Paragraph("<b>Sample Diagnostics Laboratory</b>", ss["Title"]),
          Paragraph(r["title"], ss["Heading2"]),
          Paragraph(f"Patient Name: {n}", ss["Normal"]),
          Paragraph(f"Age: {age} Years", ss["Normal"]),
          Paragraph(f"Sex: {sex}", ss["Normal"]),
          Paragraph("Report Date: 30-09-2026", ss["Normal"]), Spacer(1, 12)]
    rows = [["Test", "Result", "Unit", "Reference Range"]] + [list(t) for t in r["vitals"] + r["tests"]]
    t = Table(rows, colWidths=[190, 80, 80, 110])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")])]))
    el += [t, Spacer(1, 14), Paragraph(f"<b>Impression:</b> {r['impression']}", ss["Normal"]), Spacer(1, 10),
           Paragraph("<i>Sample report with illustrative values for software testing only.</i>", ss["Italic"])]
    doc.build(el)

for k, v in REPORTS.items():
    build(k, v); print("wrote", k)
