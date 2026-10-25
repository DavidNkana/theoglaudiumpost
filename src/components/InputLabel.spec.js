import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import InputLabel from "@/components/InputLabel.vue";

describe("InputLabel.vue", () => {
  it("renders the value text", () => {
    const wrapper = mount(InputLabel, {
      props: { value: "Email" },
    });
    expect(wrapper.find("label.form-label").exists()).toBe(true);
    expect(wrapper.text()).toContain("Email");
  });

  it("does not render the required asterisk when isRequired is false (default)", () => {
    const wrapper = mount(InputLabel, {
      props: { value: "Name" },
    });
    expect(wrapper.find("span.text-danger").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("*");
  });

  it("renders the required asterisk when isRequired is true", () => {
    const wrapper = mount(InputLabel, {
      props: { value: "Password", isRequired: true },
    });
    const star = wrapper.find("span.text-danger");
    expect(star.exists()).toBe(true);
    expect(star.text()).toBe("*");
    expect(wrapper.text()).toContain("Password");
  });
});
