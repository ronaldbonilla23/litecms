import React, { useState } from 'react';
import { useNode } from '@craftjs/core';

/**
 * 🧱 Container Component
 */
export const Container = ({ children, padding = 20, background = 'transparent', ...props }: any) => {
  const { connectors: { connect, drag } } = useNode();
  return (
    <div 
      ref={(ref : any) => connect(drag(ref))} 
      style={{ padding: `${padding}px`, background, minHeight: '50px' }} 
      className="border border-dashed border-black/10 transition-all"
      {...props}
    >
      {children}
    </div>
  );
};
Container.craft = {
  props: { padding: 20, background: 'transparent' },
  rules: { canMoveIn: () => true }
};

/**
 * 📝 Text Component
 */
export const Text = ({ text, fontSize = 16, color = '#000000', textAlign = 'left', ...props }: any) => {
  const { connectors: { connect, drag }, actions: { setProp } } = useNode();
  const [editable, setEditable] = useState(false);

  return (
    <div ref={(ref: any) => connect(drag(ref))} onClick={() => setEditable(true)} {...props}>
      {editable ? (
        <input 
            className="border-b border-[#C2F86C] focus:outline-none w-full"
            style={{ 
                fontSize: `${fontSize}px`, 
                textAlign,
                background: 'white',
                color: color,
                caretColor: '#C2F86C'
            }}
            value={text} 
            onChange={(e) => setProp((props: any) => props.text = e.target.value)}
            onBlur={() => setEditable(false)}
            autoFocus
        />
      ) : (
        <p style={{ fontSize: `${fontSize}px`, color, textAlign }} className="leading-relaxed">
          {text}
        </p>
      )}
    </div>
  );
};
Text.craft = {
  props: { text: "Haz clic para editar texto", fontSize: 16, color: '#000000', textAlign: 'left' }
};

/**
 * 🖼️ Image Component
 */
export const Image = ({ src, alt, ...props }: any) => {
  const { connectors: { connect, drag } } = useNode();
  return (
    <div ref={(ref: any) => connect(drag(ref))} className="w-full overflow-hidden border border-black/10" {...props}>
      {src ? (
        <img src={src.startsWith('http') ? src : `http://localhost:3000/uploads/${src}`} alt={alt} className="w-full h-auto object-cover" />
      ) : (
        <div className="bg-black/40 aspect-video flex flex-col items-center justify-center text-[#adaaaa] gap-2 border-2 border-dashed border-white/10">
          <i className="fi fi-rr-picture text-3xl"></i>
          <span className="text-[10px] uppercase font-black tracking-widest">No Asset Selected</span>
        </div>
      )}
    </div>
  );
};
Image.craft = {
    props: { src: '', alt: 'LiteCMS Image' }
};
