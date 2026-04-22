import { generate } from "../src/codegen";
import { baseParse } from "../src/parse";
import { transform } from "../src/transform";
import {describe,it,expect} from "vitest";
import {transformExpression} from "../src/transforms/transformExpression.ts";
import {transformElement} from "../src/transforms/transformElement.ts";
import {transformText} from "../src/transforms/transformText.ts";

describe("codegen", () => {
    //string测试
  it("string", () => {
    const ast = baseParse("hi 1");
    transform(ast);
    const { code } = generate(ast);
    //快照测试  1.比对生成的图片是否一致
    expect(code).toMatchSnapshot();
  });
  //插值测试
  it("interpolation", () => {
    const ast = baseParse("{{message}}");
    transform(ast, {
      nodeTransforms: [transformExpression],
    });
    const { code } = generate(ast);
    expect(code).toMatchSnapshot();
  });

  it("element", () => {
    const ast: any = baseParse("<div>hi,{{message}}</div>");
    transform(ast, {
      nodeTransforms: [transformExpression,transformElement,transformText],
    });
    const { code } = generate(ast);
    expect(code).toMatchSnapshot();
  });
});
