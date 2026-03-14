import { Button } from '@/components/ui/button';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { exportToPDF, exportToExcel } from '@/lib/exportUtils';

interface AttendanceRow {
  studentName: string;
  studentId: string;
  lectureTitle: string;
  status: string;
  date: string;
  time: string;
}

interface ExportButtonsProps {
  data: AttendanceRow[];
  title: string;
}

export default function ExportButtons({ data, title }: ExportButtonsProps) {
  if (data.length === 0) return null;

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportToPDF(data, title)}
        className="rounded-xl gap-1.5"
      >
        <FileText className="h-4 w-4" /> PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportToExcel(data, title)}
        className="rounded-xl gap-1.5"
      >
        <FileSpreadsheet className="h-4 w-4" /> Excel
      </Button>
    </div>
  );
}
