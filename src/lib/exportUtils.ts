import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface AttendanceRow {
  studentName: string;
  studentId: string;
  lectureTitle: string;
  status: string;
  date: string;
  time: string;
}

export function exportToPDF(rows: AttendanceRow[], title: string) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('BSUT Attendance Report', 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(title, 14, 30);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`, 14, 36);

  autoTable(doc, {
    startY: 44,
    head: [['Student Name', 'University ID', 'Lecture', 'Status', 'Date', 'Time']],
    body: rows.map(r => [r.studentName, r.studentId, r.lectureTitle, r.status, r.date, r.time]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
  });

  doc.save(`attendance-report-${Date.now()}.pdf`);
}

export function exportToExcel(rows: AttendanceRow[], title: string) {
  const ws = XLSX.utils.json_to_sheet(rows.map(r => ({
    'Student Name': r.studentName,
    'University ID': r.studentId,
    'Lecture': r.lectureTitle,
    'Status': r.status,
    'Date': r.date,
    'Time': r.time,
  })));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  XLSX.writeFile(wb, `attendance-report-${Date.now()}.xlsx`);
}
