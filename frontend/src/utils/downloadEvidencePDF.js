import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function downloadEvidencePDF(ref, reportId) {

  const canvas = await html2canvas(ref.current, {
    scale: 4,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  const img = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");

  const width = 210;

  const height =
    (canvas.height * width) /
    canvas.width;

  pdf.addImage(
    img,
    "PNG",
    0,
    0,
    width,
    height
  );

  pdf.save(`${reportId}.pdf`);
}