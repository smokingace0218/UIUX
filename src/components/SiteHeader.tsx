import { useEffect, useState } from "react";

import { FlowLogo } from "./FlowLogo";

export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Download", href: "#download" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);

  return (
    <header className="flow-nav">
      <a className="flow-nav__brand" href="/" aria-label="Flow home">
        <FlowLogo />
      </a>
      <nav className="flow-nav__links" aria-label="Primary">
        {NAV_LINKS.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
      </nav>
      <div className="flow-nav__actions">
        <a className="flow-nav__signin" href="#sign-in">Sign in</a>
        <a className="flow-button flow-button--small" href="#get-started">Get Started</a>
        <button
          className="flow-nav__menu"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="flow-mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </div>
      <nav id="flow-mobile-menu" className="flow-nav__sheet" data-open={menuOpen} aria-label="Primary mobile">
        {NAV_LINKS.map((link) => (
          <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>{link.label}</a>
        ))}
        <a href="#sign-in" onClick={() => setMenuOpen(false)}>Sign in</a>
        <a className="flow-button" href="#get-started" onClick={() => setMenuOpen(false)}>Get Started</a>
      </nav>
    </header>
  );
}
