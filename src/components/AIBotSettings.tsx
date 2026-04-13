import React from 'react';

export const AIBotSettings = () => {
  return (
    <div className="p-8 bg-slate-50 min-h-full">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">AI Bot & Knowledge Base</h1>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">Bot Configuration</h2>
            <p className="text-sm text-slate-500 mt-1">Configure how your AI assistant behaves and interacts with leads.</p>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">System Prompt</label>
              <textarea 
                className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                defaultValue="Você é um assistente de vendas gentil. Use as informações fornecidas para tirar dúvidas."
              />
              <p className="text-xs text-slate-500 mt-2">This instructs the AI on its persona and primary goals.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Temperature (Creativity)</label>
                <input type="range" min="0" max="1" step="0.1" defaultValue="0.7" className="w-full" />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Precise (0)</span>
                  <span>Creative (1)</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 mt-6">
                <input type="checkbox" id="auto-reply" defaultChecked className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                <label htmlFor="auto-reply" className="text-sm font-medium text-slate-700">Enable Auto-Reply</label>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Knowledge Sources</h2>
              <p className="text-sm text-slate-500 mt-1">Upload documents or add URLs to train your AI.</p>
            </div>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              Add Source
            </button>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-slate-500">
              <p>No knowledge sources added yet.</p>
              <p className="text-sm mt-2">Add PDFs, text files, or website URLs to improve bot responses.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
