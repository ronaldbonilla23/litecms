
export function Header() {
  return (
    <header className="w-full h-16 bg-[#0e0e0e] border-b border-[#484848]/20 flex justify-between items-center px-8 z-50">
      <div className="flex items-center gap-12">
        <div className="text-[12px] font-black text-primary tracking-tighter leading-none">
          LITE<br />CMS
        </div>
        <nav className="hidden lg:flex items-center gap-6 font-headline text-sm font-medium h-16">
          <a className="text-primary font-bold border-b-2 border-primary h-full flex items-center pt-[2px]" href="#">Overview</a>
          <a className="text-[#adaaaa] hover:text-white transition-colors h-full flex items-center pt-[2px]" href="#">Pages</a>
          <a className="text-[#adaaaa] hover:text-white transition-colors h-full flex items-center pt-[2px]" href="#">Media</a>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold font-headline leading-none">Ronald Bonilla</p>
          <p className="text-[10px] text-[#adaaaa] tracking-tighter">admin@litecms.io</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center text-primary font-bold">
          RB
        </div>
      </div>
    </header>
  );
}
