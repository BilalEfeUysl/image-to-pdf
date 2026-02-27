"use client";

import { useState } from "react";
import jsPDF from "jspdf";

export default function Home() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  // YENİ: PDF Formatı seçimi için state (Varsayılan olarak 'fit' yani tam kapla)
  const [pdfFormat, setPdfFormat] = useState("fit"); 

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setLoading(true);

    try {
      const newImages = [];
      
      for (let file of files) {
        let processFile = file;
        
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
      console.error("Görseller yüklenirken hata:", error);
      alert("Görseller yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
    
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
              // SEÇENEK 2: A4 Formatı (Word gibi, Dikey)
              orientation = "p"; // Her zaman dikey (portrait)
              unit = "mm";
              format = "a4";
              
              const pageWidth = 210;
              const pageHeight = 297;
              const margin = 10; // Kenarlardan 10mm boşluk bırakıyoruz (Word görünümü için)
              
              const maxImgWidth = pageWidth - (margin * 2);
              const maxImgHeight = pageHeight - (margin * 2);
              
              const imgRatio = img.width / img.height;
              const maxRatio = maxImgWidth / maxImgHeight;
              
              if (imgRatio > maxRatio) {
                // Görsel geniş, genişliği sınırla
                finalWidth = maxImgWidth;
                finalHeight = maxImgWidth / imgRatio;
              } else {
                // Görsel uzun, yüksekliği sınırla
                finalHeight = maxImgHeight;
                finalWidth = maxImgHeight * imgRatio;
              }

              // Sayfanın tam ortasına hizalama
              x = (pageWidth - finalWidth) / 2;
              y = (pageHeight - finalHeight) / 2;
            }

            // İlk sayfaysa PDF'i oluştur, değilse yeni sayfa ekle
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
        pdf.save("donusturulmus-belge.pdf");
      }
    } catch (error) {
      console.error("PDF oluşturulurken hata:", error);
      alert("PDF oluşturulurken bir hata meydana geldi.");
    } finally {
      setIsGenerating(false);
    }
  };

  const clearImages = () => {
    setImages([]);
  };

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Görsellerden PDF'e</h1>
        <p className="text-gray-500 mb-6">Görsellerinizi dilediğiniz düzende PDF dosyasına dönüştürün.</p>
        
        {/* YENİ: Format Seçim Alanı */}
        <div className="flex justify-center gap-6 mb-8 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
            <input 
              type="radio" 
              name="pdf-format" 
              value="fit" 
              checked={pdfFormat === "fit"} 
              onChange={(e) => setPdfFormat(e.target.value)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            Orijinal Boyut (Tam Kapla)
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
            <input 
              type="radio" 
              name="pdf-format" 
              value="a4" 
              checked={pdfFormat === "a4"} 
              onChange={(e) => setPdfFormat(e.target.value)}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            A4 Kağıdı (Word Gibi)
          </label>
        </div>

        <label className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-blue-300 bg-blue-50 rounded-xl p-8 hover:bg-blue-100 transition-colors mb-6">
          <span className="text-blue-700 font-medium mb-2">
            {loading ? "Görseller İşleniyor..." : "Buraya tıklayıp görseller seçin"}
          </span>
          <span className="text-xs text-gray-400">
            JPG, PNG, WebP ve iPhone (HEIC)
          </span>
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
          <div className="animate-fade-in">
            <div className="grid grid-cols-3 gap-4 mb-6 max-h-60 overflow-y-auto p-3 border border-gray-200 rounded-lg bg-gray-50">
              {images.map((img, index) => (
                <div key={img.id} className="relative aspect-square group">
                  <span className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full z-10">
                    {index + 1}
                  </span>
                  
                  <button 
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white text-xs w-6 h-6 flex items-center justify-center rounded-full z-10 shadow-md transition-all opacity-80 hover:opacity-100"
                    title="Bu görseli çıkar"
                  >
                    ✕
                  </button>

                  <img 
                    src={img.url} 
                    alt={`Görsel ${index + 1}`} 
                    className="w-full h-full object-cover rounded-md shadow-sm border border-gray-300"
                  />
                </div>
              ))}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={clearImages}
                disabled={isGenerating}
                className="w-1/3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-all active:scale-95 disabled:opacity-50"
              >
                Tümünü Sil
              </button>
              <button
                onClick={generatePDF}
                disabled={isGenerating}
                className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-70"
              >
                {isGenerating ? "Hazırlanıyor..." : `PDF'e Çevir (${images.length} Sayfa)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}