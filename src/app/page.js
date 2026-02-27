"use client";

import { useState } from "react";
import jsPDF from "jspdf";

export default function Home() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfFormat, setPdfFormat] = useState("fit"); // 'fit' (Orijinal) veya 'a4'

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setLoading(true);

    try {
      const newImages = [];
      
      for (let file of files) {
        let processFile = file;
        
        // iPhone HEIC formatı kontrolü ve dönüştürme
        if (file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif")) {
          const heic2any = (await import("heic2any")).default;
          
          const convertedBlob = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.8,
          });
          
          const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          processFile = new File([finalBlob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
            type: "image/jpeg",
          });
        }

        const imageUrl = URL.createObjectURL(processFile);
        newImages.push({ 
          url: imageUrl, 
          file: processFile,
          id: Math.random().toString(36).substr(2, 9) 
        });
      }

      setImages((prevImages) => [...prevImages, ...newImages]);
    } catch (error) {
      console.error("Görsel yüklenirken hata:", error);
      alert("Görseller yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
    
    // Aynı dosyayı tekrar seçebilmek için input'u sıfırlıyoruz
    e.target.value = '';
  };

  const removeImage = (idToRemove) => {
    setImages(images.filter(img => img.id !== idToRemove));
  };

  const generatePDF = async () => {
    if (images.length === 0) return;
    setIsGenerating(true);

    try {
      let pdf = null;

      for (let i = 0; i < images.length; i++) {
        await new Promise((resolve) => {
          const img = new Image();
          img.src = images[i].url;
          img.onload = () => {
            let orientation, unit, format, finalWidth, finalHeight, x, y;

            if (pdfFormat === "fit") {
              // SEÇENEK 1: Orijinal Boyut (Tam Kapla)
              orientation = img.width > img.height ? "l" : "p";
              unit = "px";
              format = [img.width, img.height];
              finalWidth = img.width;
              finalHeight = img.height;
              x = 0;
              y = 0;
            } else {
              // SEÇENEK 2: A4 Formatı (Dikey ve Ortalanmış)
              orientation = "p";
              unit = "mm";
              format = "a4";
              
              const pageWidth = 210;
              const pageHeight = 297;
              const margin = 10; 
              
              const maxImgWidth = pageWidth - (margin * 2);
              const maxImgHeight = pageHeight - (margin * 2);
              
              const imgRatio = img.width / img.height;
              const maxRatio = maxImgWidth / maxImgHeight;
              
              if (imgRatio > maxRatio) {
                finalWidth = maxImgWidth;
                finalHeight = maxImgWidth / imgRatio;
              } else {
                finalHeight = maxImgHeight;
                finalWidth = maxImgHeight * imgRatio;
              }

              x = (pageWidth - finalWidth) / 2;
              y = (pageHeight - finalHeight) / 2;
            }

            if (i === 0) {
              pdf = new jsPDF({ orientation, unit, format });
            } else {
              pdf.addPage(format, orientation);
            }

            pdf.addImage(img.src, "JPEG", x, y, finalWidth, finalHeight);
            resolve();
          };
        });
      }

      if (pdf) {
        // iOS / iPhone için en güvenli indirme yöntemi (Blob)
        const blob = pdf.output("blob");
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "belge.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("PDF oluşturulurken hata:", error);
      alert("PDF oluşturulurken bir hata meydana geldi.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-2xl max-w-lg w-full text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Görselden PDF'e</h1>
        <p className="text-gray-500 mb-8 text-sm">Hızlı, güvenli ve tüm cihazlarla uyumlu.</p>
        
        {/* Format Seçimi */}
        <div className="flex justify-center gap-4 mb-8 p-1 bg-gray-100 rounded-xl border border-gray-200">
          <button 
            onClick={() => setPdfFormat("fit")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${pdfFormat === 'fit' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
          >
            Orijinal Boyut
          </button>
          <button 
            onClick={() => setPdfFormat("a4")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${pdfFormat === 'a4' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
          >
            A4 (Word Gibi)
          </button>
        </div>

        {/* Yükleme Alanı */}
        <label className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-2xl p-10 hover:bg-blue-50 transition-all mb-6 group">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="Vector"></path><path d="M12 4v16m8-8H4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span className="text-blue-700 font-semibold mb-1">
            {loading ? "Görseller İşleniyor..." : "Görselleri Seçin"}
          </span>
          <span className="text-xs text-gray-400">JPG, PNG, WebP ve iPhone (HEIC)</span>
          <input 
            type="file" 
            className="hidden" 
            accept="image/*,.heic,.heif" 
            onChange={handleImageUpload}
            disabled={loading || isGenerating}
            multiple 
          />
        </label>

        {images.length > 0 && (
          <div className="animate-in fade-in duration-500">
            {/* Önizleme Listesi */}
            <div className="grid grid-cols-3 gap-3 mb-6 max-h-56 overflow-y-auto p-2 border border-gray-100 rounded-xl bg-gray-50/50">
              {images.map((img, index) => (
                <div key={img.id} className="relative aspect-square">
                  <span className="absolute top-1 left-1 bg-gray-900/80 text-white text-[10px] px-1.5 py-0.5 rounded-md z-10 font-bold">
                    {index + 1}
                  </span>
                  <button 
                    onClick={() => removeImage(img.id)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 flex items-center justify-center rounded-full z-20 shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <span className="text-[10px] leading-none">✕</span>
                  </button>
                  <img src={img.url} alt="Önizleme" className="w-full h-full object-cover rounded-lg shadow-sm border border-white"/>
                </div>
              ))}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setImages([])}
                disabled={isGenerating}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 text-sm"
              >
                Tümünü Sil
              </button>
              <button
                onClick={generatePDF}
                disabled={isGenerating}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-70 text-sm"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Hazırlanıyor...
                  </>
                ) : `PDF'e Çevir (${images.length} Sayfa)`}
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="mt-8 text-gray-400 text-xs">
        Vercel üzerinde ücretsiz olarak barındırılmaktadır.
      </p>
    </main>
  );
}