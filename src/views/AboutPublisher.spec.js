import { describe, it, expect } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import AboutPublisher from "@/views/AboutPublisher.vue";

const mountAbout = () =>
  mount(AboutPublisher, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });

describe("AboutPublisher.vue", () => {
  it("exposes the expected component name", () => {
    expect(AboutPublisher.name).toBe("AboutPublisherPage");
  });

  it("renders the page header and intro copy", () => {
    const wrapper = mountAbout();

    expect(wrapper.find("h1.display-5").text()).toBe("About Laudium Post");
    expect(wrapper.find("header p.text-muted").text()).toBe(
      "Ownership, contact details, and editorial responsibilities"
    );
    expect(wrapper.text()).toContain("Laudium Post Community News is a local news");
  });

  it("renders all section headings", () => {
    const wrapper = mountAbout();

    const headings = wrapper.findAll("h2.h4").map((h) => h.text());
    expect(headings).toEqual([
      "Ownership",
      "Publisher and Editorial Contact",
      "Corrections and Feedback",
      "Privacy",
      "AI-Generated Content Disclosure",
    ]);
  });

  it("renders the publisher contact details with mailto links", () => {
    const wrapper = mountAbout();

    const mailtos = wrapper
      .findAll('a[href^="mailto:"]')
      .map((a) => a.attributes("href"));
    expect(mailtos).toEqual([
      "mailto:info@lauduimbiz.co.za",
      "mailto:info@lauduimbiz.co.za",
    ]);

    expect(wrapper.text()).toContain("SAFAI Pty LTD");
    expect(wrapper.text()).toContain("Laudium, Pretoria, Gauteng, South Africa");
  });

  it("renders router-links to the corrections and privacy policies", () => {
    const wrapper = mountAbout();

    const links = wrapper.findAllComponents(RouterLinkStub);
    const targets = links.map((l) => l.props("to"));
    expect(targets).toEqual(["/corrections", "/privacy-policy"]);

    expect(links[0].text()).toBe("Corrections Policy");
    expect(links[1].text()).toBe("Privacy Policy");
  });

  it("discloses AI-assisted content usage", () => {
    const wrapper = mountAbout();

    expect(wrapper.text()).toContain("AI-Generated Content Disclosure");
    expect(wrapper.text()).toContain("ChatGPT and Google Gemini");
  });
});
