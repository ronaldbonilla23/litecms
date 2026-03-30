import React from 'react';
import { useNode } from '@craftjs/core';

export const ContainerBlock = ({
  width,
  height,
  minHeight,
  display,
  flexDirection,
  justifyContent,
  alignItems,
  gap,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  marginTop,
  marginRight,
  marginBottom,
  marginLeft,
  backgroundColor,
  children,
  ...props
}: any) => {
  const { connectors: { connect, drag }, selected } = useNode((state) => ({
    selected: state.events.selected
  }));

  const containerStyle: React.CSSProperties = {
    width,
    height,
    minHeight,
    display,
    flexDirection,
    justifyContent,
    alignItems,
    gap,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    backgroundColor,
    position: 'relative',
    outline: selected ? '1px dashed #C2F86C' : 'none',
    outlineOffset: '-1px'
  };

  return (
    <div 
      ref={(ref : any) => connect(drag(ref))}
      style={containerStyle}
      {...props}
    >
      {selected && (
        <div className="absolute top-0 right-0 bg-[#C2F86C] text-black text-[7px] font-black px-1.5 py-0.5 z-50 uppercase tracking-widest leading-none pointer-events-none" style={{borderRadius:0}}>
          Container
        </div>
      )}
      {children}
    </div>
  );
};

export const ContainerSettings = () => {
    const { actions: { setProp }, props } = useNode((node) => ({
        props: node.data.props,
    }));

    const Group = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <div className="mb-8 last:mb-0">
            <h5 className="text-[#C2F86C] text-[10px] font-black uppercase tracking-widest mb-4 border-b border-[#C2F86C]/20 pb-2">{title}</h5>
            <div className="space-y-4">{children}</div>
        </div>
    );

    // Buffered text input — only commits to Craft.js on blur/Enter to avoid focus loss
    const Control = ({ label, propName, type = 'text', options = [] }: any) => {
        const [localVal, setLocalVal] = React.useState(props[propName] ?? '');

        // Stay in sync when a different node is selected
        React.useEffect(() => {
            setLocalVal(props[propName] ?? '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [props[propName]]);

        const commit = (val: string) => setProp((p: any) => { p[propName] = val; });

        if (type === 'select') {
            return (
                <div className="flex flex-col gap-1.5">
                    <label className="text-gray-400 text-[9px] font-bold uppercase tracking-wider">{label}</label>
                    <select
                        value={props[propName] || ''}
                        onChange={(e) => setProp((p: any) => { p[propName] = e.target.value; })}
                        className="bg-[#141414] border border-[#C2F86C]/20 rounded-lg px-3 py-2 text-white text-[11px] focus:outline-none focus:border-[#C2F86C] transition-all"
                    >
                        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
            );
        }

        if (type === 'color') {
            return (
                <div className="flex flex-col gap-1.5">
                    <label className="text-gray-400 text-[9px] font-bold uppercase tracking-wider">{label}</label>
                    <input
                        type="color"
                        value={props[propName] || '#141414'}
                        onChange={(e) => setProp((p: any) => { p[propName] = e.target.value; })}
                        className="h-10 w-full rounded-lg border border-[#C2F86C]/20 cursor-pointer bg-[#141414]"
                    />
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 text-[9px] font-bold uppercase tracking-wider">{label}</label>
                <input
                    type="text"
                    value={localVal}
                    onChange={(e) => setLocalVal(e.target.value)}
                    onBlur={(e) => commit(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') commit(localVal); }}
                    className="bg-[#141414] border border-[#C2F86C]/20 rounded-lg px-3 py-2 text-white text-[11px] focus:outline-none focus:border-[#C2F86C] transition-all"
                    placeholder="e.g. 100%, 2rem, auto"
                />
            </div>
        );
    };

    return (
        <div className="p-4 overflow-x-hidden">
            <Group title="Layout">
                <Control label="Width" propName="width" />
                <div className="grid grid-cols-2 gap-3">
                    <Control label="Height" propName="height" />
                    <Control label="Min-Height" propName="minHeight" />
                </div>
                <Control label="Display" propName="display" type="select" options={['block', 'flex', 'grid', 'none']} />
                {props.display === 'flex' && (
                    <div className="grid grid-cols-2 gap-3 pl-2 border-l border-white/5 mt-2">
                        <Control label="Direction" propName="flexDirection" type="select" options={['row', 'column', 'row-reverse', 'column-reverse']} />
                        <Control label="Justify" propName="justifyContent" type="select" options={['start', 'center', 'end', 'between', 'around', 'evenly']} />
                        <Control label="Align" propName="alignItems" type="select" options={['start', 'center', 'end', 'stretch', 'baseline']} />
                        <Control label="Gap" propName="gap" />
                    </div>
                )}
            </Group>

            <Group title="Spacing">
                <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                    <Control label="Padding Top" propName="paddingTop" />
                    <Control label="Padding Right" propName="paddingRight" />
                    <Control label="Padding Bottom" propName="paddingBottom" />
                    <Control label="Padding Left" propName="paddingLeft" />
                </div>
                <div className="h-px bg-white/5 my-4"></div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                    <Control label="Margin Top" propName="marginTop" />
                    <Control label="Margin Right" propName="marginRight" />
                    <Control label="Margin Bottom" propName="marginBottom" />
                    <Control label="Margin Left" propName="marginLeft" />
                </div>
            </Group>

            <Group title="Background">
                <Control label="Color" propName="backgroundColor" type="color" />
                <Control label="Hex / Raw Value" propName="backgroundColor" />
            </Group>
        </div>
    );
};


ContainerBlock.craft = {
  props: {
    width: '100%',
    height: 'auto',
    minHeight: '100px',
    display: 'block',
    flexDirection: 'column',
    justifyContent: 'start',
    alignItems: 'stretch',
    gap: '0',
    paddingTop: '0',
    paddingRight: '0',
    paddingBottom: '0',
    paddingLeft: '0',
    marginTop: '0',
    marginRight: '0',
    marginBottom: '0',
    marginLeft: '0',
    backgroundColor: 'transparent',
  },
  related: {
    settings: ContainerSettings
  }
};
