import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import Footer from "@/components/Footer.vue";

function mountFooter() {
  return mount(Footer, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe("Footer", () => {
  let alertSpy;
  let logSpy;

  beforeEach(() => {
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the footer brand, social links and copyright with the current year", () => {
    const wrapper = mountFooter();
    expect(wrapper.find("footer.app-footer").exists()).toBe(true);
    // Logo image rendered
    const logo = wrapper.find('img[alt="Laudium POST"]');
    expect(logo.exists()).toBe(true);
    expect(logo.attributes("src")).toBe("/logo/laudium-logo-light.svg");
    // External social links
    expect(wrapper.find('a[href="https://x.com/vukaagroup"]').exists()).toBe(
      true
    );
    expect(
      wrapper
        .find(
          'a[href="https://www.youtube.com/channel/UC0Om9sgYVeTUmn8ZErnJt6w"]'
        )
        .exists()
    ).toBe(true);
    // Copyright reflects the current year
    const year = new Date().getFullYear();
    expect(wrapper.text()).toContain(
      `© ${year} Laudium POST Community News`
    );
  });

  it("initialises data with empty newsletter email and the current year", () => {
    const wrapper = mountFooter();
    expect(wrapper.vm.newsletterEmail).toBe("");
    expect(wrapper.vm.currentYear).toBe(new Date().getFullYear());
  });

  it("renders the expected router-link navigation targets", () => {
    const wrapper = mountFooter();
    const targets = wrapper
      .findAllComponents(RouterLinkStub)
      .map((l) => l.props("to"));
    expect(targets).toEqual([
      "/",
      "/news",
      "/podcasts",
      "/community",
      "/announcements",
      "/about",
      "/editorial-policy",
      "/corrections",
      "/terms-of-use",
      "/privacy-policy",
    ]);
  });

  it("validates correct and incorrect email formats", () => {
    const wrapper = mountFooter();
    expect(wrapper.vm.isValidEmail("user@example.com")).toBe(true);
    expect(wrapper.vm.isValidEmail("not-an-email")).toBe(false);
    expect(wrapper.vm.isValidEmail("missing@domain")).toBe(false);
    expect(wrapper.vm.isValidEmail("with space@example.com")).toBe(false);
  });

  it("subscribes successfully when a valid email is present (true && true branch)", () => {
    const wrapper = mountFooter();
    wrapper.vm.newsletterEmail = "valid@example.com";
    wrapper.vm.subscribeNewsletter();
    expect(logSpy).toHaveBeenCalledWith(
      "Subscribing email:",
      "valid@example.com"
    );
    expect(alertSpy).toHaveBeenCalledWith(
      "Thank you for subscribing to our newsletter!"
    );
    // Form is reset after success
    expect(wrapper.vm.newsletterEmail).toBe("");
  });

  it("rejects when the email is present but invalid (true && false branch)", () => {
    const wrapper = mountFooter();
    wrapper.vm.newsletterEmail = "invalid-email";
    wrapper.vm.subscribeNewsletter();
    expect(alertSpy).toHaveBeenCalledWith(
      "Please enter a valid email address."
    );
    expect(logSpy).not.toHaveBeenCalled();
    // Email is left untouched on failure
    expect(wrapper.vm.newsletterEmail).toBe("invalid-email");
  });

  it("rejects when the email is empty (short-circuit false branch)", () => {
    const wrapper = mountFooter();
    wrapper.vm.newsletterEmail = "";
    wrapper.vm.subscribeNewsletter();
    expect(alertSpy).toHaveBeenCalledWith(
      "Please enter a valid email address."
    );
    expect(logSpy).not.toHaveBeenCalled();
  });
});
