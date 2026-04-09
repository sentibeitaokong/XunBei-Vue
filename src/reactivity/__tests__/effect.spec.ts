import {describe, expect, it,vi} from "vitest";
import {reactive} from "../reactive.ts";
import {effect,stop} from "../effect.ts";

describe("Effect", () => {
    it('happy path ', () => {
        const user=reactive({
            age:10
        })
        let nextAge;
        // 添加依赖
        effect(()=>{
            nextAge = user.age+1;
        })
        expect(nextAge).toBe(11)
        //update
        user.age++
        expect(nextAge).toBe(12)
    });
    it("should return runner when call effect",()=>{
        //1.effec(fn)->function(runner)->fn->return
        let foo=10
        const runner=effect(():string=>{
            foo++;
            return 'foo'
        })
        expect(foo).toBe(11)
        const currentFn=runner()
        expect(foo).toBe(12)
        expect(currentFn).toBe('foo')
    })
    it("scheduler", () => {
        //1.通过effect的第二个参数给定一个scheduler的fn
        //2.effect第一次执行的时候还会执行fn
        //3.当响应式对象set update不会执行fn而是执行scheduler
        //4.如果说当执行runner的时候，会再次执行fn
        let dummy;
        let run: any;
        const scheduler = vi.fn(() => {
            run = runner;
        });
        const obj = reactive({ foo: 1 });
        const runner = effect(
            () => {
                dummy = obj.foo;
            },
            { scheduler }
        );
        expect(scheduler).not.toHaveBeenCalled();
        expect(dummy).toBe(1);
        // should be called on first trigger
        obj.foo++;
        expect(scheduler).toHaveBeenCalledTimes(1);
        // // should not run yet
        expect(dummy).toBe(1);
        // // manually run
        run();
        // // should have run
        expect(dummy).toBe(2);
    });

    it("stop", () => {
        let dummy;
        const obj = reactive({ prop: 1 });
        const runner = effect(() => {
            dummy = obj.prop;
        });
        obj.prop = 2;
        expect(dummy).toBe(2);
        stop(runner);
        //触发set
        // obj.prop = 3;
        //相当于obj.prop=obj.prop+1  触发get和set操作
        obj.prop++;
        expect(dummy).toBe(2);

        // stopped effect should still be manually callable
        runner();
        expect(dummy).toBe(3);
    });
    it("onStop", () => {
        let dummy;
        const obj = reactive({
            foo: 1,
        });
        const onStop = vi.fn();
        const runner = effect(
            () => {
                dummy = obj.foo;
            },
            {
                onStop,
            }
        );

        stop(runner);
        expect(onStop).toBeCalledTimes(1);
    });
})