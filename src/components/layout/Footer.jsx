import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Youtube, Github, Mail, Phone, MapPin, Terminal, ChevronRight } from 'lucide-react';

const Footer = () => {
  const canvasRef = useRef(null);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  // Particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });

    let w = 0, h = 0;
    const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let particles = [];
    let rafId = 0;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const rand = (min, max) => Math.random() * (max - min) + min;

    function initParticles() {
      const count = prefersReduced ? Math.floor(w * h / 90000) : Math.floor(w * h / 50000);
      const target = Math.max(15, Math.min(80, count));
      particles = new Array(target).fill(0).map(() => {
        const speedScale = prefersReduced ? 0.35 : 1;
        const r = rand(0.5, 1.5);
        const hue = Math.random() < 0.5 ? 187 : 158; // primary cyan / secondary green
        const alpha = rand(0.2, 0.5);
        return {
          x: rand(0, w),
          y: rand(0, h),
          r,
          vx: rand(-0.05, 0.05) * speedScale,
          vy: rand(-0.2, -0.05) * speedScale,
          hue,
          alpha,
          tw: rand(0.8, 2.0),
        };
      });
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      initParticles();
    }

    let last = performance.now();
    function tick(now) {
      const dt = Math.min(33, now - last);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx * dt * 0.06;
        p.y += p.vy * dt * 0.06;
        if (p.x < -5) p.x = w + 5;
        if (p.x > w + 5) p.x = -5;
        if (p.y < -5) { p.y = h + 5; p.x = rand(0, w); }
        const t = (now * 0.001) / p.tw;
        const a = p.alpha * (0.75 + 0.25 * Math.sin(t));
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        grad.addColorStop(0, `hsla(${p.hue} 100% 60% / ${a})`);
        grad.addColorStop(1, `hsla(${p.hue} 100% 50% / 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!prefersReduced) rafId = requestAnimationFrame(tick);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    if (!prefersReduced) rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  const navSections = [
    {
      title: 'Usługi',
      links: [
        { name: 'Cennik', path: '/cennik' },
        { name: 'Sklep', path: '/sklep' },
        { name: 'Diagnoza online', path: '/kontakt' },
      ]
    },
    {
      title: 'Zasoby',
      links: [
        { name: 'Blog', path: '/blog' },
        { name: 'Lab', path: '/lab' },
        { name: 'Projekty', path: '/projekty' },
      ]
    },
    {
      title: 'Prawne',
      links: [
        { name: 'Polityka prywatności', path: '/polityka-prywatnosci' },
        { name: 'Regulamin', path: '/regulamin' },
      ]
    }
  ];

  const contactInfo = [
    { icon: Mail, text: 'kontakt@byteclinic.pl', href: 'mailto:kontakt@byteclinic.pl' },
    { icon: Phone, text: '+48 724 316 523', href: 'tel:+48724316523' },
    { icon: MapPin, text: 'Zgorzelec', href: null },
  ];

  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Youtube, href: '#', label: 'YouTube' },
    { icon: Github, href: '#', label: 'GitHub' },
  ];

  return (
    <footer className="terminal-footer" id="stopka-byteclinic" aria-label="Stopka ByteClinic">
      {/* Wave separator */}
      <div className="tf-wave" aria-hidden="true">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" focusable="false">
          <path d="M0,72 C240,24 480,24 720,72 C960,120 1200,120 1440,72 L1440,120 L0,120 Z"></path>
        </svg>
      </div>

      {/* Particles canvas */}
      <canvas ref={canvasRef} className="tf-particles" aria-hidden="true" />

      <div className="tf-container">
        {/* Main content grid */}
        <div className="tf-grid">
          {/* Column 1: Brand */}
          <div className="tf-brand-col">
            <Link to="/" className="tf-logo-link">
              <img src="/logo.png" alt="ByteClinic" className="tf-logo" />
            </Link>
            <div className="tf-terminal-box">
              <div className="tf-terminal-header">
                <Terminal className="tf-terminal-icon" />
                <span className="tf-terminal-title">byteclinic@root:~$</span>
              </div>
              <p className="tf-tagline">
                <span className="tf-prompt">&gt;</span> Serwis, który ogarnia temat.
                <span className={`tf-cursor ${cursorVisible ? 'visible' : ''}`}>_</span>
              </p>
            </div>
            
            {/* Social links */}
            <div className="tf-social">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="tf-social-btn"
                >
                  <social.icon />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Navigation */}
          <div className="tf-nav-col">
            {navSections.map((section, index) => (
              <div key={index} className="tf-nav-section">
                <h3 className="tf-nav-title">{section.title}</h3>
                <ul className="tf-nav-list">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <Link to={link.path} className="tf-nav-link">
                        <ChevronRight className="tf-nav-arrow" />
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Column 3: Contact */}
          <div className="tf-contact-col">
            <h3 className="tf-contact-title">Kontakt</h3>
            <ul className="tf-contact-list">
              {contactInfo.map((item, index) => (
                <li key={index} className="tf-contact-item">
                  <item.icon className="tf-contact-icon" />
                  {item.href ? (
                    <a href={item.href} className="tf-contact-link">{item.text}</a>
                  ) : (
                    <span className="tf-contact-text">{item.text}</span>
                  )}
                </li>
              ))}
            </ul>
            
            {/* Quick CTA */}
            <Link to="/kontakt" className="tf-cta-btn">
              Szybkie zgłoszenie
            </Link>
          </div>
        </div>

        {/* Accent bar */}
        <div className="tf-accent-bar" aria-hidden="true"></div>

        {/* Bottom row */}
        <div className="tf-bottom">
          <p className="tf-copyright">
            © {new Date().getFullYear()} ByteClinic. Wszystkie prawa zastrzeżone.
          </p>
          <div className="tf-legal-links">
            <Link to="/polityka-prywatnosci">Prywatność</Link>
            <span className="tf-separator">|</span>
            <Link to="/regulamin">Regulamin</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;