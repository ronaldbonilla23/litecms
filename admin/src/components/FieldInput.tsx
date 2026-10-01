import type { FieldDefinition } from '../../../shared/contentTypes';
import RichTextEditor from './RichTextEditor';
import MediaPicker from './MediaPicker';

interface FieldInputProps {
  field: FieldDefinition;
  value: unknown;
  error?: string | undefined;
  onChange: (value: unknown) => void;
}

const inputClass = 'w-full bg-[#141414] border border-white/10 text-white px-4 py-3 rounded-xl focus:border-primary outline-none';

/**
 * Renderiza el control adecuado para cada tipo de campo del tipo de contenido.
 */
export default function FieldInput({ field, value, error, onChange }: FieldInputProps) {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value) : '';

  const control = (() => {
    switch (field.type) {
      case 'textarea':
        return <textarea rows={4} value={text} onChange={(e) => onChange(e.target.value)} className={`${inputClass} resize-y`} />;
      case 'richtext':
        return <RichTextEditor content={text} onChange={(html) => onChange(html)} />;
      case 'number':
        return <input type="number" step="any" value={text} onChange={(e) => onChange(e.target.value)} className={inputClass} />;
      case 'boolean':
        return (
          <label className="inline-flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
            <span className="w-11 h-6 rounded-full bg-white/10 peer-checked:bg-primary relative transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5"></span>
            <span className="text-sm text-gray-300">{value === true ? 'Sí' : 'No'}</span>
          </label>
        );
      case 'date':
        return <input type="date" value={text.slice(0, 10)} onChange={(e) => onChange(e.target.value)} className={inputClass} />;
      case 'image':
        return <MediaPicker value={typeof value === 'number' ? value : value ? Number(value) : null} onChange={(id) => onChange(id)} />;
      case 'select':
        return (
          <select value={text} onChange={(e) => onChange(e.target.value)} className={inputClass}>
            <option value="">— Elegir —</option>
            {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        );
      case 'url':
        return <input type="text" inputMode="url" placeholder="https://..." value={text} onChange={(e) => onChange(e.target.value)} className={inputClass} />;
      case 'email':
        return <input type="email" value={text} onChange={(e) => onChange(e.target.value)} className={inputClass} />;
      default:
        return <input type="text" value={text} onChange={(e) => onChange(e.target.value)} className={inputClass} />;
    }
  })();

  return (
    <div>
      <label className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
        {field.label}
        {field.required && <span className="text-primary">*</span>}
        <code className="normal-case tracking-normal text-gray-600">{field.key}</code>
      </label>
      {control}
      {field.help && <p className="text-xs text-gray-500 mt-2">{field.help}</p>}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
