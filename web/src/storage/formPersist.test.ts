import { afterEach, describe, expect, it } from "vitest";
import { applyFields, captureForm } from "./formPersist";

describe("captureForm", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("captures text, select, and textarea", () => {
    document.body.innerHTML = `
      <form>
        <input name="a" value="1" />
        <select name="b"><option value="x">x</option><option value="y" selected>y</option></select>
        <textarea name="c">hi</textarea>
      </form>`;
    const form = document.querySelector("form") as HTMLFormElement;
    expect(captureForm(form)).toEqual({ a: "1", b: "y", c: "hi" });
  });

  it("captures inputs inside a closed details element", () => {
    document.body.innerHTML = `
      <form>
        <details>
          <summary>more</summary>
          <input name="hub_erd_mm" value="599" />
        </details>
        <input name="outer" value="o" />
      </form>`;
    const details = document.querySelector("details") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    const form = document.querySelector("form") as HTMLFormElement;
    expect(captureForm(form)).toEqual({ hub_erd_mm: "599", outer: "o" });
  });

  it("skips disabled and non-submitting button types", () => {
    document.body.innerHTML = `
      <form>
        <input name="on" value="1" />
        <input name="off" value="2" disabled />
        <input type="button" name="btn" value="go" />
        <input type="submit" name="sub" value="ok" />
        <input type="file" name="f" />
      </form>`;
    const form = document.querySelector("form") as HTMLFormElement;
    expect(captureForm(form)).toEqual({ on: "1" });
  });

  it("handles radio (checked only) and checkbox", () => {
    document.body.innerHTML = `
      <form>
        <input type="radio" name="ref" value="left" checked />
        <input type="radio" name="ref" value="right" />
        <input type="checkbox" name="agree" value="yes" checked />
        <input type="checkbox" name="skip" />
      </form>`;
    const form = document.querySelector("form") as HTMLFormElement;
    expect(captureForm(form)).toEqual({
      ref: "left",
      agree: "yes",
      skip: "",
    });
  });

  it("checkbox without value uses on when checked", () => {
    document.body.innerHTML = `
      <form>
        <input type="checkbox" name="x" checked />
      </form>`;
    const form = document.querySelector("form") as HTMLFormElement;
    expect(captureForm(form).x).toBe("on");
  });
});

describe("applyFields", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("round-trips text and restores radio/checkbox", () => {
    document.body.innerHTML = `
      <form>
        <input name="t" />
        <input type="radio" name="ref" value="L" />
        <input type="radio" name="ref" value="R" />
        <input type="checkbox" name="c" />
      </form>`;
    const form = document.querySelector("form") as HTMLFormElement;
    applyFields(form, { t: "hello", ref: "R", c: "on" });
    expect((form.elements.namedItem("t") as HTMLInputElement).value).toBe(
      "hello",
    );
    const radios = form.querySelectorAll<HTMLInputElement>('input[name="ref"]');
    expect(radios[0].checked).toBe(false);
    expect(radios[1].checked).toBe(true);
    expect((form.elements.namedItem("c") as HTMLInputElement).checked).toBe(
      true,
    );

    const back = captureForm(form);
    expect(back.t).toBe("hello");
    expect(back.ref).toBe("R");
    expect(back.c).toBe("on");
  });

  it("applies into inputs inside closed details", () => {
    document.body.innerHTML = `
      <form>
        <details><summary>x</summary><input name="inside" /></details>
      </form>`;
    const form = document.querySelector("form") as HTMLFormElement;
    applyFields(form, { inside: "ok" });
    expect(
      (form.querySelector('[name="inside"]') as HTMLInputElement).value,
    ).toBe("ok");
  });
});
