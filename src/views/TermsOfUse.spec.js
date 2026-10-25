import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import TermsOfUse from "@/views/TermsOfUse.vue";

const mountPage = () =>
  mount(TermsOfUse, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });

describe("TermsOfUse.vue", () => {
  beforeEach(() => {
    // Remove any meta description left over from a prior test so each test
    // controls the `if (metaDescription)` branch explicitly.
    document
      .querySelectorAll('meta[name="description"]')
      .forEach((el) => el.remove());
    document.title = "";
  });

  afterEach(() => {
    document
      .querySelectorAll('meta[name="description"]')
      .forEach((el) => el.remove());
  });

  it("exposes the expected component name", () => {
    expect(TermsOfUse.name).toBe("TermsOfUsePage");
  });

  it("renders the page header and effective date", () => {
    const wrapper = mountPage();

    expect(wrapper.find("h1.display-4").text()).toBe(
      "Terms of Use & Content Usage Policy"
    );
    expect(wrapper.find(".page-header p.lead").text()).toBe(
      "Please read these terms carefully before using our website"
    );
    expect(wrapper.find(".mb-4 h5").text()).toContain("Effective Date:");
    expect(wrapper.find(".mb-4 h5").text()).toContain("01-06-2025");
  });

  it("renders all numbered section titles in order", () => {
    const wrapper = mountPage();

    const titles = wrapper.findAll("h2.section-title").map((h) => h.text());
    expect(titles).toEqual([
      "1. Acceptance of Terms",
      "2. Intellectual Property",
      "3. Trademarks",
      "4. Disclaimer",
      "5. Third-Party Links",
      "6. Changes to These Terms",
      "7. Contact Us",
    ]);
  });

  it("renders the 'You may' / 'You may not' permission lists", () => {
    const wrapper = mountPage();
    const text = wrapper.text();

    expect(text).toContain("You may:");
    expect(text).toContain("You may not:");
    expect(text).toContain("Share links to our content with proper attribution");
    expect(text).toContain("Repost full articles or media without permission");
  });

  it("renders the permission email link and the contact-link email", () => {
    const wrapper = mountPage();

    const links = wrapper.findAll('a[href="mailto:info@lauduimbiz.co.za"]');
    expect(links.length).toBe(2);
    links.forEach((link) => {
      expect(link.text()).toBe("info@lauduimbiz.co.za");
    });

    const contactLink = wrapper.find("a.contact-link");
    expect(contactLink.attributes("href")).toBe("mailto:info@lauduimbiz.co.za");
  });

  it("documents key terms content points", () => {
    const wrapper = mountPage();
    const text = wrapper.text();

    expect(text).toContain(
      "By accessing and using this website, you agree to be bound by"
    );
    expect(text).toContain("Laudium POST Community News");
    expect(text).toContain(
      "The content on Laudium POST is for informational purposes"
    );
  });

  it("sets the document title on mount", () => {
    mountPage();

    expect(document.title).toBe(
      "Terms of Use - Laudium Post Community News"
    );
  });

  it("updates the meta description when the meta tag exists (truthy branch)", () => {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute("content", "original");
    document.head.appendChild(meta);

    mountPage();

    expect(
      document
        .querySelector('meta[name="description"]')
        .getAttribute("content")
    ).toBe(
      "Terms of Use and Content Usage Policy for Laudium Post Community News website."
    );
  });

  it("does not create a meta description when the tag is absent (falsy branch)", () => {
    expect(document.querySelector('meta[name="description"]')).toBeNull();

    mountPage();

    // The component must not add a meta tag; the falsy branch is a no-op.
    expect(document.querySelector('meta[name="description"]')).toBeNull();
    expect(document.title).toBe(
      "Terms of Use - Laudium Post Community News"
    );
  });
});
