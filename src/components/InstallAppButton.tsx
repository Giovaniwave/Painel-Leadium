import React, { useState } from 'react';
import { Download, Check, AlertCircle, Share, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export default function InstallAppButton() {
  const { status, installApp, browserDetails } = usePWAInstall();
  const [showInstructions, setShowInstructions] = useState(false);

  // If installed, we can either hide it or show a nice badge. Let's show a subtle badge or just return null depending on preference.
  if (status === 'installed') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-xs font-semibold">
        <Check className="w-3.5 h-3.5" />
        <span>Aplicativo Instalado</span>
      </div>
    );
  }

  const handleInstallClick = () => {
    if (status === 'available') {
      installApp();
    } else {
      setShowInstructions(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        disabled={status === 'installing'}
        className={`group relative flex items-center justify-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 font-semibold cursor-pointer overflow-hidden ${
          status === 'installing'
            ? 'bg-white/10 text-white/50 border-white/5 cursor-not-allowed'
            : 'bg-[#FF4D00]/10 hover:bg-[#FF4D00] text-[#FF4D00] hover:text-white border-[#FF4D00]/20 hover:border-[#FF4D00]'
        }`}
      >
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
        
        {status === 'installing' ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <span>📲</span>
        )}
        <span className="text-[11px] uppercase tracking-wider relative z-10">
          {status === 'installing' ? 'Instalando...' : 'Instalar Aplicativo'}
        </span>
      </button>

      {/* Instructions Modal for Browsers without Push Prompt (Safari, Firefox) */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => setShowInstructions(false)}>
          <div 
            className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4 text-[#FF4D00]">
              <div className="p-2 bg-[#FF4D00]/10 rounded-lg">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Como Instalar</h3>
            </div>
            
            <div className="space-y-4 text-sm text-gray-400">
              {browserDetails.isIOS && browserDetails.isSafari ? (
                <>
                  <p>Para instalar este aplicativo no seu iPhone/iPad:</p>
                  <ol className="space-y-3 list-decimal list-inside ml-2">
                    <li className="flex items-center gap-2 mt-2">
                      Toque no ícone Compartilhar <Share className="w-4 h-4 inline text-white" />
                    </li>
                    <li className="flex items-center gap-2">
                      Selecione <strong>"Adicionar à Tela de Início"</strong> <PlusSquare className="w-4 h-4 inline text-white" />
                    </li>
                    <li>
                      Toque em <strong>Adicionar</strong> no canto superior direito.
                    </li>
                  </ol>
                </>
              ) : browserDetails.isSafari ? (
                <>
                  <p>Para instalar este aplicativo no Safari do Mac:</p>
                  <ol className="space-y-2 list-decimal list-inside ml-2">
                    <li>Vá em <strong>Arquivo</strong> no menu superior.</li>
                    <li>Selecione <strong>Adicionar ao Dock</strong>.</li>
                  </ol>
                </>
              ) : browserDetails.isFirefox ? (
                <>
                  <p>O Firefox não suporta instalação direta de PWAs no desktop nativamente no momento.</p>
                  <p className="mt-2">Recomendamos usar o Google Chrome, Microsoft Edge, ou Brave para a melhor experiência de aplicativo.</p>
                </>
              ) : (
                <>
                  <p>A instalação automática parece não estar suportada no seu navegador atual ou você já instalou o aplicativo.</p>
                  <p className="mt-2 text-xs">Pressione Ctrl+D para adicionar aos favoritos ou utilize um navegador compatível com PWAs como Chrome ou Edge.</p>
                </>
              )}
            </div>
            
            <button
              onClick={() => setShowInstructions(false)}
              className="mt-6 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-semibold transition-colors cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
