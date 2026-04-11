import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MousePointer2, MoveRight, PhoneCall, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from './supabase';

gsap.registerPlugin(ScrollTrigger);

// A simple utility to merge tailwind classes
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// -----------------------------------------------------
// COMPONENTS
// -----------------------------------------------------

// Reusable Magnetic Button
const MagneticButton = ({ children, className, onClick, variant = 'primary' }) => {
  const btnRef = useRef(null);

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;

    let ctx = gsap.context(() => {
      btn.addEventListener('mouseenter', () => {
        gsap.to(btn, { scale: 1.03, duration: 0.3, ease: 'power2.out' });
        // The span for sliding background
        gsap.to(btn.querySelector('.bg-layer'), { yPercent: 0, duration: 0.4, ease: 'power3.inOut' });
      });
      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, { scale: 1, duration: 0.3, ease: 'power2.out' });
        gsap.to(btn.querySelector('.bg-layer'), { yPercent: 100, duration: 0.4, ease: 'power3.inOut' });
      });
    }, btn);

    return () => ctx.revert();
  }, []);

  const baseStyle = "relative overflow-hidden inline-flex items-center justify-center font-sans font-bold transition-all disabled:opacity-50 select-none py-3 px-8 rounded-full border";

  const variants = {
    primary: "border-accent text-background",
    outline: "border-primary/20 text-primary hover:border-primary/50",
  };

  return (
    <button ref={btnRef} onClick={onClick} className={cn(baseStyle, variants[variant], className)}>
      <span
        className={cn("bg-layer absolute inset-0 z-0", variant === 'primary' ? "bg-accent" : "bg-primary/10")}
        style={{ transform: variant === 'primary' ? 'translateY(0)' : 'translateY(100%)' }}
      />
      {variant === 'primary' && <span className="bg-layer absolute inset-0 z-0 bg-[#E09D5B]" style={{ transform: 'translateY(100%)' }} />}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
};

// Navbar: Morphing from transparent to dark blur
const Navbar = () => {
  const navRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      ScrollTrigger.create({
        start: 'top -50',
        end: 99999,
        toggleClass: { className: 'nav-scrolled', targets: navRef.current }
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <header
      ref={navRef}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 rounded-full px-6 py-3 w-[90%] max-w-5xl flex items-center justify-between [&.nav-scrolled]:bg-background/80 [&.nav-scrolled]:backdrop-blur-xl [&.nav-scrolled]:border [&.nav-scrolled]:border-primary/10"
    >
      <div className="flex items-center gap-3">
        <div className="font-heading font-bold text-xl tracking-wide flex items-center gap-2">
          <img src="/download.png" alt="Pitch Pine" className="h-10 w-auto object-contain" />
          <span className="text-accent">|</span> PITCH PINE
        </div>
      </div>
      <nav className="hidden md:flex gap-8 font-sans font-medium text-sm">
        {['الفلسفة', 'المراحل'].map((item) => (
          <a key={item} href={`#${item}`} className="hover:text-accent transition-colors hover:-translate-y-[1px] inline-block">{item}</a>
        ))}
        <a
          href="#/gallery"
          onClick={(e) => { e.preventDefault(); window.location.hash = '#/gallery'; }}
          className="hover:text-accent transition-colors hover:-translate-y-[1px] inline-block"
        >
          معرض الأعمال
        </a>
      </nav>
      <MagneticButton className="flex py-2 px-5 text-sm" variant="outline" onClick={() => window.location.href = 'tel:+201017781162'}>
        احجز استشارة <PhoneCall size={16} />
      </MagneticButton>
    </header>
  );
};

// Hero
const FRAME_COUNT = 67;
const FRAME_PATH = (i) => `/frames/${String(i).padStart(4, '0')}.jpg`;

const Hero = () => {
  const heroRef = useRef(null);
  const canvasRef = useRef(null);
  const framesRef = useRef([]);
  const currentFrameRef = useRef(0);

  useEffect(() => {
    let ctx = gsap.context(() => {
      gsap.from('.hero-text', {
        y: 40,
        opacity: 0,
        stagger: 0.15,
        duration: 1.2,
        ease: 'power3.out',
        delay: 0.2
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  // Preload all frames then drive canvas with ScrollTrigger
  useEffect(() => {
    const canvas = canvasRef.current;
    const section = heroRef.current;
    if (!canvas || !section) return;

    const ctx2d = canvas.getContext('2d');
    const images = new Array(FRAME_COUNT);
    let loaded = 0;

    const drawFrame = (index) => {
      const img = images[index];
      if (!img || !img.complete) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      // cover fit
      const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;
      ctx2d.drawImage(img, x, y, w, h);
    };

    let trigger;

    const setupScrollTrigger = () => {
      trigger = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate(self) {
          const frame = Math.min(FRAME_COUNT - 1, Math.floor(self.progress * FRAME_COUNT));
          if (frame !== currentFrameRef.current) {
            currentFrameRef.current = frame;
            drawFrame(frame);
          }
        },
      });
    };

    const onAllLoaded = () => {
      framesRef.current = images;
      drawFrame(0);
      setupScrollTrigger();
    };

    // Load all frames
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = FRAME_PATH(i + 1);
      img.onload = () => {
        loaded++;
        if (loaded === FRAME_COUNT) onAllLoaded();
      };
      img.onerror = () => {
        loaded++;
        if (loaded === FRAME_COUNT) onAllLoaded();
      };
      images[i] = img;
    }

    return () => {
      trigger?.kill();
    };
  }, []);

  return (
    <section ref={heroRef} className="relative" style={{ height: '200vh' }}>
      <div className="sticky top-0 h-[100dvh] flex items-end pb-8 lg:pb-12 px-6 lg:px-24 overflow-hidden">
        {/* Canvas image sequence (replaces video) */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full z-0 opacity-50"
        />
        {/* Heavy gradient overlay */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-background via-background/60 to-transparent" />

        <div className="relative z-10 w-full max-w-5xl pt-24 text-right ml-auto">
          <h1 className="flex flex-col gap-3">
            <span className="hero-text text-2xl md:text-3xl lg:text-4xl font-heading font-bold text-primary/80 block">
              بيتش باين هي
            </span>
            <span className="hero-text text-6xl md:text-[5.5rem] lg:pb-12 xl:text-[6.5rem] font-drama font-bold text-transparent bg-clip-text bg-gradient-to-br from-[#F4EFE6] via-[#D48C46] to-[#8A5A29] leading-[1.2] pt-2 block pl-0 drop-shadow-sm">
              الفخامة المطلقة في عالم المطابخ.
            </span>
          </h1>
          <div className="hero-text w-24 h-1 bg-gradient-to-l from-accent to-transparent ml-auto mb-6"></div>
          <p className="hero-text text-lg lg:text-2xl text-primary/70 font-sans max-w-2xl ml-auto leading-relaxed">
            نصنع مطابخ استثنائية تمزج بين الحرفية الرفيعة والتصميم المبتكر لتلائم ذوقك الرفيع.
          </p>
          <div className="hero-text mt-12">
            <MagneticButton className="text-lg" onClick={() => window.location.href = 'tel:+201017781162'}>
              احجز استشارتك الآن <PhoneCall size={20} className="mr-2" />
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  );
};

// Feature Card 1: Diagnostic Shuffler
const ShufflerCard = () => {
  const [items, setItems] = useState(['تصميم سريع ومبتكر', 'تواصل سلس', 'تنفيذ فوري ودقيق']);

  useEffect(() => {
    const interval = setInterval(() => {
      setItems(prev => {
        const next = [...prev];
        next.unshift(next.pop());
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-surface border border-primary/10 rounded-[2rem] p-8 shadow-2xl relative h-64 overflow-hidden flex flex-col justify-between group hover:border-primary/20 transition-colors">
      <div>
        <h3 className="font-heading font-bold text-2xl text-primary">تجربة سريعة وسلسة</h3>
        <p className="text-primary/60 font-sans mt-2 text-sm">نختصر المسافات بين تخيلك والواقع في خطوات سلسة.</p>
      </div>
      <div className="relative h-24 mt-4 w-full flex justify-center items-end">
        {items.map((item, i) => (
          <div
            key={item}
            className="absolute rounded-xl px-4 py-3 border w-[85%] text-center text-sm font-bold font-sans transition-all duration-700"
            style={{
              bottom: `${i * 10}px`,
              zIndex: 10 - i,
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
              borderColor: i === 0 ? 'rgba(212, 140, 70, 0.5)' : 'rgba(244, 239, 230, 0.03)',
              background: i === 0 ? 'rgba(212, 140, 70, 0.1)' : 'rgba(26, 19, 14, 0.6)',
              color: i === 0 ? '#D48C46' : 'transparent',
              boxShadow: i === 0 ? '0 8px 24px rgba(0,0,0,0.4)' : 'none',
              transform: `scale(${1 - (i * 0.04)})`,
              opacity: i === 0 ? 1 : 0.4
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};

// Feature Card 2: Telemetry Typewriter
const TypewriterCard = () => {
  const [text, setText] = useState('');
  const fullText = "جودة لا تضاهى.. أخشاب متينة وتشطيب يخطف الأنظار، ومواد تعيش لأجيال.";

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setText(fullText.slice(0, index));
      index++;
      if (index > fullText.length) index = 0; // loop
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-surface border border-primary/10 rounded-[2rem] p-8 shadow-2xl relative h-64 flex flex-col justify-between hover:border-primary/20 transition-colors">
      <div className="absolute top-8 left-8 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        <span className="text-xs font-mono text-primary/50 tracking-wider">LIVE FEED</span>
      </div>
      <div>
        <h3 className="font-heading font-bold text-2xl text-primary">نتائج موثوقة</h3>
        <p className="text-primary/60 font-sans mt-2 text-sm">الجودة هي المعيار الأول الثابت لا يتغير.</p>
      </div>
      <div className="bg-background/50 rounded-xl p-4 font-mono text-sm text-primary/80 h-24 overflow-hidden border border-primary/5">
        <span className="text-accent">{'> '}</span>
        {text}
        <span className="w-2 h-4 inline-block bg-accent ml-1 -mb-1 animate-pulse" />
      </div>
    </div>
  );
};

// Feature Card 3: Cursor Protocol Scheduler
const SchedulerCard = () => {
  const containerRef = useRef(null);
  const cursorRef = useRef(null);
  const cellRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const cell = cellRef.current;
    const btn = btnRef.current;
    if (!cursor || !cell || !btn) return;

    const getRelPos = (target) => {
      const cRect = cursor.parentElement.getBoundingClientRect();
      const tRect = target.getBoundingClientRect();
      return {
        x: tRect.left + tRect.width / 2 - (cRect.left + cRect.width / 2),
        y: tRect.top + tRect.height / 2 - (cRect.top + cRect.height / 2)
      };
    };

    let ctx = gsap.context(() => {
      const buildTimeline = () => {
        const cellPos = getRelPos(cell);
        const btnPos = getRelPos(btn);

        const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.5 });
        tl.to(cursor, { x: cellPos.x, y: cellPos.y, duration: 1, ease: 'power2.inOut' })
          .to(cursor, { scale: 0.8, duration: 0.1, yoyo: true, repeat: 1 })
          .to(cell, { backgroundColor: 'rgba(212, 140, 70, 0.2)', borderColor: '#D48C46', duration: 0.2, color: '#D48C46' }, '-=0.1')
          .to(cursor, { x: btnPos.x, y: btnPos.y, duration: 0.8, ease: 'power2.inOut', delay: 0.4 })
          .to(cursor, { scale: 0.8, duration: 0.1, yoyo: true, repeat: 1 })
          .to(btn, { backgroundColor: '#D48C46', color: '#0A0705', duration: 0.2 }, '-=0.1')
          .to(cursor, { opacity: 0, duration: 0.3, delay: 0.5 })
          .set(cell, { backgroundColor: 'transparent', borderColor: 'rgba(244, 239, 230, 0.1)', color: '#F4EFE6' })
          .set(btn, { backgroundColor: 'rgba(244, 239, 230, 0.05)', color: 'rgba(244, 239, 230, 0.8)' })
          .set(cursor, { x: 0, y: 0, opacity: 1 });
        return tl;
      };

      buildTimeline();
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const days = ['11', '12', '13', '14', '15', '16', '17'];

  return (
    <div ref={containerRef} className="bg-surface border border-primary/10 rounded-[2rem] p-8 shadow-2xl relative h-64 flex flex-col justify-between overflow-hidden hover:border-primary/20 transition-colors">
      <div>
        <h3 className="font-heading font-bold text-2xl text-primary">خدمة مخصصة</h3>
        <p className="text-primary/60 font-sans mt-2 text-sm">نحن نكيف أوقاتنا وخدماتنا لتتلائم مع جدولك ومتطلباتك لتجربة استثنائية.</p>
      </div>
      <div className="relative mt-4 bg-background/50 p-4 rounded-xl border border-primary/5 flex flex-col gap-3 items-center">
        <div className="flex gap-1 xl:gap-2">
          {days.map((d, i) => (
            <div key={i} ref={i === 2 ? cellRef : null} className={cn("w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-md border border-primary/10 text-xs font-mono", i === 2 ? "cell-active" : "")}>
              {d}
            </div>
          ))}
        </div>
        <div ref={btnRef} className="btn-save text-[10px] bg-primary/5 py-1 px-4 rounded-full border border-primary/10 tracking-widest text-primary/80">
          حفظ الموعد
        </div>
        <div ref={cursorRef} className="anim-cursor absolute text-primary drop-shadow-md z-10 pointer-events-none" style={{ top: '50%', right: '50%' }}>
          <MousePointer2 fill="currentColor" size={24} />
        </div>
      </div>
    </div>
  );
};

const Features = () => {
  const sectionRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      gsap.from('.feature-card', {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
        },
        y: 60,
        opacity: 0,
        stagger: 0.15,
        duration: 1,
        ease: 'power3.out'
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 px-6 lg:px-24 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="feature-card"><ShufflerCard /></div>
          <div className="feature-card"><TypewriterCard /></div>
          <div className="feature-card"><SchedulerCard /></div>
        </div>
      </div>
    </section>
  );
};

// Philosophy Manifest
const Philosophy = () => {
  const sectionRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      gsap.from('.phil-word', {
        scrollTrigger: {
          trigger: textRef.current,
          start: 'top 80%',
        },
        opacity: 0,
        y: 20,
        stagger: 0.08,
        duration: 0.8,
        ease: 'power3.out'
      });

      gsap.to('.bg-texture', {
        scrollTrigger: {
          trigger: textRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1
        },
        y: 100,
        ease: 'none'
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const part1 = "معظم الشركات تركز على: الإنتاج السريع والتصاميم المكررة العادية.".split(" ");
  const part2 = "نحن نركز على:".split(" ");
  const highlight = "تحفة فنية".split(" ");
  const part3 = "تُصنع خصيصاً لك، تدوم لأجيال.".split(" ");

  return (
    <section id="الفلسفة" ref={sectionRef} className="relative py-28 px-6 lg:px-24 overflow-hidden bg-dark">
      <div
        className="bg-texture absolute inset-0 z-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop)', top: '-50px', height: 'calc(100% + 100px)' }}
      />
      <div className="absolute inset-0 bg-dark/60 z-0" />

      <div ref={textRef} className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center justify-center space-y-16">
        <h2 className="text-xl md:text-2xl font-sans text-primary/60 font-medium max-w-2xl leading-relaxed">
          {part1.map((w, i) => <span key={i} className="phil-word inline-block ml-2">{w}</span>)}
        </h2>
        <div className="text-4xl md:text-5xl lg:text-[5.5rem] font-drama mt-8 leading-[1.35] text-primary drop-shadow-sm flex flex-col gap-1 md:gap-3">
          <div>
            {part2.map((w, i) => <span key={'p2' + i} className="phil-word inline-block ml-3">{w}</span>)}
          </div>
          <div>
            {highlight.map((w, i) => <span key={'hl' + i} className="phil-word inline-block font-bold text-accent ml-3">{w}</span>)}
            {part3.map((w, i) => <span key={'p3' + i} className="phil-word inline-block ml-3">{w}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
};

// Protocol Archive with Stacking Cards
const Protocol = () => {
  const containerRef = useRef(null);
  const steps = [
    { num: '01', title: 'الاستشارة والتصميم', desc: 'نقوم بالاستماع بدقة لاحتياجاتك ونترجم أفكارك إلى تصاميم هندسية دقيقة لا تقبل الخطأ.', Graphic: RotatingMotif },
    { num: '02', title: 'التنفيذ الحرفي', desc: 'أخشابنا العالية الجودة تتشكل في ورشنا عبر أيدي أمهر الحرفيين، مزيج بين التكنولوجيا الحديثة والإتقان اليدوي.', Graphic: LaserGrid },
    { num: '03', title: 'التركيب المتقن', desc: 'متخصصون يراجعون كل مليمتر في موقعك لضمان مطبخ أحلامك يعمل ويتألق تماماً كما أردت.', Graphic: Waveform }
  ];

  useEffect(() => {
    let ctx = gsap.context(() => {
      let cards = gsap.utils.toArray('.prot-card-inner');

      cards.forEach((card, i) => {
        if (i !== cards.length - 1) {
          gsap.to(card, {
            scale: 0.9,
            opacity: 0.5,
            filter: 'blur(4px)',
            scrollTrigger: {
              trigger: cards[i + 1],
              start: 'top bottom-=100',
              end: 'top top+=100',
              scrub: true
            }
          });
        }
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="المراحل" ref={containerRef} className="bg-background relative pt-24">
      <div className="px-6 lg:px-24 w-full text-center md:text-right mb-16">
        <h2 className="text-4xl font-heading font-bold text-primary">مراحل التنفيذ</h2>
      </div>
      <div className="relative flex flex-col gap-8 lg:gap-24">
        {steps.map((step, i) => (
          <div key={i} className="prot-card sticky top-24 w-full min-h-[70vh] flex items-center justify-center px-4 lg:px-24" style={{ zIndex: i + 1 }}>
            <div className="prot-card-inner bg-surface w-full max-w-6xl p-8 md:p-24 rounded-[3rem] shadow-2xl border border-primary/10 flex flex-col md:flex-row items-center gap-16 justify-between origin-top transition-all">
              <div className="w-full md:w-1/2">
                <span className="font-mono text-accent text-6xl opacity-50 block mb-6">{step.num}</span>
                <h3 className="font-heading font-bold text-3xl md:text-4xl text-primary mb-4">{step.title}</h3>
                <p className="font-sans text-xl text-primary/70 leading-relaxed">{step.desc}</p>
              </div>
              <div className="w-full md:w-1/2 flex justify-center items-center h-64 md:h-auto bg-dark/50 rounded-[2rem] p-8 glass-panel border border-primary/5">
                {<step.Graphic />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

// SVGs for Protocol
const RotatingMotif = () => {
  return (
    <svg viewBox="0 0 100 100" className="w-48 h-48 animate-[spin_20s_linear_infinite] opacity-80 text-accent">
      <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
      <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M50 10 v15 M50 90 v-15 M10 50 h15 M90 50 h-15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="42" y="42" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1" transform="rotate(45 50 50)" />
    </svg>
  )
}

const LaserGrid = () => {
  return (
    <div className="relative w-full h-full min-h-[200px] overflow-hidden flex flex-wrap gap-2 content-center justify-center">
      {[...Array(40)].map((_, i) => <div key={i} className="w-2 h-2 rounded-full bg-primary/20" />)}
      <div className="absolute top-0 left-0 h-full w-[150%] bg-gradient-to-r from-transparent via-accent/30 to-transparent animate-[scan_3s_ease-in-out_infinite]" style={{ transform: 'skewX(-20deg)', left: '-100%' }} />
      <style>{`
                    @keyframes scan {
                        0% { left: -100%; }
                        100% { left: 100%; }
                    }
               `}</style>
    </div>
  )
}

const Waveform = () => {
  return (
    <svg viewBox="0 0 200 50" className="w-full h-auto text-accent drop-shadow-[0_0_8px_rgba(212,140,70,0.8)]">
      <path
        d="M0,25 h40 l15,-20 l15,40 l10,-35 l15,40 l20,-50 l15,25 h70"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        className="animate-[dash_3s_ease-out_infinite]"
        style={{ strokeDasharray: '300', strokeDashoffset: '300' }}
      />
      <style>{`
                 @keyframes dash {
                     to { stroke-dashoffset: 0; }
                 }
             `}</style>
    </svg>
  )
}

// CTA / Pricing (Adapted as "Get Started")
const GetStarted = () => {
  return (
    <section className="py-12 px-6 lg:px-24 bg-background">
      <div className="max-w-5xl mx-auto text-center border p-12 lg:p-24 border-primary/10 rounded-[3rem] bg-gradient-to-b from-surface to-background relative overflow-hidden group">
        <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <h2 className="text-4xl lg:text-5xl font-heading font-bold text-primary mb-6 relative z-10">هل أنت مستعد لمطبخ أحلامك؟</h2>
        <p className="text-xl text-primary/70 font-sans mb-12 max-w-2xl mx-auto relative z-10">
          احجز استشارتك الآن ودع خبراء "بيتش باين" يخططون لمساحتك بأعلى معايير الجودة العالمية.
        </p>
        <MagneticButton className="text-xl py-4 px-12 relative z-10" onClick={() => window.location.href = 'tel:+201017781162'}>
          احجز استشارتك الآن <PhoneCall className="mr-2" size={24} />
        </MagneticButton>
      </div>
    </section>
  );
};

// Footer
const Footer = () => {
  return (
    <footer className="bg-[#0A0705] pt-24 pb-12 px-6 lg:px-24 rounded-t-[4rem] text-primary relative z-20">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        <div className="md:col-span-2">
          <h2 className="text-3xl font-heading font-bold mb-4 flex items-center gap-2">
            <img src="/download.png" alt="Pitch Pine" className="h-10 w-auto object-contain" />
          <span className="text-accent">|</span> PITCH PINE
          </h2>
          <p className="text-primary/60 font-sans max-w-sm leading-relaxed mb-8">
            بيتش باين لخدمات الأعمال الخشبية والمطابخ. نفخر بإنتاج تحف فنية بجودة قياسية في بني سويف، مصر لكل مساحة.
          </p>
          <div className="flex items-center gap-3 bg-surface/50 p-4 rounded-2xl w-fit border border-primary/5">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <span className="font-mono text-sm tracking-widest text-primary/80">SYSTEM OPERATIONAL</span>
          </div>
        </div>
        <div>
          <h4 className="font-heading font-bold text-lg mb-6">الروابط</h4>
          <ul className="space-y-4 font-sans text-primary/70">
            <li><a href="#" className="hover:text-accent transition-colors">الرئيسية</a></li>
            <li><a href="#الفلسفة" className="hover:text-accent transition-colors">فلسفتنا</a></li>
            <li><a href="#المراحل" className="hover:text-accent transition-colors">كيف نعمل</a></li>
            <li><a href="#" className="hover:text-accent transition-colors">اتصل بنا</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-bold text-lg mb-6">تواصل معنا</h4>
          <ul className="space-y-4 font-sans text-primary/70">
            <li className="leading-relaxed">بني سويف - شارع الروضة - برج الروضة - أمام نهاية سور مدرسة الثانوية العسكرية</li>
            <li dir="ltr" className="text-right"><a href="tel:+201017781162" className="hover:text-accent transition-colors">010 17781162</a></li>
            <li>hisham.yousef@gmail.com</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary/10 pt-8 flex flex-col md:flex-row justify-between items-center text-sm font-sans text-primary/40 max-w-6xl mx-auto">
        <p>&copy; {new Date().getFullYear()} Pitch Pine. جميع الحقوق محفوظة.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <a href="#" className="hover:text-primary transition-colors">سياسة الخصوصية</a>
          <a href="#" className="hover:text-primary transition-colors">الشروط والأحكام</a>
        </div>
      </div>
    </footer>
  );
};

// Gallery Section
const GallerySection = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4);
      if (!error && data) setProjects(data);
      setLoading(false);
    };
    fetchProjects();
  }, []);

  return (
    <section id="أعمالنا" className="relative pb-32 px-6 lg:px-24">
      <div className="max-w-6xl mx-auto mb-16">
        <h2 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-4">أعمالنا</h2>
        <p className="text-primary/60 font-sans max-w-lg leading-relaxed">
          تصفح معرض مشاريعنا المميزة واكتشف كيف نحول المساحات إلى تحف فنية.
        </p>
      </div>

      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="h-64 flex items-center justify-center border border-primary/5 rounded-[2rem] bg-surface">
            <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border border-primary/5 rounded-[2rem] bg-surface/50 text-center p-6">
            <ImageIcon className="w-12 h-12 text-primary/20 mb-4" />
            <h3 className="text-xl font-heading text-primary/60 mb-2">معرض الأعمال قيد التجهيز</h3>
            <p className="text-sm border text-primary/40 p-2 rounded max-w-sm" style={{ borderColor: 'rgba(212, 140, 70, 0.4)' }}>سنقوم بنشر أحدث مشاريعنا المكتملة هنا قريباً.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map((p) => {
                const coverImage = p.images && p.images.length > 0 ? p.images[p.cover_index || 0] : 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070&auto=format&fit=crop';
                return (
                  <div
                    key={p.id}
                    onClick={() => { window.location.hash = `#/project/${p.id}`; }}
                    className="group relative cursor-pointer h-80 rounded-[2rem] overflow-hidden border border-primary/10 shadow-xl"
                  >
                    <img
                      src={coverImage}
                      alt={p.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent transition-opacity group-hover:opacity-90" />
                    <div className="absolute bottom-0 left-0 right-0 p-8 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      <h3 className="text-2xl font-heading font-bold text-primary mb-2">{p.title}</h3>
                      <p className="text-sm text-primary/70 line-clamp-2">{p.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-10 flex justify-center md:justify-end">
              <button
                onClick={() => { window.location.hash = '#/gallery'; }}
                className="flex items-center gap-2 text-accent hover:text-accent/80 font-sans font-medium transition-colors group"
              >
                عرض كل المشاريع
                <MoveRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform rotate-180" />
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

// Full Gallery Page
const GalleryPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setProjects(data);
      setLoading(false);
    };
    fetchProjects();
  }, []);

  return (
    <div className="min-h-screen bg-background relative text-primary selection:bg-accent/30 selection:text-white">
      <div className="noise-overlay" />

      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-primary/10 px-6 lg:px-24 py-5 flex items-center justify-between">
        <button
          onClick={() => { window.location.hash = '#/'; }}
          className="flex items-center gap-2 text-primary/70 hover:text-accent transition-colors font-sans font-medium text-sm"
        >
          <ChevronRight className="w-4 h-4" />
          العودة للرئيسية
        </button>
        <div className="font-heading font-bold text-xl tracking-wide flex items-center gap-2">
          <img src="/download.png" alt="Pitch Pine" className="h-10 w-auto object-contain" />
          <span className="text-accent">|</span> PITCH PINE
        </div>
      </header>

      <main className="pt-32 pb-24 px-6 lg:px-24">
        <div className="max-w-6xl mx-auto mb-16 text-right">
          <h1 className="text-5xl md:text-6xl font-heading font-bold text-primary mb-4">معرض أعمالنا</h1>
          <div className="w-24 h-1 bg-gradient-to-l from-accent to-transparent mr-0 ml-auto mb-6" />
          <p className="text-primary/60 font-sans max-w-xl mr-0 ml-auto leading-relaxed">
            تصفح مجموعتنا الكاملة من المشاريع المنجزة — كل مطبخ قصة فريدة من الحرفية والذوق الرفيع.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border border-primary/5 rounded-[2rem] bg-surface/50 text-center p-6">
              <ImageIcon className="w-12 h-12 text-primary/20 mb-4" />
              <h3 className="text-xl font-heading text-primary/60 mb-2">معرض الأعمال قيد التجهيز</h3>
              <p className="text-sm border text-primary/40 p-2 rounded max-w-sm" style={{ borderColor: 'rgba(212, 140, 70, 0.4)' }}>سنقوم بنشر أحدث مشاريعنا المكتملة هنا قريباً.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((p) => {
                const coverImage = p.images && p.images.length > 0
                  ? p.images[p.cover_index || 0]
                  : 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=2070&auto=format&fit=crop';
                return (
                  <div
                    key={p.id}
                    onClick={() => { window.location.hash = `#/project/${p.id}`; }}
                    className="group relative cursor-pointer h-80 rounded-[2rem] overflow-hidden border border-primary/10 shadow-xl"
                  >
                    <img
                      src={coverImage}
                      alt={p.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent transition-opacity group-hover:opacity-90" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 transform translate-y-2 group-hover:translate-y-0 transition-transform text-right">
                      <h3 className="text-xl font-heading font-bold text-primary mb-1">{p.title}</h3>
                      <p className="text-sm text-primary/70 line-clamp-2">{p.description}</p>
                      {p.images && p.images.length > 1 && (
                        <span className="text-xs font-mono text-accent mt-1 inline-block">{p.images.length} صورة</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Single Project Page
const ProjectPage = ({ projectId }) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    const fetchProject = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      if (!error && data) {
        setProject(data);
        setPhotoIndex(data.cover_index || 0);
      }
      setLoading(false);
    };
    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-primary">
        <p className="font-heading text-2xl">المشروع غير موجود</p>
        <button onClick={() => { window.location.hash = '#/'; }} className="text-accent hover:underline font-sans">العودة للرئيسية</button>
      </div>
    );
  }

  const images = project.images || [];
  const prev = () => setPhotoIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setPhotoIndex((i) => (i + 1) % images.length);

  return (
    <div className="min-h-screen bg-background relative text-primary selection:bg-accent/30 selection:text-white">
      <div className="noise-overlay" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-primary/10 px-6 lg:px-24 py-5 flex items-center justify-between">
        <button
          onClick={() => { window.location.hash = '#/gallery'; }}
          className="flex items-center gap-2 text-primary/70 hover:text-accent transition-colors font-sans font-medium text-sm"
        >
          <ChevronRight className="w-4 h-4" />
          العودة للمعرض
        </button>
        <div className="font-heading font-bold text-xl tracking-wide flex items-center gap-2">
          <img src="/download.png" alt="Pitch Pine" className="h-10 w-auto object-contain" />
          <span className="text-accent">|</span> PITCH PINE
        </div>
      </header>

      <main className="pt-28 pb-24 px-6 lg:px-24">
        <div className="max-w-5xl mx-auto">

          {/* Title */}
          <div className="text-right mb-10">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-3">{project.title}</h1>
            {project.description && (
              <p className="text-primary/60 font-sans max-w-2xl mr-0 ml-auto leading-relaxed mt-8">{project.description}</p>
            )}
            <div className="w-20 h-1 bg-gradient-to-l from-accent to-transparent mr-0 ml-auto mt-4" />
          </div>

          {/* Main image viewer */}
          {images.length > 0 ? (
            <div className="relative rounded-[2rem] overflow-hidden border border-primary/10 shadow-2xl bg-surface mb-4" style={{ aspectRatio: '16/9' }}>
              <img
                key={photoIndex}
                src={images[photoIndex]}
                alt={`${project.title} - ${photoIndex + 1}`}
                className="w-full h-full object-cover"
              />
              {images.length > 1 && (
                <>
                  <button onClick={prev} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-background/60 hover:bg-background/90 backdrop-blur-md rounded-full text-primary transition-colors">
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  <button onClick={next} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-background/60 hover:bg-background/90 backdrop-blur-md rounded-full text-primary transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/70 backdrop-blur-md px-4 py-1.5 rounded-full font-mono text-xs text-accent">
                    {photoIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </div>
          ) : null}

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 mb-10">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setPhotoIndex(i)}
                  className={cn(
                    "flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all",
                    i === photoIndex ? "border-accent scale-105" : "border-primary/10 opacity-60 hover:opacity-100"
                  )}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <MagneticButton className="text-base px-10 py-4" onClick={() => window.location.href = 'tel:+201017781162'}>
              احجز استشارتك الآن <PhoneCall size={18} className="mr-2" />
            </MagneticButton>
            <MagneticButton
              variant="outline"
              className="text-base px-10 py-4"
              onClick={() => { window.location.hash = '#/'; }}
            >
              العودة للرئيسية <MoveRight size={18} className="mr-2 rotate-180" />
            </MagneticButton>
          </div>

        </div>
      </main>
    </div>
  );
};

const MainLanding = () => {
  return (
    <div className="min-h-screen bg-background relative text-primary selection:bg-accent/30 selection:text-white">
      <div className="noise-overlay" />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <GallerySection />
        <Philosophy />
        <Protocol />
        <GetStarted />
      </main>
      <Footer />
    </div>
  );
};

import AdminGallery from './AdminGallery';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState(window.location.hash || '#/');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (currentRoute.startsWith('#/admin')) {
    return <AdminGallery />;
  }

  if (currentRoute.startsWith('#/gallery')) {
    return <GalleryPage />;
  }

  if (currentRoute.startsWith('#/project/')) {
    const projectId = currentRoute.replace('#/project/', '');
    return <ProjectPage projectId={projectId} />;
  }

  return <MainLanding />;
}
