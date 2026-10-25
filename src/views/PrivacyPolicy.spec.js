import { describe, it, expect } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import PrivacyPolicy from "@/views/PrivacyPolicy.vue";

const mountPage = () =>
  mount(PrivacyPolicy, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });

describe("PrivacyPolicy.vue", () => {
  it("exposes the expected component name", () => {
    expect(PrivacyPolicy.name).toBe("PrivacyPolicyPage");
  });

  it("renders the page header and last-updated date", () => {
    const wrapper = mountPage();

    expect(wrapper.find("h1.display-5").text()).toBe("Privacy Policy");
    expect(wrapper.find(".page-header p.lead").text()).toBe(
      "Last Updated: October 2025"
    );
  });

  it("renders all numbered section titles in order", () => {
    const wrapper = mountPage();

    const titles = wrapper.findAll("h2.section-title").map((h) => h.text());
    expect(titles).toEqual([
      "1. Scope and Application",
      "2. Information We Collect",
      "3. How We Use Your Information",
      "4. Data Protection and Security",
      "5. Sharing and Disclosure of Information",
      "6. Your Data Rights",
      "7. Contact Us",
    ]);
  });

  it("renders the information-collection subsection headings", () => {
    const wrapper = mountPage();

    const subheadings = wrapper.findAll("h3.h5").map((h) => h.text());
    expect(subheadings).toEqual([
      "A. Information You Provide Directly",
      "B. Information Collected Automatically (App Usage Data)",
    ]);
  });

  it("renders the contact email link", () => {
    const wrapper = mountPage();

    const link = wrapper.find("a.contact-link");
    expect(link.attributes("href")).toBe("mailto:info@lauduimbiz.co.za");
    expect(link.text()).toBe("info@lauduimbiz.co.za");
  });

  it("renders the company contact address block", () => {
    const wrapper = mountPage();

    const address = wrapper.find("address");
    expect(address.text()).toContain("SAFAI Pty LTD");
    expect(address.text()).toContain("50 Himalya Street, Lauduim, Zambia");
  });

  it("documents key privacy content points", () => {
    const wrapper = mountPage();
    const text = wrapper.text();

    expect(text).toContain(
      'SAFAI Pty LTD ("SAFAI," "we," "us," or "our")'
    );
    expect(text).toContain("Contact Data:");
    expect(text).toContain("Location Data:");
    expect(text).toContain("Service Operation:");
    expect(text).toContain("Deletion:");
  });
});
