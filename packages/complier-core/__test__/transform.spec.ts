import { NodeTypes } from "../src/ast";
import { baseParse } from "../src/parse";
import { transform } from "../src/transform";
import {describe,expect,it} from "vitest";

describe("transform", () => {
  it("happy path", () => {
    const ast = baseParse("<div>hi,{{message}}</div>");

    const plugin = (node:any) => {
      if (node.type === NodeTypes.TEXT) {
        node.content = node.content + " XunBei-vue";
      }
    };
    //添加nodeTransforms转换方法属性
    transform(ast, {
      nodeTransforms: [plugin],
    });

    const nodeText = ast.children[0].children[0];
    expect(nodeText.content).toBe("hi, XunBei-vue");
  });
});
