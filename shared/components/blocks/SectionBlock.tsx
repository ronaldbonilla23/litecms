import React from 'react';
import { useNode } from '@craftjs/core';
import { ContainerSettings } from './ContainerBlock';

export const SectionBlock = ({
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

  const sectionStyle: React.CSSProperties = {
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
    outline: selected ? '2px solid #C2F86C' : 'none',
    outlineOffset: '-2px'
  };

  return (
    <section 
      ref={(ref : any) => connect(drag(ref))}
      style={sectionStyle}
      {...props}
    >
      {selected && (
        <div className="absolute top-0 left-0 bg-[#C2F86C] text-black text-[8px] font-black px-2 py-0.5 z-50 uppercase tracking-widest leading-none pointer-events-none" style={{borderRadius:0}}>
          Section
        </div>
      )}
      {children}
    </section>
  );
};

SectionBlock.craft = {
  props: {
    width: '100%',
    height: 'auto',
    minHeight: '50vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0',
    paddingTop: '4rem',
    paddingRight: '2rem',
    paddingBottom: '4rem',
    paddingLeft: '2rem',
    marginTop: '0',
    marginRight: '0',
    marginBottom: '0',
    marginLeft: '0',
    backgroundColor: 'transparent'
  },
  related: {
    settings: ContainerSettings
  }
};
