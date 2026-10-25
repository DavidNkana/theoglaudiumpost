import { describe, it, expect } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import CorrectionsPolicy from "@/views/CorrectionsPolicy.vue";

const mountPage = () =>
  mount(CorrectionsPolicy, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });

describe("CorrectionsPolicy.vue", () => {
  it("exposes the expected component name", () => {
    expect(CorrectionsPolicy.name).toBe("CorrectionsPolicyPage");
  });

  it("renders the page header and effective date", () => {
    const wrapper = mountPage();

    expect(wrapper.find("h1.display-5").text()).toBe("Corrections Policy");
    expect(wrapper.find("header p.text-muted").text()).toBe(
      "Effective date: 30 October 2025 · Last reviewed: 30 October 2025"
    );
  });

  it("renders all section headings in order", () => {
    const wrapper = mountPage();

    const headings = wrapper.findAll("h2.h4").map((h) => h.text());
    expect(headings).toEqual([
      "Purpose and Scope",
      "How to Request a Correction",
      "Our Review Process",
      "Outcomes and Definitions",
      "Transparency and Change Logs",
      "Appeals",
      "Legal and Safety Considerations",
      "Contact",
      "Versioning",
    ]);
  });

  it("renders the mailto links for correction and general inquiries", () => {
    const wrapper = mountPage();

    const mailtos = wrapper
      .findAll('a[href^="mailto:"]')
      .map((a) => a.attributes("href"));
    expect(mailtos).toEqual([
      "mailto:editorial@laudiumbiz.co.za",
      "mailto:editorial@laudiumbiz.co.za",
      "mailto:info@lauduimbiz.co.za",
    ]);

    expect(wrapper.text()).toContain("Laudium, Pretoria, Gauteng, South Africa");
  });

  it("renders a router-link to the editorial policy", () => {
    const wrapper = mountPage();

    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(links).toHaveLength(1);
    expect(links[0].props("to")).toBe("/editorial-policy");
    expect(links[0].text()).toBe("Editorial Policy");
  });

  it("documents the correction request and review content", () => {
    const wrapper = mountPage();

    expect(wrapper.text()).toContain("“Correction Request”");
    expect(wrapper.text()).toContain("Article title and URL");
    expect(wrapper.text()).toContain("Retraction:");
    expect(wrapper.text()).toContain("v1.1 (30 Oct 2025)");
    expect(wrapper.text()).toContain("v1.0 (27 Oct 2025)");
  });
});
