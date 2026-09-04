"use client";

import Link from "next/link";
import Image from "next/image";
import { MouseEvent, useEffect, useState } from "react";
import { ArrowUpRight, Menu, Moon, Sun, X } from "lucide-react";
import { useSmoothScroll } from "./SmoothScroll";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const scrollTo = useSmoothScroll();

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 32);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("quire:theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(savedTheme === "dark" || (savedTheme !== "light" && prefersDark) ? "dark" : "light");
  }, []);

  const handleSectionLink = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const selector = event.currentTarget.getAttribute("href");
    if (!selector?.startsWith("#")) return;

    event.preventDefault();
    scrollTo(selector);
    window.history.pushState(null, "", selector);
    setMobileMenuOpen(false);
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("quire:theme", nextTheme);
    setTheme(nextTheme);
  };

  const useLightWordmark = !scrolled || theme === "dark";

  return (
    <header className={`mk-nav ${scrolled ? "mk-nav--scrolled" : ""} ${mobileMenuOpen ? "mk-nav--menu-open" : ""}`}>
      <div className="mk-nav__inner">
        <Link href="/" className="mk-nav__brand" aria-label="Quire home">
          <Image src={useLightWordmark ? "/brand/quire-wordmark-light.png" : "/brand/quire-wordmark-dark.png"} alt="Quire" width={1280} height={631} priority />
        </Link>
        <nav className="mk-nav__links" aria-label="Primary navigation">
          <Link href="#product" onClick={handleSectionLink}>Product</Link>
          <Link href="#features" onClick={handleSectionLink}>Features</Link>
          <Link href="#open-source" onClick={handleSectionLink}>Open Source</Link>
          <Link href="#pricing" onClick={handleSectionLink}>Pricing</Link>
          <Link href="#faq" onClick={handleSectionLink}>Docs</Link>
        </nav>
        <div className="mk-nav__actions">
          <a className="mk-nav__github" href="https://github.com/quire/quire" target="_blank" rel="noreferrer">GitHub</a>
          <button
            type="button"
            className="mk-theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} appearance`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} appearance`}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <Link href="/app" className={`mk-button mk-nav__cta ${scrolled && theme !== "dark" ? "mk-button--dark" : "mk-button--light"}`}>Open Quire</Link>
          <button
            type="button"
            className="mk-nav__menu-toggle"
            onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
          >
            <span className="mk-nav__menu-icon mk-nav__menu-icon--menu"><Menu size={20} /></span>
            <span className="mk-nav__menu-icon mk-nav__menu-icon--close"><X size={19} /></span>
          </button>
        </div>
      </div>
      <nav className={`mk-nav__mobile-menu ${mobileMenuOpen ? "is-open" : ""}`} aria-label="Mobile navigation" aria-hidden={!mobileMenuOpen}>
        <p className="mk-nav__mobile-kicker">Explore Quire</p>
        <div className="mk-nav__mobile-links">
          <Link href="#product" onClick={handleSectionLink}><span>01</span>Product</Link>
          <Link href="#features" onClick={handleSectionLink}><span>02</span>Features</Link>
          <Link href="#open-source" onClick={handleSectionLink}><span>03</span>Open Source</Link>
          <Link href="#pricing" onClick={handleSectionLink}><span>04</span>Pricing</Link>
          <Link href="#faq" onClick={handleSectionLink}><span>05</span>Docs</Link>
        </div>
        <div className="mk-nav__mobile-footer">
          <a href="https://github.com/quire/quire" target="_blank" rel="noreferrer" onClick={() => setMobileMenuOpen(false)}>GitHub <ArrowUpRight size={15} /></a>
          <Link href="/app" className="mk-button mk-button--red" onClick={() => setMobileMenuOpen(false)}>Open Quire <ArrowUpRight size={16} /></Link>
        </div>
      </nav>
    </header>
  );
}
