import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  return (
    <div className="border-b border-white/10 bg-[#1a1a1a] p-2 flex flex-wrap gap-1 rounded-t-xl">
      {/* Headings */}
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
          editor.isActive('heading', { level: 1 })
            ? 'bg-primary text-black'
            : 'bg-white/5 text-gray-400 hover:text-primary hover:bg-white/10'
        }`}
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
          editor.isActive('heading', { level: 2 })
            ? 'bg-primary text-black'
            : 'bg-white/5 text-gray-400 hover:text-primary hover:bg-white/10'
        }`}
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
          editor.isActive('heading', { level: 3 })
            ? 'bg-primary text-black'
            : 'bg-white/5 text-gray-400 hover:text-primary hover:bg-white/10'
        }`}
      >
        H3
      </button>

      <div className="w-px h-6 bg-white/10 mx-1"></div>

      {/* Text formatting */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
          editor.isActive('bold')
            ? 'bg-primary text-black'
            : 'bg-white/5 text-gray-400 hover:text-primary hover:bg-white/10'
        }`}
      >
        B
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`px-3 py-1.5 rounded text-xs italic transition-all ${
          editor.isActive('italic')
            ? 'bg-primary text-black'
            : 'bg-white/5 text-gray-400 hover:text-primary hover:bg-white/10'
        }`}
      >
        I
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`px-3 py-1.5 rounded text-xs font-bold underline transition-all ${
          editor.isActive('underline')
            ? 'bg-primary text-black'
            : 'bg-white/5 text-gray-400 hover:text-primary hover:bg-white/10'
        }`}
      >
        U
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`px-3 py-1.5 rounded text-xs transition-all ${
          editor.isActive('strike')
            ? 'bg-primary text-black'
            : 'bg-white/5 text-gray-400 hover:text-primary hover:bg-white/10'
        }`}
      >
        S
      </button>

      <div className="w-px h-6 bg-white/10 mx-1"></div>

      {/* Lists */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`px-3 py-1.5 rounded text-xs transition-all ${
          editor.isActive('bulletList')
            ? 'bg-primary text-black'
            : 'bg-white/5 text-gray-400 hover:text-primary hover:bg-white/10'
        }`}
      >
        • Lista
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`px-3 py-1.5 rounded text-xs transition-all ${
          editor.isActive('orderedList')
            ? 'bg-primary text-black'
            : 'bg-white/5 text-gray-400 hover:text-primary hover:bg-white/10'
        }`}
      >
        1. Lista
      </button>

      <div className="w-px h-6 bg-white/10 mx-1"></div>

      {/* Alignment */}
      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`px-3 py-1.5 rounded text-xs transition-all ${
          editor.isActive({ textAlign: 'left' })
            ? 'bg-primary text-black'
            : 'bg-white/5 text-gray-400 hover:text-primary hover:bg-white/10'
        }`}
      >
        ← Izq
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`px-3 py-1.5 rounded text-xs transition-all ${
          editor.isActive({ textAlign: 'center' })
            ? 'bg-primary text-black'
            : 'bg-white/5 text-gray-400 hover:text-primary hover:bg-white/10'
        }`}
      >
        ↔ Centro
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`px-3 py-1.5 rounded text-xs transition-all ${
          editor.isActive({ textAlign: 'right' })
            ? 'bg-primary text-black'
            : 'bg-white/5 text-gray-400 hover:text-primary hover:bg-white/10'
        }`}
      >
        Der →
      </button>

      <div className="w-px h-6 bg-white/10 mx-1"></div>

      {/* Link */}
      <button
        onClick={() => {
          const url = prompt('Ingrese la URL:');
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        className={`px-3 py-1.5 rounded text-xs transition-all ${
          editor.isActive('link')
            ? 'bg-primary text-black'
            : 'bg-white/5 text-gray-400 hover:text-primary hover:bg-white/10'
        }`}
      >
        🔗 Link
      </button>

      {/* Image */}
      <button
        onClick={() => {
          const url = prompt('URL de la imagen:');
          if (url) editor.chain().focus().setImage({ src: url }).run();
        }}
        className="px-3 py-1.5 rounded text-xs bg-white/5 text-gray-400 hover:text-primary hover:bg-white/10 transition-all"
      >
        🖼️ Imagen
      </button>

      <div className="w-px h-6 bg-white/10 mx-1"></div>

      {/* Clear formatting */}
      <button
        onClick={() => editor.chain().focus().clearNodes().run()}
        className="px-3 py-1.5 rounded text-xs bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
      >
        ✕ Limpiar
      </button>
    </div>
  );
};

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Image,
      Color,
      TextStyle
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none px-6 py-4 min-h-[300px] focus:outline-none text-white'
      }
    }
  });

  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="bg-[#141414]" />
    </div>
  );
}
