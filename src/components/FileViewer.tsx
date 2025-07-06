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

  useEffect(() => {
    if (file.type === 'application/pdf') {
      setIsLoading(false);
    } else if (file.type.includes('document') || file.name.endsWith('.docx')) {
      fetch(file.url)
        .then(response => response.blob())
        .then(blob => {
          if (docxContainerRef.current) {
            renderAsync(blob, docxContainerRef.current)
              .then(() => setIsLoading(false))
              .catch(() => setIsLoading(false));
          }
        })
        .catch(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [file]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

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
          ) : file.type === 'application/pdf' ? (
            <div className="pdf-container">
              <Document
                file={file.url}
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