import React, { useState, useEffect } from 'react';
import { Editor, Frame } from '@craftjs/core';
import { ContainerBlock } from '../../../../shared/components/blocks/ContainerBlock';
import { SectionBlock } from '../../../../shared/components/blocks/SectionBlock';
import { Container, Text, Image } from '../../../../shared/components/blocks/BasicBlocks';

interface TemplateContent {
  fields?: any;
  html?: string;
  [key: string]: any;
}

interface Template {
  id: string;
  name: string;
  type: 'header' | 'footer' | 'page';
  content: TemplateContent;
  is_active: boolean;
}

interface GlobalLayoutProps {
  children: React.ReactNode;
}

const GlobalLayout: React.FC<GlobalLayoutProps> = ({ children }) => {
  const [header, setHeader] = useState<Template | null>(null);
  const [footer, setFooter] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/templates');
        if (!response.ok) throw new Error('Error al cargar templates');
        const data: Template[] = await response.json();
        
        setHeader(data.find(t => t.type === 'header' && t.is_active) || null);
        setFooter(data.find(t => t.type === 'footer' && t.is_active) || null);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const renderContent = (template: Template | null) => {
    if (!template) return null;

    if (template.content.fields) {
      return (
        <Editor enabled={false} resolver={{ Container, Text, Image, ContainerBlock, SectionBlock }}>
          <Frame data={template.content.fields} />
        </Editor>
      );
    }

    return template.content.html ? (
      <div dangerouslySetInnerHTML={{ __html: template.content.html }} />
    ) : (
      <div className="p-4 opacity-50">Template: {template.name}</div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#C2F86C]/20 border-t-[#C2F86C] animate-spin"></div>
        <div className="h-2 w-32 bg-[#C2F86C]/10 rounded-full overflow-hidden">
          <div className="h-full bg-[#C2F86C] w-full animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {header && (
        <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#141414]/80 border-b border-white/5">
          {renderContent(header)}
        </header>
      )}
      <main className="flex-grow min-h-screen bg-[#141414] text-white">
        {children}
      </main>
      {footer && (
        <footer className="w-full bg-[#0A0A0A] border-t border-white/5 py-12">
          <div className="max-w-7xl mx-auto px-6">
            {renderContent(footer)}
          </div>
        </footer>
      )}
    </div>
  );
};

export default GlobalLayout;
