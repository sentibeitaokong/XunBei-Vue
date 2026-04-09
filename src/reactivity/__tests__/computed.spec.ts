import { computed } from "../computed";
import { reactive } from "../reactive";
import {vi,describe,it,expect} from 'vitest'

describe("computed", () => {
    //computed 缓存机制 当.value改变时才触发computed里面的方法
  it("happy path", () => {
    const user = reactive({
      age: 1,
    });

    const age = computed(() => {
      return user.age;
    });

    expect(age.value).toBe(1);
  });

  it("should compute lazily", () => {
    const value = reactive({
      foo: 1,
    });
    const getter = vi.fn(() => {
      return value.foo;
    });
    const cValue = computed(getter);

    // lazy
    expect(getter).not.toHaveBeenCalled();

    expect(cValue.value).toBe(1);
    expect(getter).toHaveBeenCalledTimes(1);

    // should not compute again
    cValue.value; // get
    expect(getter).toHaveBeenCalledTimes(1);

    // should not compute until needed
    value.foo = 2;   //触发trigger->需要收集依赖track->get 重新执行
    expect(getter).toHaveBeenCalledTimes(1);

    // now it should compute
    expect(cValue.value).toBe(2);
    expect(getter).toHaveBeenCalledTimes(2);

    // should not compute again
    cValue.value;
    expect(getter).toHaveBeenCalledTimes(2);
  });
});
