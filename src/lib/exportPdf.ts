import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PdfSection {
  heading?: string;
  columns: string[];
  rows: (string | number)[][];
}

export function exportPdfReport(opts: {
  title: string;
  subtitle?: string;
  sections: PdfSection[];
  filename: string;
  footer?: string;
}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.text(opts.title, pageWidth / 2, 20, { align: "center" });
  if (opts.subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(opts.subtitle, pageWidth / 2, 28, { align: "center" });
    doc.setTextColor(0);
  }

  let cursorY = opts.subtitle ? 36 : 30;

  opts.sections.forEach((section) => {
    if (section.heading) {
      doc.setFontSize(13);
      doc.text(section.heading, 14, cursorY);
      cursorY += 4;
    }
    autoTable(doc, {
      startY: cursorY,
      head: [section.columns],
      body: section.rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [122, 31, 61] },
    });
    // @ts-ignore
    cursorY = (doc as any).lastAutoTable.finalY + 10;
  });

  if (opts.footer) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(opts.footer, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
  }

  doc.save(opts.filename.endsWith(".pdf") ? opts.filename : `${opts.filename}.pdf`);
}

export function exportReceiptPdf(opts: {
  schoolName: string;
  receiptNumber: string;
  studentName: string;
  studentCode: string;
  amount: number;
  method: string;
  date: string;
  academicYear?: string;
  note?: string;
}) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text(opts.schoolName, pageWidth / 2, 20, { align: "center" });
  doc.setFontSize(12);
  doc.text("OFFICIAL FEE RECEIPT", pageWidth / 2, 28, { align: "center" });

  doc.setFontSize(10);
  doc.text(`Receipt No: ${opts.receiptNumber}`, 14, 42);
  doc.text(`Date: ${opts.date}`, pageWidth - 14, 42, { align: "right" });

  autoTable(doc, {
    startY: 50,
    body: [
      ["Student", opts.studentName],
      ["Admission No.", opts.studentCode],
      ["Academic Year", opts.academicYear ?? "-"],
      ["Amount Paid", `KES ${opts.amount.toLocaleString()}`],
      ["Payment Method", opts.method],
      ["Notes", opts.note ?? "-"],
    ],
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
  });

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("This receipt is computer-generated and does not require a signature.", pageWidth / 2, doc.internal.pageSize.getHeight() - 12, { align: "center" });
  doc.save(`receipt-${opts.receiptNumber}.pdf`);
}
