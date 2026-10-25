import { describe, it, expect } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import EditorialPolicy from "@/views/EditorialPolicy.vue";

const mountPage = () =>
  mount(EditorialPolicy, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });

describe("EditorialPolicy.vue", () => {
  it("exposes the expected component name", () => {
    expect(EditorialPolicy.name).toBe("EditorialPolicyPage");
  });

  it("renders the page header and effective date", () => {
    const wrapper = mountPage();

    expect(wrapper.find("h1.display-5").text()).toBe(
      "Updated Laudium Post Editorial Policy"
    );
    expect(wrapper.find("header p.text-muted").text()).toBe(
      "Effective date: 30 October 2025 · Last reviewed: 30 October 2025"
    );
  });

  it("renders all section headings in order", () => {
    const wrapper = mountPage();

    const headings = wrapper.findAll("h2.h4").map((h) => h.text());
    expect(headings).toEqual([
      "Mission and Scope",
      "Core Principles",
      "Sourcing and Verification",
      "Use of AI and Automation",
      "Attribution and Plagiarism",
      "Conflicts of Interest and Gifts",
      "Sponsored, Branded, and Advertising Content",
      "Right of Reply",
      "Corrections, Clarifications, and Updates",
      "Safety, Sensitivity, and Harm Minimization",
      "Photos, Video, and Audio Standards",
      "Editorial Oversight and Roles",
      "Diversity, Inclusion, and Bias Mitigation",
      "Community and User‑Generated Content",
      "Data, Privacy, and Security",
      "Publication Metadata and Transparency",
      "Contact",
      "Versioning",
    ]);
  });

  it("renders the mailto links for editorial and general inquiries", () => {
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

  it("renders router-links to the corrections and privacy policies", () => {
    const wrapper = mountPage();

    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(links).toHaveLength(2);

    expect(links[0].props("to")).toBe("/corrections");
    expect(links[0].text()).toBe("Corrections Policy");

    expect(links[1].props("to")).toBe("/privacy-policy");
    expect(links[1].text()).toBe("Privacy Policy");
  });

  it("documents the core editorial standards and versioning content", () => {
    const wrapper = mountPage();

    expect(wrapper.text()).toContain(
      "Laudium Post is a community news and information service"
    );
    expect(wrapper.text()).toContain("Truth and accuracy:");
    expect(wrapper.text()).toContain("AI‑assisted verification:");
    expect(wrapper.text()).toContain("Right of Reply");
    expect(wrapper.text()).toContain("Note: Role titles may vary");
    expect(wrapper.text()).toContain("v1.1 (30 Oct 2025)");
    expect(wrapper.text()).toContain("v1.0 (27 Oct 2025)");
  });
});
