import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { CartContext } from "../context/cartContextValue.js";
import { SiteLayout } from "./SiteLayout.jsx";

vi.mock("../components/common/Icons.jsx", () => ({
  FacebookIcon: () => null,
  InstagramIcon: () => null,
  MenuIcon: () => null,
  ShoppingBagIcon: () => null,
  TikTokIcon: () => null,
  XIcon: () => null,
  YoutubeIcon: () => null,
}));
vi.mock("../components/common/ScrollToTop.jsx", () => ({
  ScrollToTop: () => null,
}));
globalThis.React = React;

function renderHeader(itemCount) {
  return renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(
        CartContext.Provider,
        { value: { getItemCount: () => itemCount } },
        React.createElement(SiteLayout),
      ),
    ),
  );
}

describe("responsive site header", () => {
  it("renders one persistent cart action beside the mobile menu", () => {
    const markup = renderHeader(0);
    expect(markup.match(/class="store-shortcut"/g)).toHaveLength(1);
    expect(markup).toContain('aria-label="Carrinho com 0 itens"');
    expect(markup).toContain('class="header-actions"');
    expect(markup).toContain('aria-label="Abrir menu"');
  });

  it("announces and displays the current shared cart count", () => {
    const markup = renderHeader(3);
    expect(markup).toContain('aria-label="Carrinho com 3 itens"');
    expect(markup).toContain('class="cart-badge"');
    expect(markup).toContain(">3</strong>");
  });

  it("keeps the cart visible in mobile CSS with touch-sized actions", () => {
    const css = readFileSync(
      new URL("../styles/global.css", import.meta.url),
      "utf8",
    );
    expect(css).not.toMatch(/\.store-shortcut\s*\{[^}]*display\s*:\s*none/s);
    expect(css).toMatch(
      /\.store-shortcut\s*\{[^}]*min-width\s*:\s*44px[^}]*min-height\s*:\s*44px/s,
    );
    expect(css).toMatch(
      /\.menu-toggle\s*\{[^}]*width\s*:\s*44px[^}]*height\s*:\s*44px/s,
    );
  });
});
