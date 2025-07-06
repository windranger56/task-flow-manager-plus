import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { renderAsync } from 'docx-preview';
// import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
// import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export const FileViewer = ({ file, onClose }: { file: any; onClose: () => void }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (file.type.startsWith('image/')) {
      setIsLoading(false);
    } else if (file.type === 'application/pdf') {
      setIsLoading(false);
    } else if (file.type.includes('document') || file.name.endsWith('.docx')) {
      handleDocxConversion();
    } else {
      setIsLoading(false);
    }
  }, [file]);

  const handleDocxConversion = async () => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      
      // Create a temporary container for docx-preview
      const tempContainer = document.createElement('div');
      tempContainer.style.display = 'none';
      document.body.appendChild(tempContainer);
      
      // Render DOCX to the hidden container
      await renderAsync(blob, tempContainer);
      
      // Generate PDF from the rendered content
      const canvasList = tempContainer.querySelectorAll('canvas');
      if (canvasList.length === 0) {
        throw new Error('DOCX rendering failed');
      }
      
      // Convert each canvas to PDF page
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
      });
      
      for (let i = 0; i < canvasList.length; i++) {
        const canvas = canvasList[i];
        if (i > 0) {
          doc.addPage();
        }
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const imgWidth = doc.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        doc.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      }
      
      // Clean up
      document.body.removeChild(tempContainer);
      
      // Generate PDF blob
      const pdfBlob = doc.output('blob');
      setPdfBlob(pdfBlob);
      setIsLoading(false);
    } catch (err) {
      console.error('DOCX to PDF conversion failed:', err);
      setError('Не удалось конвертировать DOCX в PDF');
      setIsLoading(false);
      
      // Fallback to regular docx preview
      if (docxContainerRef.current) {
        const response = await fetch(file.url);
        const blob = await response.blob();
        renderAsync(blob, docxContainerRef.current)
          .catch(() => setError('Не удалось загрузить документ'));
      }
    }
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const getPdfUrl = () => {
    return pdfBlob ? URL.createObjectURL(pdfBlob) : file.url;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto relative">
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 bg-gray-200 rounded-full p-2 z-10"
        >
          ✕
        </button>
        
        <div className="p-4">
          <h3 className="text-lg font-medium mb-4">{file.name}</h3>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>{error}</p>
              {docxContainerRef.current && (
                <div 
                  ref={docxContainerRef} 
                  className="docx-container w-full h-full mt-4"
                  style={{ minHeight: '500px' }}
                />
              )}
              <a 
                href={file.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 mt-2 inline-block"
              >
                Скачать оригинальный файл
              </a>
            </div>
          ) : file.type.startsWith('image/') ? (
            <div className="flex justify-center">
              <img 
                src={file.url} 
                alt={file.name} 
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
          ) : file.type === 'application/pdf' || pdfBlob ? (
            <div className="pdf-container">
              <Document
                file={getPdfUrl()}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<div>Загрузка PDF...</div>}
              >
                {Array.from(new Array(numPages), (el, index) => (
                  <Page
                    key={`page_${index + 1}`}
                    pageNumber={index + 1}
                    width={800}
                    renderTextLayer={false}
                    className="mb-4 border"
                  />
                ))}
              </Document>
            </div>
          ) : file.type.includes('document') || file.name.endsWith('.docx') ? (
            <div 
              ref={docxContainerRef} 
              className="docx-container w-full h-full"
              style={{ minHeight: '500px' }}
            />
          ) : (
            <div className="text-center py-8">
              <p>Просмотр этого типа файла не поддерживается</p>
              <a 
                href={file.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 mt-2 inline-block"
              >
                Скачать файл
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};